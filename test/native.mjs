/*
 * AI Translate — the desktop's way out.
 *
 * native.ts runs in Electron's main process, where the global fetch is Node's.
 * Node's fetch follows nothing Discord's own traffic follows: the system proxy,
 * a PAC file, --proxy-server. Behind a VPN running as a system proxy, Discord
 * went through it and the plugin's requests left from the real address, which
 * Groq answered with a bare 403, and where that address could not reach the
 * provider at all, with "TypeError: fetch failed" and nothing to say why.
 *
 * This builds native.ts for node beside a fake Electron and checks that every
 * request it makes goes through a session of the plugin's own, that the
 * deadline, an HTTP error and a network failure still reach the core the way
 * they did, and that a failure names its cause. Whether Chromium then really
 * takes the proxy cannot be checked without Electron itself; that was measured
 * by hand against Electron 37 and 45.
 *
 * Run it from the plugin folder:  node test/native.mjs
 * It needs esbuild, exactly as test/prompts.mjs does.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { createRequire } from "module";
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
const out = await mkdtemp(join(tmpdir(), "ai-translate-native-"));
const desktop = join(out, "desktop");
await mkdir(join(desktop, "node_modules", "electron"), { recursive: true });

await esbuild.build({
    entryPoints: [join(plugin, "native.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: join(desktop, "native.cjs"),
    external: ["electron"],
    logLevel: "error"
});

await esbuild.build({
    entryPoints: [join(plugin, "core/net.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: join(out, "net.mjs"),
    logLevel: "error"
});

// Electron as native.ts sees it, steered by the test through `electron` below.
await writeFile(join(desktop, "node_modules", "electron", "index.js"), `
module.exports = {
    session: {
        fromPartition: name => globalThis.electron.fromPartition(name),
        get defaultSession() {
            globalThis.electron.touchedDefault = true;
            return globalThis.electron.fromPartition("");
        }
    }
};
`);

const require = createRequire(import.meta.url);
const NATIVE = join(desktop, "native.cjs");

/** native.ts as a freshly started Discord loads it: nothing remembered from before. */
function loadNative() {
    delete require.cache[require.resolve(NATIVE)];
    return require(NATIVE);
}

const { failureOf, fetchNet } = await import(join(out, "net.mjs"));

let pass = 0, fail = 0;

function check(name, ok, detail) {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name, ok || detail === undefined ? "" : `\n     got: ${JSON.stringify(detail)}`);
}

const answer = (status, body, headers = {}) => new Response(body, { status, headers });

/** Requests Chromium was asked to make, and the ones Node's fetch was. */
let viaSession = [];
let viaNode = [];
/** What the next request through each one meets. */
let sessionAnswers = () => answer(200, "{}");
let nodeAnswers = () => answer(200, "{}");

const partitions = [];

function electronWith({ fetch = true, ready = true } = {}) {
    globalThis.electron = {
        touchedDefault: false,
        fromPartition(name) {
            if (!ready) throw new Error("Session can only be received when app is ready");
            partitions.push(name);
            return fetch ? { fetch: async (url, init) => (viaSession.push({ url, init }), sessionAnswers(url, init)) } : {};
        }
    };
}

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (viaNode.push({ url, init }), nodeAnswers(url, init));

function reset() {
    viaSession = [];
    viaNode = [];
    partitions.length = 0;
    sessionAnswers = () => answer(200, "{}");
    nodeAnswers = () => answer(200, "{}");
}

const chat = JSON.stringify({
    provider: "groq", apiKey: "gsk_test", model: "openai/gpt-oss-120b", baseUrl: "",
    system: "Translate into Russian.", text: "Hello", thinkingLevel: "default"
});
const models = JSON.stringify({ provider: "groq", apiKey: "gsk_test", baseUrl: "" });

// --- every request takes Chromium's way, in a session of the plugin's own ---

electronWith();
reset();
let native = loadNative();

sessionAnswers = () => answer(200, JSON.stringify({ choices: [{ message: { content: "[ru] Привет" }, finish_reason: "stop" }] }), {
    "x-ratelimit-limit-tokens": "8000", "x-ratelimit-remaining-tokens": "7000", "x-ratelimit-reset-tokens": "7.5s"
});
const sent = await native.makeAiTranslateRequest({}, chat);

check("a translation goes out through Chromium's network stack, which follows the proxy Discord follows",
    viaSession.length === 1 && viaSession[0].url === "https://api.groq.com/openai/v1/chat/completions", viaSession.map(r => r.url));
check("and not through Node's fetch, which ignores it", viaNode.length === 0, viaNode.length);
check("in a session of the plugin's own, not Discord's default one",
    partitions.join() === "ai-translate" && !globalThis.electron.touchedDefault, partitions);

const init = viaSession[0]?.init ?? {};
check("with no cookies, as Node's fetch had none", init.credentials === "omit", init.credentials);
check("and the request itself as it was: method, headers, body",
    init.method === "POST" && init.headers?.Authorization === "Bearer gsk_test"
    && init.headers?.["User-Agent"] === "AI-Translate/1.0 (Vencord plugin)"
    && JSON.parse(init.body).model === "openai/gpt-oss-120b", init);
check("with the deadline attached", init.signal instanceof AbortSignal && !init.signal.aborted);
check("an answer comes back whole, its rate limit headers included",
    sent.status === 200 && /Привет/.test(sent.data) && sent.budget?.limit === 8000 && sent.budget?.refillMs === 7500, sent);

sessionAnswers = () => answer(401, '{"error":{"message":"Invalid API Key","code":"invalid_api_key"}}');
const refused = await native.listAiModels({}, models);
check("an HTTP error is the provider's answer, as before", refused.status === 401 && /invalid_api_key/.test(refused.data), refused);
check("the session is asked for once, not once a request", partitions.length === 1, partitions);

sessionAnswers = () => Promise.reject(new Error("net::ERR_PROXY_CONNECTION_FAILED"));
const unreached = await native.listAiModels({}, models);
check("a network failure is the -1 the key check and the notices read, in Chromium's words",
    unreached.status === -1 && unreached.data === "Error: net::ERR_PROXY_CONNECTION_FAILED", unreached);

// The deadline: a provider that never answers, with the core's 20 seconds made 30 ms.
const timeout = AbortSignal.timeout;
AbortSignal.timeout = ms => timeout.call(AbortSignal, Math.min(ms, 30));
sessionAnswers = (url, init) => new Promise((_, reject) =>
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
const started = Date.now();
// AbortSignal.timeout keeps no process alive; Discord is, and this stands in for it.
const alive = setTimeout(() => { }, 5000);
const late = await native.listAiModels({}, models);
clearTimeout(alive);
AbortSignal.timeout = timeout;
check("the deadline still ends a request that is never answered",
    late.status === -1 && /TimeoutError/.test(late.data) && Date.now() - started < 1000, { ...late, ms: Date.now() - started });

reset();
const report = JSON.stringify({ endpoint: "https://relay.example/report", body: { subject: "s", message: "m" } });
await native.sendAiTranslateFeedback({}, report);
check("feedback goes the same way", viaSession.length === 1 && viaSession[0].url === "https://relay.example/report" && viaNode.length === 0,
    { session: viaSession.map(r => r.url), node: viaNode.length });

// --- the update download ---

await writeFile(join(desktop, "build.json"), JSON.stringify({ build: "b1", channel: "release" }));
reset();
sessionAnswers = url => url.endsWith("/build.json")
    ? answer(200, JSON.stringify({ build: "b2" }))
    : answer(200, `/* ${url.split("/").pop()} */`);

const checked = await native.checkAiTranslateUpdate({}, "release");
check("the update check asks the build site through the session",
    checked.state === "available" && viaSession[0]?.url === "https://builds.zolatau.com/build.json" && viaNode.length === 0, { checked, urls: viaSession.map(r => r.url) });
check("and asks it afresh", viaSession[0]?.init?.headers?.["Cache-Control"] === "no-cache", viaSession[0]?.init);

reset();
sessionAnswers = url => url.endsWith("/build.json")
    ? answer(200, JSON.stringify({ build: "b2" }))
    : answer(200, `/* ${url.split("/").pop()} */`);
const installed = await native.installAiTranslateUpdate({}, "release");
const files = viaSession.filter(r => /\/b2\//.test(r.url));
check("the download takes the same way, every file of it", installed.ok && files.length === 4 && viaNode.length === 0, { installed, urls: viaSession.map(r => r.url) });
check("and keeps the files out of the session's cache", files.every(r => r.init?.cache === "no-store"), files.map(r => r.init));
check("the files land where the running ones are", (await readFile(join(desktop, "renderer.js"), "utf8")) === "/* renderer.js */");

reset();
sessionAnswers = () => Promise.reject(new Error("net::ERR_NAME_NOT_RESOLVED"));
const offline = await native.checkAiTranslateUpdate({}, "release");
check("a check that cannot reach the site says why", offline.state === "offline" && offline.details === "Error: net::ERR_NAME_NOT_RESOLVED", offline);

// --- where there is no Chromium fetch to be had ---

electronWith({ fetch: false });
reset();
native = loadNative();
nodeAnswers = () => Promise.reject(new TypeError("fetch failed", {
    cause: Object.assign(new Error("getaddrinfo ENOTFOUND api.groq.com"), { code: "ENOTFOUND" })
}));
const old = await native.listAiModels({}, models);
check("an Electron older than 25, with no session.fetch, falls back to Node's fetch", viaNode.length === 1 && viaSession.length === 0);
check("and Node's \"fetch failed\" names its cause", old.status === -1 && old.data === "TypeError: fetch failed (getaddrinfo ENOTFOUND api.groq.com)", old);

electronWith({ ready: false });
reset();
native = loadNative();
await native.listAiModels({}, models);
check("before the app is ready there is no session, and Node's fetch answers", viaNode.length === 1 && viaSession.length === 0);
electronWith();
await native.listAiModels({}, models);
check("and the session is used as soon as there is one", viaSession.length === 1 && viaNode.length === 1);

// --- a failure, said in full ---

check("Chromium's error is its own reason", failureOf(new Error("net::ERR_NAME_NOT_RESOLVED")) === "Error: net::ERR_NAME_NOT_RESOLVED");
check("a cause whose words carry its code is quoted as it is",
    failureOf(new TypeError("fetch failed", { cause: Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:443"), { code: "ECONNREFUSED" }) }))
    === "TypeError: fetch failed (connect ECONNREFUSED 10.0.0.1:443)");
const connectTimeout = Object.assign(new Error("Connect Timeout Error (attempted address: api.groq.com:443, timeout: 10000ms)"), { code: "UND_ERR_CONNECT_TIMEOUT" });
check("a cause whose words do not carry its code gets the code in front",
    failureOf(new TypeError("fetch failed", { cause: connectTimeout }))
    === "TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error (attempted address: api.groq.com:443, timeout: 10000ms))",
    failureOf(new TypeError("fetch failed", { cause: connectTimeout })));
const both = Object.assign(new AggregateError([
    Object.assign(new Error("connect ETIMEDOUT 104.18.2.1:443"), { code: "ETIMEDOUT" }),
    Object.assign(new Error("connect ENETUNREACH 2606:4700::1:443"), { code: "ENETUNREACH" })
], ""), { code: "ETIMEDOUT" });
check("two addresses that failed at once are both named",
    failureOf(new TypeError("fetch failed", { cause: both }))
    === "TypeError: fetch failed (connect ETIMEDOUT 104.18.2.1:443; connect ENETUNREACH 2606:4700::1:443)",
    failureOf(new TypeError("fetch failed", { cause: both })));
check("a code with no words is still a reason", failureOf(new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } })) === "TypeError: fetch failed (UND_ERR_SOCKET)");
check("an abort is said as it was", failureOf(new DOMException("The operation was aborted due to timeout", "TimeoutError")) === "TimeoutError: The operation was aborted due to timeout");

// Node's own fetch, really failing: a name that can never resolve.
globalThis.fetch = realFetch;
const real = await fetchNet({ url: "http://ai-translate.invalid/" });
check("Node's own \"fetch failed\" comes with its reason", real.status === -1 && /^TypeError: fetch failed \(.+\)$/.test(real.data), real.data);

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
