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
        contents: `export { useHost } from "./core/host";\nexport { translate, translateBatch, collectContext } from "./core/translate";\n`,
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

const { useHost, translate, translateBatch, collectContext } = await import(join(out, "core.mjs"));

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

/** One translation as the plugin makes it now: the context chosen for this kind and this message. */
async function cost(kind, text, answer, withContext) {
    asked.length = 0;
    reply = answer;
    settings.useContext = withContext;
    await translate(kind, text, collectContext("c", undefined, undefined, { kind, text })).catch(e => console.log("  (failed:", e.message, ")"));
    const sent = asked[0];
    const system = sent.messages[0].content;
    const user = sent.messages[1].content;
    const [forSystem, forUser] = perText([system, user]);
    return { requests: asked.length, chars: system.length + user.length, tokens: forSystem + forUser, max: sent.max_tokens };
}

const LONG = "ok so I finally finished it last night and honestly the whole middle part dragged a bit for me,"
    + " but the last twenty minutes made up for all of it, especially the scene on the bridge where she stops"
    + " everything just to say goodbye properly";

const rows = [
    ["outgoing, no context", await cost("sent", "Да, мне очень понравилось, особенно концовка", "[ru] Yes, I really liked it, especially the ending", false)],
    ["outgoing, with context", await cost("sent", "Да, мне очень понравилось, особенно концовка ", "[ru] Yes, I really liked it, especially the ending", true)],
    ["incoming, no context", await cost("received", "omg yes!! the ending was so good, I cried", "[en] боже да!! концовка была такая классная, я плакал", false)],
    ["incoming, with context", await cost("received", "omg yes!! the ending was so good, I cried ", "[en] боже да!! концовка была такая классная, я плакал", true)],
    ["incoming, long, no context", await cost("received", LONG, "[en] короче, досмотрел вчера", false)],
    // Long enough to stand on its own: the names stay, the lines do not.
    ["incoming, long, context", await cost("received", LONG + " ", "[en] короче, досмотрел вчера", true)]
];

console.log("\nWhat one request carries (o200k tokens, the tokenizer gpt-oss uses):");
for (const [name, r] of rows)
    console.log(`  ${name.padEnd(28)} ${String(r.tokens).padStart(5)} tokens  (${r.chars} characters, answer room ${r.max})`);

// --- ten messages from other people: one request for all of them, or one each
const TEN = [
    ["Kaii", "anyone up for a game tonight?"], ["Rin", "maybe, what time?"], ["Kaii", "like 9ish"],
    ["Tomo", "i'm in but i have to eat first lol"], ["Rin", "same, my mom made dinner late again"],
    ["Kaii", "no rush, we can wait"], ["Tomo", "btw did u guys see the new update? they nerfed my main"],
    ["Rin", "nooo not again"], ["Kaii", "it's fine, it was way too strong anyway"],
    ["Tomo", "easy for you to say, you play the most broken character in the game"]
].map(([name, content], i) => ({ id: `t${i + 1}`, authorId: name, authorName: name, content }));
const before = history.slice();
history.push(...TEN);
settings.useContext = true;

async function carried() {
    const [system, user] = [asked.map(a => a.messages[0].content), asked.map(a => a.messages[1].content)];
    const counts = await perText([...system, ...user]);
    return { requests: asked.length, tokens: counts.reduce((a, b) => a + b, 0) };
}

asked.length = 0;
for (const m of TEN) {
    reply = "[en] перевод";
    await translate("received", m.content, collectContext("c", m.id, m.authorName, { kind: "received", text: m.content }));
}
const one = await carried();

asked.length = 0;
reply = TEN.map((_, i) => `=== ${i + 1} ===\n[en] перевод`).join("\n");
await translateBatch("c", TEN.map(m => ({ id: m.id + "b", text: m.content + " ", author: m.authorName })), () => { });
const all = await carried();
history.length = 0;
history.push(...before);

console.log("\nTen messages from other people, as \"translate all below\" and one by one:");
console.log(`  one request for all ten   ${String(all.tokens).padStart(5)} tokens in ${all.requests} request(s)`);
console.log(`  one request each          ${String(one.tokens).padStart(5)} tokens in ${one.requests} requests`);

// --- the plugin's own time, with an instant provider
settings.useContext = true;
const context = collectContext("c");
const N = 2000;
reply = "[ru] Yes, I really liked it, especially the ending";
const started = performance.now();
for (let i = 0; i < N; i++) await translate("sent", `Да, мне очень понравилось, особенно концовка ${i}`, context);
const each = (performance.now() - started) / N;
console.log(`\nThe plugin's own work per translation, network taken out: ${each.toFixed(3)} ms (average of ${N})`);
