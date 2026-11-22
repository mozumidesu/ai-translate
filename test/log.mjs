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
        contents: `export { useHost } from "./core/host";\n`
            + `export { notify, translate } from "./core/translate";\n`
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

const { useHost, notify, translate, record, asText, clear, howMany } = await import(join(out, "core.mjs"));

/** Every toast the plugin shows, so one with nothing in it cannot hide. */
const shown = [];

let settings = { locale: "en" };

useHost({
    config: () => settings,
    set: () => { },
    recent: () => [],
    meId: () => undefined,
    notice: (text, kind) => shown.push({ text, kind })
});

/** A provider that answers like Groq, with a usage block of its own choosing. */
function provider(usage, finish = "stop", content = "[ru] hello") {
    globalThis.GM_xmlhttpRequest = o => {
        setImmediate(() => o.onload({
            status: 200,
            responseText: JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }], usage }),
            responseHeaders: ""
        }));
        return { abort() { } };
    };
}

/** The same, but cut off the first time and whole the second. */
function providerCutsOffOnce(usage) {
    let first = true;
    globalThis.GM_xmlhttpRequest = o => {
        const cut = first;
        first = false;
        setImmediate(() => o.onload({
            status: 200,
            responseText: JSON.stringify({
                choices: [{ message: { content: "[ru] hello" }, finish_reason: cut ? "length" : "stop" }],
                usage
            }),
            responseHeaders: ""
        }));
        return { abort() { } };
    };
}

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
// The mask used to come out with the match's offset in front of it: "37***".
check("and nothing but the mask stands where the key was", asText().includes('Invalid API Key: ***"'));
check("the line says when, how bad, and what was going on", /ERROR\s+sent\s+groq answered 401/.test(asText()));

clear();
record("error", "sent", "x", "csk-abcdefghijklmnopqrstuvwxyz123456 hf_AbCdEfGhIjKlMnOpQrStUvWxYz12345678"
    + " Authorization: Bearer 0f1e2d3c4b5a69788796a5b4c3d2e1f0aa and 00112233445566778899aabbccddeeff");
check("Cerebras's key shape is masked", !asText().includes("csk-abcdefghij"));
check("and Hugging Face's", !asText().includes("hf_AbCdEf"));
check("and a bearer token", !asText().includes("0f1e2d3c4b5a6978"));
check("and a bare key of 32 hex digits", !asText().includes("00112233445566778899"));

clear();
record("info", "received", "ok", "sk-ant-THISLOOKSLIKEAKEY123 and AIzaSyAbCdEfGhIjKlMnOpQ");
check("Anthropic's key shape is masked", !asText().includes("sk-ant-THISLOOKSLIKEAKEY123"));
check("and Google's", !asText().includes("AIzaSyAbCdEfGhIjKlMnOpQ"));

clear();
record("info", "explain", "ok", '{"api_key": "supersecretvalue", "model": "m"}');
check("a key named as one in JSON is masked", !asText().includes("supersecretvalue"));
check("without taking the rest of the JSON with it", asText().includes("model"));

// --- the time is UTC, and each line says so ---
//
// An event at 01:01 in a person's own time was logged as 22:01 with nothing to
// say whose clock that was. A report is read in another zone than it was
// written in, so every line carries the mark, wherever it is cut from.

{
    const { now } = Date;
    const zone = process.env.TZ;
    // Thirteen hours from UTC in November, so a local time and a UTC one cannot pass for each other.
    process.env.TZ = "Pacific/Auckland";
    Date.now = () => Date.UTC(2026, 10, 21, 22, 1, 39);

    try {
        check("this check runs in a zone that is not UTC, or it could not tell the two apart",
            new Date(Date.now()).getHours() !== 22);

        clear();
        record("error", "key check", "glm answered 401", "token expired or incorrect");
        record("info", "sent", "groq answered 200");
        const [first, detail, second] = asText().split("\n");

        check("a line carries its time as UTC, not as the clock here reads", first.startsWith("2026-11-21 22:01:39 UTC  ERROR  key check"), first);
        check("a line with no detail is one line", second?.startsWith("2026-11-21 22:01:39 UTC  info "), second);
        check("the provider's words stand under the level, where they did before the mark",
            detail?.search(/\S/) === first.indexOf("ERROR") && detail.trim() === "token expired or incorrect", detail);
    } finally {
        Date.now = now;
        if (zone === undefined) delete process.env.TZ;
        else process.env.TZ = zone;
    }
}

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

// --- where a day's tokens went ---

settings = {
    locale: "en", provider: "groq", groqApiKey: "k", groqModel: "openai/gpt-oss-120b",
    baseUrl: "", sentLanguage: "English", receivedLanguage: "Russian", thinkingLevel: "low",
    mode: "always", enabledChannels: "", onError: "hold", gender: "unset",
    formality: "match", glossary: "", extraInstructions: "", useContext: false,
    fallbackProvider: "none"
};

clear();
provider({ prompt_tokens: 3105, completion_tokens: 11, prompt_tokens_details: { cached_tokens: 2944 } });
await translate("sent", "привет");
check("the log says what the request cost", /3105 prompt tokens/.test(asText()));
check("and how much of it the provider had cached", /2944 from cache/.test(asText()));

clear();
provider({ prompt_tokens: 3105, completion_tokens: 11, prompt_tokens_details: { cached_tokens: 0 } });
await translate("sent", "как дела");
check("a cache that did not hit is written down as nothing cached", /0 from cache/.test(asText()));

clear();
provider({ prompt_tokens: 3105, completion_tokens: 11 });
await translate("sent", "давай завтра");
check("a provider that counts tokens but not caching still reports the cost", /3105 prompt tokens/.test(asText()));
check("and is not made to claim a cache it never mentioned", !/from cache/.test(asText()));

clear();
provider(undefined);
await translate("sent", "спасибо");
check("a provider that counts nothing leaves the line as it was", /answered 200 in \d+ ms$/m.test(asText()));

// --- a key no mask knows ---
//
// The masks know the shapes providers hand out, and a provider that quotes the
// key back can have any. The notice carries the provider's words too, and a
// host may pass it on: Telegram's goes over a channel the page can read.

const ODD_KEY = "zq9Lr2Wm8Xc4Vb7Np1Ks6Jd3";
settings = { ...settings, groqApiKey: ODD_KEY };
globalThis.GM_xmlhttpRequest = o => {
    setImmediate(() => o.onload({
        status: 400,
        responseText: JSON.stringify({ error: { message: `This key is not allowed here: ${ODD_KEY}` } }),
        responseHeaders: ""
    }));
    return { abort() { } };
};

clear();
shown.length = 0;
let refused;
try { await translate("sent", "проверка ключа"); } catch (e) { refused = e; }
notify(refused, "failure");
check("a key of a shape no mask knows is taken out of what the provider said", !asText().includes(ODD_KEY));
check("and out of the notice, which a host may pass on", shown.length > 0 && !shown.some(s => s.text.includes(ODD_KEY)));
check("and out of the error itself", !!refused && !refused.message.includes(ODD_KEY));
check("while the rest of what it said is still there", shown.some(s => s.text.includes("This key is not allowed here")));

// --- why a message was asked about twice ---
//
// Six different things send one message back for a second answer. A log that
// shows two requests and no reason is how a cut-off answer and a rate limit
// looked like one event.

clear();
providerCutsOffOnce({ prompt_tokens: 4197 });
await translate("sent", "очень длинное сообщение про всё на свете");
check("a cut-off answer says so before asking again", /asking again: the answer was cut off/.test(asText()));
check("and both requests are in the log", asText().split("answered 200").length - 1 === 2);

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
