/*
 * AI Translate — what gets written down, and what must never be.
 *
 * The log exists to be pasted into a public support report, so a key that
 * reached it would be handed out with it. This builds the real core and checks
 * both halves: that a failure is recorded legibly, and that nothing secret
 * survives the trip. It also pins the one failure nobody could report, a
 * notice with no text in it.
 *
 * Run it from the plugin folder:  node test/log.mjs
 * It needs esbuild, exactly as test/prompts.mjs does.
 */

import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const WHERE = [process.env.ESBUILD, "esbuild", `${process.env.HOME}/tools/node_modules/esbuild`]
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

const here = new URL(".", import.meta.url).pathname;
const plugin = join(here, "..");
const out = await mkdtemp(join(tmpdir(), "ai-translate-log-"));

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./core/host";\nexport { notify } from "./core/translate";\n`
            + `export { record, asText, clear, howMany } from "./core/log";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: join(out, "core.mjs"),
    logLevel: "error"
});

const { useHost, notify, record, asText, clear, howMany } = await import(join(out, "core.mjs"));

/** Every toast the plugin shows, so one with nothing in it cannot hide. */
const shown = [];

useHost({
    config: () => ({ locale: "en" }),
    set: () => { },
    recent: () => [],
    meId: () => undefined,
    notice: (text, kind) => shown.push({ text, kind })
});

let pass = 0, fail = 0;

function check(name, ok) {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name);
}

// --- nothing secret leaves the plugin in a log ---

clear();
record("error", "sent", "groq answered 401", '{"error":{"message":"Invalid API Key: gsk_abcdefghijklmnop1234"}}');
check("a key quoted back by the provider is masked", !asText().includes("gsk_abcdefghijklmnop1234"));
check("and the rest of what it said is kept", asText().includes("Invalid API Key"));
check("the line says when, how bad, and what was going on", /ERROR\s+sent\s+groq answered 401/.test(asText()));

clear();
record("info", "received", "ok", "sk-ant-THISLOOKSLIKEAKEY123 and AIzaSyAbCdEfGhIjKlMnOpQ");
check("Anthropic's key shape is masked", !asText().includes("sk-ant-THISLOOKSLIKEAKEY123"));
check("and Google's", !asText().includes("AIzaSyAbCdEfGhIjKlMnOpQ"));

clear();
record("info", "explain", "ok", '{"api_key": "supersecretvalue", "model": "m"}');
check("a key named as one in JSON is masked", !asText().includes("supersecretvalue"));
check("without taking the rest of the JSON with it", asText().includes("model"));

// --- the log stays small and can be emptied ---

clear();
for (let i = 0; i < 260; i++) record("info", "sent", `line ${i}`);
check("only the last 200 lines are kept", howMany() === 200);
check("and they are the newest ones", asText().includes("line 259") && !asText().includes("line 50 "));

clear();
check("clearing empties it", howMany() === 0 && asText() === "");

// --- the failure nobody could report ---

shown.length = 0;
clear();
notify(new Error(""), "failure");
check("an error with no message still shows something", shown[0].text.trim().length > 0);
check("and it is marked as a failure", shown[0].kind === "failure");
check("and it was written down too", asText().includes("notice"));

shown.length = 0;
notify(new Error("AI Translate: groq rejected the API key"), "failure");
check("an error that has a message shows it unchanged", shown[0].text === "AI Translate: groq rejected the API key");

shown.length = 0;
notify(undefined, "failure");
check("and neither does a thrown nothing show an empty toast", shown[0].text.trim().length > 0);

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
