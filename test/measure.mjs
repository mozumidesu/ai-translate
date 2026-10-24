/*
 * AI Translate — how much a translation costs, and where the time goes.
 *
 * Builds the real core, hands it a provider that answers instantly, and
 * reports two things: how many tokens each kind of request carries (what the
 * provider's limits count), and how long the plugin's own code takes per
 * translation once the network is taken out of the picture.
 *
 * Run it from the plugin folder:  node test/measure.mjs
 * Needs esbuild beside the project, and the tool in tools/ built for the
 * token counts.
 */

import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { perText } from "./tokens.mjs";

const tools = process.env.TOOLS ?? `${process.env.HOME}/tools/node_modules`;
const esbuild = await import(`${tools}/esbuild/lib/main.js`);

const here = new URL(".", import.meta.url).pathname;
const plugin = join(here, "..");
const out = await mkdtemp(join(tmpdir(), "ai-translate-"));

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./host";\nexport { aiTranslate, collectContext } from "./translate";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true, format: "esm", platform: "node",
    outfile: join(out, "core.mjs"), logLevel: "error"
});

let reply = "[ru] hello";
const asked = [];

globalThis.GM_xmlhttpRequest = options => {
    asked.push(JSON.parse(options.data));
    setImmediate(() => options.onload({
        status: 200,
        responseText: JSON.stringify({ choices: [{ message: { content: reply }, finish_reason: "stop" }] }),
        responseHeaders: ""
    }));
    return { abort() { } };
};

const { useHost, aiTranslate, collectContext } = await import(join(out, "core.mjs"));

const settings = {
    provider: "groq", groqApiKey: "k", groqModel: "openai/gpt-oss-120b", baseUrl: "",
    sentLanguage: "English", receivedLanguage: "Russian",
    thinkingLevel: "low", mode: "always", enabledChannels: "",
    onError: "hold", gender: "male", formality: "match",
    glossary: "", extraInstructions: "", useContext: true, locale: "ru",
    fallbackProvider: "none"
};

// Six ordinary lines of a chat between him and someone writing English.
const history = [
    ["them", "Kaii", "hey, are you still up?"],
    ["me", "Mozumi", "Yes, I can't sleep. What about you?"],
    ["them", "Kaii", "same lol, I was watching a movie and now my brain won't shut up"],
    ["me", "Mozumi", "Which movie?"],
    ["them", "Kaii", "the one you told me about last week, with the girl who can stop time"],
    ["me", "Mozumi", "Oh, did you like it?"]
].map(([who, name, content], i) => ({ id: String(i + 1), authorId: who === "me" ? "me" : "them", authorName: name, content }));

useHost({
    config: () => settings,
    set: () => { },
    recent: () => history,
    meId: () => "me",
    notice: () => { }
});

async function cost(kind, text, answer, withContext) {
    asked.length = 0;
    reply = answer;
    settings.useContext = withContext;
    await aiTranslate(kind, text, collectContext("c")).catch(e => console.log("  (failed:", e.message, ")"));
    const sent = asked[0];
    const system = sent.messages[0].content;
    const user = sent.messages[1].content;
    const [forSystem, forUser] = perText([system, user]);
    return { requests: asked.length, chars: system.length + user.length, tokens: forSystem + forUser, max: sent.max_tokens };
}

const rows = [
    ["outgoing, no context", await cost("sent", "Да, мне очень понравилось, особенно концовка", "[ru] Yes, I really liked it, especially the ending", false)],
    ["outgoing, with context", await cost("sent", "Да, мне очень понравилось, особенно концовка ", "[ru] Yes, I really liked it, especially the ending", true)],
    ["incoming, no context", await cost("received", "omg yes!! the ending was so good, I cried", "[en] боже да!! концовка была такая классная, я плакал", false)],
    ["incoming, with context", await cost("received", "omg yes!! the ending was so good, I cried ", "[en] боже да!! концовка была такая классная, я плакал", true)]
];

console.log("\nWhat one request carries (o200k tokens, the tokenizer gpt-oss uses):");
for (const [name, r] of rows)
    console.log(`  ${name.padEnd(24)} ${String(r.tokens).padStart(5)} tokens  (${r.chars} characters, answer room ${r.max})`);

// --- the plugin's own time, with an instant provider
settings.useContext = true;
const context = collectContext("c");
const N = 2000;
reply = "[ru] Yes, I really liked it, especially the ending";
const started = performance.now();
for (let i = 0; i < N; i++) await aiTranslate("sent", `Да, мне очень понравилось, особенно концовка ${i}`, context);
const each = (performance.now() - started) / N;
console.log(`\nThe plugin's own work per translation, network taken out: ${each.toFixed(3)} ms (average of ${N})`);
