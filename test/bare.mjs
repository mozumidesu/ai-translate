/*
 * AI Translate — the core with nothing around it.
 *
 * core/ is meant to run wherever there is a JavaScript engine: a userscript on
 * another chat's page, a desktop shell, an app that runs it in JavaScriptCore
 * or Hermes. What a Discord window has, those do not, so the core takes what it
 * needs from a Host and a Net and reaches for nothing else. This builds the
 * real core for no platform at all, takes the page away, and runs a
 * translation through a fake Net and a fake Host.
 *
 * Taking the page away is two things. Every file but bridge.ts, the one place
 * allowed to look at the page, is read for a use of document, window or
 * navigator, which esbuild's define finds exactly: a real use, and nothing in
 * a string, a comment or a property name. And while the translations run those
 * globals are traps that write down being read, since a catch somewhere would
 * swallow the throw and this would never know.
 *
 * Run it from the plugin folder:  node test/bare.mjs
 * It needs esbuild. If there is none beside it, install one anywhere and
 * point ESBUILD at it:            ESBUILD=~/tools/node_modules/esbuild
 */

import { spawn } from "child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";

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
const out = await mkdtemp(join(tmpdir(), "ai-translate-bare-"));

let pass = 0, fail = 0;

function check(name, ok, detail) {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name);
    if (!ok && detail !== undefined) console.log("      ", detail);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- no file but bridge.ts reaches for the page

// What a page has and a bare engine does not.
const PAGE = ["document", "window", "navigator", "location", "localStorage", "sessionStorage"];

const define = Object.fromEntries(PAGE.flatMap(name =>
    [[name, `__page_${name}__`], [`globalThis.${name}`, `__page_${name}__`]]));

/** Which of the page's globals a file uses, by name. */
async function reachesFor(file) {
    const { code } = esbuild.transformSync(await readFile(join(plugin, "core", file), "utf8"),
        { loader: "ts", define, legalComments: "none" });

    return [...new Set(code.match(/__page_\w+__/g) ?? [])].map(marker => marker.slice(7, -2));
}

// The scan is only worth anything if it can see: bridge.ts does reach for the
// page, in a browser's own way of handing over an update.
check("the scan sees what bridge.ts reaches for", (await reachesFor("bridge.ts")).includes("window"));

for (const file of (await readdir(join(plugin, "core"))).filter(name => name.endsWith(".ts") && name !== "bridge.ts").sort()) {
    const used = await reachesFor(file);
    check(`core/${file} does not reach for the page`, used.length === 0, `it uses ${used.join(", ")}`);
}

// --- the core, built for no platform

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./core/host";\n`
            + `export { timeoutSignal, useNet } from "./core/net";\n`
            + `export { aiTranslate, forgetAnswers } from "./core/translate";\n`
            + `export { currentLocale, t } from "./core/locales";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: join(out, "core.mjs"),
    logLevel: "error"
});

// Everything from here on has no page, no fetch and no userscript manager.
const touched = new Set();

for (const name of [...PAGE, "fetch", "GM_xmlhttpRequest"]) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        get() {
            touched.add(name);
            throw new ReferenceError(`${name} is not defined`);
        }
    });
}

const { useHost, useNet, timeoutSignal, aiTranslate, forgetAnswers, currentLocale, t } = await import(join(out, "core.mjs"));

const settings = {
    provider: "groq", groqApiKey: "k", groqModel: "m", baseUrl: "",
    sentLanguage: "Russian", receivedLanguage: "English",
    glossary: "", extraInstructions: "", useContext: false,
    gender: "unset", formality: "match", locale: "en", fallbackProvider: "none"
};

// Says nothing about which chat it is.
const host = {
    config: () => settings,
    set: () => { },
    recent: () => [],
    meId: () => undefined,
    notice: () => { }
};

/** What a provider answers with: a chat completion, as OpenAI's shape has it. */
const completion = text => JSON.stringify({ choices: [{ message: { content: text }, finish_reason: "stop" }] });

let answer = { status: 200, data: completion("[en] привет") };
const seen = [];

useNet(async request => {
    seen.push(request);
    return { status: answer.status, data: answer.data, header: () => null };
});

/** Translates what is typed and says what the provider was sent. */
async function sentFor(text) {
    forgetAnswers();
    seen.length = 0;
    const result = await aiTranslate("sent", text);
    return { result, request: seen[0], body: seen[0] && JSON.parse(seen[0].body) };
}

// --- a translation, in Discord

useHost(host);
settings.locale = "en";

let ran = await sentFor("hello");

check("a translation runs on a Net and a Host alone", ran.result.text === "привет", JSON.stringify(ran.result));
check("and asks the provider once, through that Net", seen.length === 1, seen.length);
check("at the provider's address", ran.request.url === "https://api.groq.com/openai/v1/chat/completions", ran.request.url);
check("as a POST that carries the key", ran.request.method === "POST" && ran.request.headers.Authorization === "Bearer k");
check("and the message, to the model asked for", ran.body.messages[1].content === "hello" && ran.body.model === "m");
check("under a deadline", ran.request.signal instanceof AbortSignal && !ran.request.signal.aborted);
check("in Discord, which a host that says nothing is", ran.body.messages[0].content.includes("inside a Discord chat client."));

// --- and in another chat

useHost({ ...host, appName: () => "Telegram", dialect: () => "plain" });
ran = await sentFor("hello");
const system = ran.body.messages[0].content;

check("a host says which chat it is", system.includes("inside a Telegram chat client."), system.slice(0, 80));
check("and the prompt says nothing of Discord", !system.includes("Discord"));
check("or of markdown the chat does not have", !system.includes("Markdown that starts a line") && !system.includes("<:name:123>"));

// --- the language follows the app, which is the host's to say

/** What the plugin says when a key is missing, under the language the host gives. */
function spoken(locale, appLocale) {
    settings.locale = locale;
    useHost({ ...host, ...(appLocale === undefined ? {} : { appLocale }) });
    return t("error.noKey", { provider: "P" });
}

const russian = spoken("ru");
const english = spoken("en");
check("(the two languages differ, or the checks below say nothing)", russian !== english);

check("a plugin set to follow the app speaks the app's language", spoken("auto", () => "ru-RU") === russian);
check("and reads it with the region left off", currentLocale() === "ru");
check("or with the region alone", spoken("auto", () => "RU") === russian);
check("English where the host does not say", spoken("auto") === english);
check("or says something the plugin has no words for", spoken("auto", () => "xx-YY") === english);
check("or is no help", spoken("auto", () => { throw new Error("no page"); }) === english);
check("while a language chosen in the settings wins", spoken("ru", () => "en-US") === russian);

// A refusal is told in that language too, all the way from the provider.
answer = { status: 401, data: "{}" };
settings.locale = "auto";
useHost({ ...host, appLocale: () => "ru-RU" });
forgetAnswers();
let said = "";
try { await aiTranslate("sent", "hello"); } catch (e) { said = e.message; }
settings.locale = "ru";
check("a refused key is explained in the app's language", said === "AI Translate: " + t("error.badKey", { provider: "Groq", status: 401 }), said);
answer = { status: 200, data: completion("[en] привет") };
settings.locale = "en";
useHost(host);

// --- the deadline, where AbortSignal.timeout is missing

const nativeTimeout = AbortSignal.timeout;
const nativeController = globalThis.AbortController;

let signal = timeoutSignal(40);
check("a deadline is a signal", signal instanceof AbortSignal && !signal.aborted);
await sleep(250);
check("that gives up when the time is up", signal.aborted);

delete AbortSignal.timeout;
signal = timeoutSignal(40);
check("without AbortSignal.timeout it is still a signal", signal instanceof AbortSignal && !signal.aborted);
await sleep(250);
check("and still gives up", signal.aborted);
check("saying why", String(signal.reason).includes("timed out"), String(signal.reason));

ran = await sentFor("hello");
check("a translation still goes out under a deadline", ran.request.signal instanceof AbortSignal && !ran.request.signal.aborted);

delete globalThis.AbortController;
check("with no AbortController either there is no deadline to make", timeoutSignal(40) === undefined);
ran = await sentFor("hello");
check("and the translation goes ahead without one", ran.result.text === "привет" && ran.request.signal === undefined);

globalThis.AbortController = nativeController;
AbortSignal.timeout = nativeTimeout;

// --- a deadline nobody is waiting on is no reason to stay alive

const child = join(out, "child.mjs");
await writeFile(child,
    `import { timeoutSignal } from ${JSON.stringify(pathToFileURL(join(out, "core.mjs")).href)};\n`
    + `delete AbortSignal.timeout;\n`
    + `const signal = timeoutSignal(60_000);\n`
    + `console.log(signal instanceof AbortSignal && !signal.aborted ? "armed" : "wrong");\n`);

const started = Date.now();
const told = await new Promise(resolve => {
    const proc = spawn(process.execPath, [child], { stdio: ["ignore", "pipe", "inherit"] });
    let text = "";
    proc.stdout.on("data", chunk => { text += chunk; });

    const patience = setTimeout(() => {
        proc.kill();
        resolve(text + " (still running after 5 s)");
    }, 5000);

    proc.on("exit", () => {
        clearTimeout(patience);
        resolve(text);
    });
});

check("the fallback's timer does not keep a process running", told.trim() === "armed" && Date.now() - started < 4500, told);

// --- and through all of it

check("nothing reached for the page, for fetch or for a userscript manager", touched.size === 0, [...touched].join(", "));

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
