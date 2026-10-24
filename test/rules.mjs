// Tokens per line of the outgoing and incoming prompts, biggest first.
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { tokens, perLine } from "./tokens.mjs";

const tools = process.env.TOOLS ?? `${process.env.HOME}/tools/node_modules`;
const esbuild = await import(`${tools}/esbuild/lib/main.js`);

const here = new URL(".", import.meta.url).pathname;
const plugin = join(here, "..");
const out = await mkdtemp(join(tmpdir(), "ai-translate-"));
await esbuild.build({
    stdin: { contents: `export { useHost } from "./core/host";\nexport { aiTranslate } from "./core/translate";\n`, resolveDir: plugin, loader: "ts" },
    bundle: true, format: "esm", platform: "node", outfile: join(out, "core.mjs"), logLevel: "error"
});

let reply = "[ru] hello";
const asked = [];
globalThis.GM_xmlhttpRequest = o => { asked.push(JSON.parse(o.data)); setImmediate(() => o.onload({ status: 200, responseText: JSON.stringify({ choices: [{ message: { content: reply }, finish_reason: "stop" }] }), responseHeaders: "" })); return { abort() { } }; };
const { useHost, aiTranslate } = await import(join(out, "core.mjs"));
useHost({
    config: () => ({ provider: "groq", groqApiKey: "k", groqModel: "m", baseUrl: "", sentLanguage: "English", receivedLanguage: "Russian", thinkingLevel: "low", mode: "always", enabledChannels: "", onError: "hold", gender: "male", formality: "match", glossary: "", extraInstructions: "", useContext: false, locale: "ru", fallbackProvider: "none" }),
    set: () => { }, recent: () => [], meId: () => "me", notice: () => { }
});

for (const [kind, text, answer] of [["sent", "Да, мне понравилось", "[ru] Yes, I liked it"], ["received", "yes I liked it", "[en] да, мне понравилось"]]) {
    asked.length = 0; reply = answer;
    await aiTranslate(kind, text);
    const system = asked[0].messages[0].content;
    const weight = perLine(system);
    const lines = system.split("\n").map((l, at) => [weight[at], l]).sort((a, b) => b[0] - a[0]);
    console.log(`\n=== ${kind}: ${tokens(system)} tokens in ${system.split("\n").length} lines ===`);
    for (const [n, l] of lines.slice(0, 40)) console.log(String(n).padStart(4), l.slice(0, 110));
}
