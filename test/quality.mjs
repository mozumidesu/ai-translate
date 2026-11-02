/*
 * AI Translate — does a rule actually work?
 *
 * test/prompts.mjs pins the wording a rule is sent with. Nothing said whether
 * the rule then does its job, so every defect was fixed by hand and could come
 * back on the next model without a check going red. This runs the real core
 * against a real provider on test/corpus/cases.json, several times each
 * because models are not deterministic, and prints how many runs each case
 * survived.
 *
 * It costs tokens, so it is never part of the robot. Run it by hand:
 *
 *   node test/quality.mjs                  every case, both providers, 3 runs
 *   node test/quality.mjs --provider=groq --runs=5
 *   node test/quality.mjs --case=a-pronoun-keeps-its-part
 *   node test/quality.mjs --pace=30        seconds between requests
 *   node test/quality.mjs --waits=0        do not wait out a refusal
 *
 * Keys come from the environment and never from the repository:
 *   GROQ_API_KEY, or GROQ_API_ADDITIONAL, or GROQ_API_KEY_2
 *   GEMINI_API_KEY
 */

import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = resolve(HERE, "..");

const arg = (name, fallback) => {
    const found = process.argv.find(a => a.startsWith(`--${name}=`));
    return found ? found.slice(name.length + 3) : fallback;
};

const RUNS = Number(arg("runs", 3));
const ONLY = arg("case", "");
const WANTED = arg("provider", "both");
/** How many times one run may be told to wait before it counts as failed. */
const WAITS = Number(arg("waits", 3));

/** What each provider is asked, and with how long a pause between requests. */
const PROVIDERS = {
    groq: {
        key: () => process.env.GROQ_API_KEY || process.env.GROQ_API_ADDITIONAL || process.env.GROQ_API_KEY_2,
        model: arg("model", "openai/gpt-oss-120b"),
        // 8000 tokens a minute on the free tier against ~3500 a request.
        pace: Number(arg("pace", 26))
    },
    gemini: {
        key: () => process.env.GEMINI_API_KEY,
        model: arg("model", "gemini-3.8-flash"),
        pace: Number(arg("pace", 5))
    }
};

const WHERE = [process.env.ESBUILD, "esbuild", `${process.env.TOOLS}/esbuild`, `${process.env.HOME}/tools/node_modules/esbuild`]
    .filter(Boolean)
    .flatMap(where => [where, `${where}/lib/main.js`]);

let esbuild;
for (const candidate of WHERE) {
    try {
        esbuild = await import(candidate);
        break;
    } catch {
        // Try the next one.
    }
}
if (!esbuild) {
    console.error("No esbuild. Install one and point ESBUILD at it.");
    process.exit(2);
}

const out = await mkdtemp(join(tmpdir(), "ai-translate-quality-"));
await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./core/host";\n`
            + `export { aiTranslate, collectContext } from "./core/translate";\n`
            + `export { asText, clear } from "./core/log";\n`,
        resolveDir: PLUGIN,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: join(out, "core.mjs"),
    logLevel: "error"
});

// No GM_xmlhttpRequest here, so core/net.ts reaches for fetch and the requests
// are real. That is the whole point of this file.
const { useHost, aiTranslate, collectContext, asText, clear } = await import(join(out, "core.mjs"));

const cases = JSON.parse(await readFile(join(HERE, "corpus", "cases.json"), "utf-8"));
const chosen = ONLY ? cases.filter(c => c.id === ONLY) : cases;
if (!chosen.length) {
    console.error(ONLY ? `No case called ${ONLY}.` : "The corpus is empty.");
    process.exit(2);
}

let settings = {};
let history = [];
const notices = [];
useHost({
    config: () => settings,
    set: () => { },
    recent: () => history,
    meId: () => "me",
    notice: text => notices.push(text)
});

/** A case's own conversation, in the shape core/host.ts hands over. */
const conversation = kase => (kase.context ?? []).map((line, i) => ({
    id: String(i + 1),
    authorId: line.who === "me" ? "me" : `them-${line.name}`,
    authorName: line.name,
    content: line.text
}));

const sleep = ms => new Promise(done => setTimeout(done, ms));

/** How long a refusal asked for, read back out of the message a person sees. */
function waitAsked(message) {
    const seconds = message.match(/Try again in (\d+) s\b/)?.[1];
    if (seconds) return Number(seconds) * 1000;

    const minutes = message.match(/Try again in (\d+) min\b/)?.[1];
    if (minutes) return Number(minutes) * 60_000;

    // A day's worth of waiting is not waiting, it is tomorrow.
    return 0;
}

/** The settings one case is run under, with everything else left at its default. */
function settingsFor(kase, provider) {
    const { model } = PROVIDERS[provider];

    return {
        provider,
        [`${provider}ApiKey`]: PROVIDERS[provider].key(),
        [`${provider}Model`]: model,
        baseUrl: "",
        sentLanguage: kase.kind === "sent" ? kase.to : "English",
        receivedLanguage: kase.kind === "sent" ? "Russian" : kase.to,
        thinkingLevel: "low",
        mode: "always",
        enabledChannels: "",
        onError: "hold",
        gender: "unset",
        formality: "match",
        glossary: "",
        extraInstructions: "",
        useContext: !!kase.context,
        locale: "en",
        fallbackProvider: "none",
        ...(kase.settings ?? {})
    };
}

/** What went wrong with one answer, or nothing when it is right. */
function faults(kase, text) {
    const said = text.toLowerCase();
    const missing = (kase.must ?? []).filter(p => !said.includes(p.toLowerCase()));
    const present = (kase.mustNot ?? []).filter(p => said.includes(p.toLowerCase()));

    return [
        ...missing.map(p => `missing ${JSON.stringify(p)}`),
        ...present.map(p => `says ${JSON.stringify(p)}`)
    ];
}

const results = [];

for (const provider of Object.keys(PROVIDERS)) {
    if (WANTED !== "both" && WANTED !== provider) continue;
    if (!PROVIDERS[provider].key()) {
        console.log(`\n${provider}: no key in the environment, skipped`);
        continue;
    }

    console.log(`\n=== ${provider}, ${PROVIDERS[provider].model}, ${RUNS} run(s) a case ===\n`);

    for (const kase of chosen) {
        history = conversation(kase);

        // A case the corpus holds but cannot yet judge. Named rather than left
        // out, so it is plain what is not covered.
        if (kase.skip) {
            console.log(`SKIP      ${kase.id}`);
            console.log(`       ! ${kase.skip}`);
            continue;
        }

        settings = settingsFor(kase, provider);

        let passed = 0;
        const said = [];
        const why = new Set();

        for (let run = 0; run < RUNS; run++) {
            if (run || results.length) await sleep(PROVIDERS[provider].pace * 1000);

            let answer;
            // A free tier says how long to wait, so wait that rather than
            // counting its refusal as the plugin getting the answer wrong.
            for (let left = WAITS; ; left--) {
                clear();
                try {
                    answer = (await aiTranslate(kase.kind, kase.text, kase.context ? collectContext("c") : "")).text;
                    break;
                } catch (e) {
                    const asked = waitAsked(e.message);
                    if (asked && left > 0) {
                        console.log(`       … told to wait ${Math.round(asked / 1000)}s, waiting`);
                        await sleep(asked + 2000);
                        continue;
                    }

                    // The message a person would see says little about why; the
                    // log line underneath it carries the status and the answer.
                    const last = asText().split("\n").filter(Boolean).slice(-2).join(" / ");
                    why.add(`threw: ${e.message}`);
                    if (last) why.add(`log: ${last.slice(0, 300)}`);
                    break;
                }
            }

            if (answer === undefined) {
                said.push("(threw)");
                continue;
            }

            const wrong = faults(kase, answer);
            if (!wrong.length) passed++;
            else wrong.forEach(w => why.add(w));
            said.push(answer.replace(/\n/g, " ⏎ "));
        }

        const mark = passed === RUNS ? "PASS" : passed ? "PART" : "FAIL";
        console.log(`${mark} ${passed}/${RUNS}  ${kase.id}`);
        for (const line of said) console.log(`       → ${line}`);
        for (const line of why) console.log(`       ! ${line}`);

        results.push({ provider, id: kase.id, passed, of: RUNS });
    }
}

await rm(out, { recursive: true, force: true });

console.log("\n=== how each case did ===\n");
const whole = results.filter(r => r.passed === r.of).length;
for (const r of results) console.log(`  ${r.passed}/${r.of}  ${r.provider}  ${r.id}`);
console.log(`\n${whole} of ${results.length} came through every run.`);

process.exit(whole === results.length ? 0 : 1);
