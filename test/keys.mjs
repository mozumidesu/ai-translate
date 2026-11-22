/*
 * AI Translate — a key as it is pasted, and what a provider says about it.
 *
 * A good Groq key was refused because the paste brought one invisible
 * character along, and nothing cleaned it: it went out inside
 * "Bearer <key>". And a 403 was called a bad key, though providers answer a
 * network or a country they turn away with a 403 too, while Gemini answers a
 * wrong key with a 400 that never showed red. This builds the real core and
 * holds both: what is pasted, saved, read and sent, and the verdict on each
 * provider's own answers, as they came back from the real APIs.
 *
 * Run it from the plugin folder:  node test/keys.mjs
 * It needs esbuild. If there is none beside it, install one anywhere and
 * point ESBUILD at it:            ESBUILD=~/tools/node_modules/esbuild
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
const out = await mkdtemp(join(tmpdir(), "ai-translate-keys-"));

let pass = 0, fail = 0;

function check(name, ok, detail) {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name);
    if (!ok && detail !== undefined) console.log("      ", detail);
}

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./core/host";\n`
            + `export { useNet } from "./core/net";\n`
            + `export { translate, forgetAnswers } from "./core/translate";\n`
            + `export { cleanAddress, cleanKey, keyVerdict, notAnApiKey } from "./core/providers";\n`
            + `export { baseUrlOf, checkKey, isReady, keyOf, providerName, readSlots, writeSlots } from "./core/slots";\n`
            + `export { asText, clear, entries } from "./core/log";\n`
            + `export { t } from "./core/locales";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: join(out, "core.mjs"),
    logLevel: "error"
});

const {
    useHost, useNet, translate, forgetAnswers, cleanAddress, cleanKey, keyVerdict, notAnApiKey,
    baseUrlOf, checkKey, isReady, keyOf, providerName, readSlots, writeSlots, asText, clear, entries, t
} = await import(join(out, "core.mjs"));

const KEY = "gsk_" + "A1b2C3d4E5f6G7h8J9k0L1m2N3p4Q5r6S7t8U9v0W1x2Y3z4A5b6";

let settings;
const fresh = extra => {
    settings = {
        locale: "en", provider: "groq", groqApiKey: "", groqModel: "openai/gpt-oss-120b", baseUrl: "",
        sentLanguage: "Russian", receivedLanguage: "English", glossary: "", extraInstructions: "",
        useContext: false, gender: "unset", formality: "match", fallbackProvider: "none", providerSlots: "",
        ...extra
    };
};
fresh();

useHost({
    config: () => settings,
    set: (name, value) => { settings[name] = value; },
    recent: () => [],
    meId: () => undefined,
    notice: () => { }
});

/** What the fake provider answers, and every request it was handed. */
let answers = [];
const seen = [];
const completion = text => JSON.stringify({ choices: [{ message: { content: text }, finish_reason: "stop" }] });

useNet(async request => {
    seen.push(request);
    const next = answers.length > 1 ? answers.shift() : answers[0];
    return { status: next.status, data: next.data, header: () => null };
});

const answer = (...list) => { answers = list; seen.length = 0; };

// --- what a paste brings along

const PASTED = {
    "a trailing space": KEY + " ",
    "a no-break space at the end": KEY + " ",
    "a zero-width space": KEY.slice(0, 20) + "​" + KEY.slice(20),
    "a byte order mark in front": "﻿" + KEY,
    "a line break": KEY + "\n",
    "a Windows line break": KEY + "\r\n",
    "a tab in front": "\t" + KEY,
    "a word joiner": KEY + "⁠"
};

for (const [what, pasted] of Object.entries(PASTED))
    check(`a key pasted with ${what} is cleaned`, cleanKey(pasted) === KEY, JSON.stringify(cleanKey(pasted)));

check("a clean key is left as it is", cleanKey(KEY) === KEY);
check("a key that was only a space is no key", cleanKey("  ​ ") === "");
check("and nothing turns into the word undefined", cleanKey(undefined) === "" && cleanKey(null) === "");

check("an address is trimmed at both ends", cleanAddress(" ​https://llm.example.com/v1 \n") === "https://llm.example.com/v1");
check("but nothing is taken from inside it", cleanAddress("https://llm.example.com/a b") === "https://llm.example.com/a b");

// --- saved clean, so the field shows it clean

const slot = { id: "s1", provider: "groq", keys: { groq: KEY + " ​\n", gemini: "﻿AIza123" }, models: { groq: "m" } };
const saved = writeSlots([slot, { id: "s2", provider: "openai", keys: { openai: "sk-x " }, models: { openai: "m" }, baseUrls: { openai: " https://llm.example.com/v1/ \n" } }]);

check("saving hands the slots back clean, which is what the field shows", saved[0].keys.groq === KEY, JSON.stringify(saved[0].keys));
check("every provider's key in the slot, not only the chosen one", saved[0].keys.gemini === "AIza123");
check("and the address", saved[1].baseUrls.openai === "https://llm.example.com/v1/", saved[1].baseUrls.openai);
check("what is stored is clean too", !/[\s​﻿]/.test(JSON.parse(settings.providerSlots)[0].keys.groq));
check("and a slot with no address is not given one", !("baseUrls" in saved[0]));

// --- read clean, so a key saved before this is cleaned too

fresh({ providerSlots: JSON.stringify([{ id: "old", provider: "groq", keys: { groq: KEY + " " }, models: { groq: "m" } }]) });
check("a key saved with a space before the cleaning is read clean", keyOf(readSlots()[0]) === KEY);

fresh({ groqApiKey: KEY + "\n" });
check("so is one in the settings from before the list", keyOf(readSlots()[0]) === KEY);

fresh({ providerSlots: JSON.stringify([{ id: "o", provider: "openai", keys: { openai: "k" }, models: { openai: "m" }, baseUrls: { openai: "\thttps://llm.example.com/v1 " } }]) });
check("and an address saved with spaces", baseUrlOf(readSlots()[0]) === "https://llm.example.com/v1");

fresh({ providerSlots: JSON.stringify([{ id: "e", provider: "groq", keys: { groq: " ​" }, models: { groq: "m" } }]) });
check("a slot whose key is only spaces is not ready to be asked", !isReady(readSlots()[0]));

// --- and sent clean

fresh({ providerSlots: JSON.stringify([{ id: "g", provider: "groq", keys: { groq: KEY + " " }, models: { groq: "m" } }]) });
answer({ status: 200, data: completion("привет") });
forgetAnswers();
await translate("sent", "hello");
check("a translation goes out as Bearer and the key, nothing after it",
    seen[0]?.headers.Authorization === `Bearer ${KEY}`, JSON.stringify(seen[0]?.headers.Authorization));

answer({ status: 200, data: JSON.stringify({ data: [{ id: "m" }] }) });
await checkKey(readSlots()[0]);
check("so does the key check", seen[0]?.headers.Authorization === `Bearer ${KEY}`, JSON.stringify(seen[0]?.headers.Authorization));

fresh({ providerSlots: JSON.stringify([{ id: "o", provider: "openai", keys: { openai: "sk-test " }, models: { openai: "m" }, baseUrls: { openai: " https://llm.example.com/v1/\n" } }]) });
answer({ status: 200, data: JSON.stringify({ data: [{ id: "m" }] }) });
await checkKey(readSlots()[0]);
check("and to the address as typed, without what came with the paste", seen[0]?.url === "https://llm.example.com/v1/models", seen[0]?.url);

// --- what each provider says about a key, from the real APIs

// Each of these came back from the provider itself, asked with a wrong key, on 21 November 2026.
const WRONG = {
    groq: [401, `{"error":{"message":"Invalid API Key","type":"invalid_request_error","code":"invalid_api_key"}}`],
    glm: [401, `{"error":{"code":"401","message":"token expired or incorrect"}}`],
    openai: [401, `{"error":{"message":"Incorrect API key provided: sk-wrong*********************rong. You can find your API key at https://platform.openai.com/account/api-keys.","type":"invalid_request_error","param":null,"code":"invalid_api_key"}}`],
    anthropic: [401, `{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_011ChGWVkZ9uAmcpQVvx29Tr"}`],
    gemini: [400, `{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}}]}}`]
};

for (const [provider, [status, data]] of Object.entries(WRONG))
    check(`${provider}'s answer to a wrong key (${status}) is a bad key`, keyVerdict(status, data) === "bad", keyVerdict(status, data));

check("as is Gemini's for a key it was told had leaked (403)",
    keyVerdict(403, `{"error":{"code":403,"message":"Your API key was reported as leaked. Please use another API key.","status":"PERMISSION_DENIED"}}`) === "bad");

// Z.ai answers twice over to a key it refuses, both measured in November 2026 and both a 401. A value that
// is no API key at all, a random run of 32 hex digits included, gets WRONG.glm above, on every one of its
// endpoints; a key of the right shape that it does not know gets a numbered failure ("Authentication Failed").
const ZAI_UNKNOWN_KEY = `{"error":{"code":"1000","message":"身份验证失败。"}}`;
check("glm's numbered authentication failure (401) is a bad key too", keyVerdict(401, ZAI_UNKNOWN_KEY) === "bad");

// Only the first is a different mistake, the wrong thing copied from z.ai's page, and gets a line of its own.
check("glm's \"token expired or incorrect\" is said as a value that is no API key", notAnApiKey("glm", 401, WRONG.glm[1]));
check("and its numbered failure is not: that one is a key it does not know", !notAnApiKey("glm", 401, ZAI_UNKNOWN_KEY));
for (const [provider, [status, data]] of Object.entries(WRONG).filter(([id]) => id !== "glm"))
    check(`${provider}'s wrong key is not mistaken for it`, !notAnApiKey(provider, status, data));
check("nor is a 200 from glm, or a 403", !notAnApiKey("glm", 200, WRONG.glm[1]) && !notAnApiKey("glm", 403, WRONG.glm[1]));

// A network or a country turned away, in the words the provider and its documentation give.
const BLOCKED = {
    "Groq's bare Forbidden (403)": [403, "Forbidden"],
    // Measured on one evening: this body came from a region Groq does not serve.
    "Groq's Forbidden in an error object (403)": [403, `{"error":{"message":"Forbidden"}}`],
    "the protection in front of Groq (403)": [403, "Access denied. Please check your network settings"],
    // And this one, from Cloudflare's front, for a VPN exit Groq refuses. Nothing here tells the two apart.
    "the same protection in an error object (403)": [403, `{"error":{"message":"Access denied. Please check your network settings."}}`],
    "a block page (403)": [403, "<!DOCTYPE html><html><head><title>Attention Required! | Cloudflare</title>"],
    "OpenAI's unsupported country (403)": [403, `{"error":{"code":"unsupported_country_region_territory","message":"Country, region, or territory not supported","param":null,"type":"request_forbidden"}}`],
    "OpenAI's address outside a key's allowlist (401)": [401, `{"error":{"message":"IP not authorized","code":"ip_not_authorized"}}`],
    "Gemini's unsupported location (400)": [400, `{"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}`]
};

for (const [what, [status, data]] of Object.entries(BLOCKED))
    check(`${what} is a blocked network, not a bad key`, keyVerdict(status, data) === "blocked", keyVerdict(status, data));

// Nothing to do with the key: no red line, and no line at all.
const NEITHER = {
    "a key that is right but not allowed this model (Anthropic, 403)": [403, `{"type":"error","error":{"type":"permission_error","message":"Your API key does not have permission to use the specified resource."}}`],
    "a project denied access (Gemini, 403)": [403, `{"error":{"code":403,"message":"Your project has been denied access","status":"PERMISSION_DENIED"}}`],
    "a 400 about something else": [400, `{"error":{"message":"max_tokens is too large"}}`],
    "a rate limit": [429, `{"error":{"message":"Rate limit reached","code":"rate_limit_exceeded"}}`],
    "an outage": [503, "Service Unavailable"],
    "no answer at all": [-1, "TypeError: fetch failed"],
    "a model list that is not there": [404, "Not Found"]
};

for (const [what, [status, data]] of Object.entries(NEITHER))
    check(`${what} says nothing about the key`, keyVerdict(status, data) === "unknown", keyVerdict(status, data));

check("and an answer that lists the models says the key is good", keyVerdict(200, "") === "ok");

// --- the check, in the log

fresh({ providerSlots: JSON.stringify([{ id: "g", provider: "groq", keys: { groq: KEY }, models: { groq: "m" } }]) });
clear();
// A provider that quotes the key back, in full.
answer({ status: 401, data: `{"error":{"message":"Invalid API Key ${KEY}","code":"invalid_api_key"}}` });
let said = await checkKey(readSlots()[0]);
let line = entries().at(-1);

check("a refused key is checked as bad", said.verdict === "bad" && said.status === 401, JSON.stringify(said));
check("and written to the log with the provider and the status", line?.what === "key check" && /^groq answered 401/.test(line.text), JSON.stringify(line));
check("as an error", line?.level === "error");
check("with the provider's own answer", line?.detail?.includes("invalid_api_key"), line?.detail);
check("and the key taken out of it", !asText().includes(KEY) && !asText().includes(KEY.slice(4)), asText());

answer({ status: 403, data: "Forbidden" });
said = await checkKey(readSlots()[0]);
line = entries().at(-1);
check("a network turned away is said as one, after asking again", said.verdict === "blocked" && seen.length === 3, `${said.verdict}, ${seen.length} requests`);
check("and logged so", /^groq answered 403: network or region refused/.test(line?.text), line?.text);

answer({ status: 403, data: "Forbidden" }, { status: 200, data: JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }) });
said = await checkKey(readSlots()[0]);
check("while a 403 that lets the next request through is no verdict on anything", said.verdict === "ok" && said.models.length === 1, JSON.stringify(said));

answer({ status: 403, data: `{"error":{"code":"unsupported_country_region_territory","message":"Country, region, or territory not supported"}}` });
await checkKey(readSlots()[0]);
check("a country turned away is not asked again: it will not change in a second", seen.length === 1, seen.length);

answer({ status: 200, data: JSON.stringify({ data: [{ id: "a" }, { id: "b" }] }) });
said = await checkKey(readSlots()[0]);
line = entries().at(-1);
check("a good key is logged as accepted, with what the list held", line?.level === "info" && line.text === "groq answered 200: key accepted, 2 models", line?.text);

answer({ status: -1, data: "TypeError: fetch failed" });
said = await checkKey(readSlots()[0]);
check("no answer is logged too, and says nothing of the key", said.verdict === "unknown" && /answered -1: nothing said about the key/.test(entries().at(-1)?.text), entries().at(-1)?.text);

// --- Z.ai's two refusals, in the log

// What the owner had copied from z.ai's page: 32 hex digits, no dot. Nothing here refuses it for that, since
// z.ai documents no key format; it goes out as pasted and Z.ai answers.
const HEX = "0123456789abcdef".repeat(2);
fresh({ providerSlots: JSON.stringify([{ id: "z", provider: "glm", keys: { glm: HEX }, models: { glm: "glm-4.5-flash" } }]) });
check("a key with no dot is ready to be asked with, not turned down here", isReady(readSlots()[0]));

clear();
answer({ status: WRONG.glm[0], data: WRONG.glm[1] });
said = await checkKey(readSlots()[0]);
line = entries().at(-1);
check("and is sent as it was pasted", seen[0]?.headers.Authorization === `Bearer ${HEX}`, JSON.stringify(seen[0]?.headers));
check("Z.ai's \"token expired or incorrect\" is checked as a bad key, said further",
    said.verdict === "bad" && said.notAKey === true && said.status === 401, JSON.stringify(said));
check("the log line says what it means and what to copy",
    line?.text === "glm answered 401: key refused, the value was not taken for an API key: copy the whole Standard API Key from z.ai, API Keys", line?.text);
check("with Z.ai's own words under it, as an error", line?.level === "error" && line.detail?.includes("token expired or incorrect"), JSON.stringify(line));

answer({ status: 401, data: ZAI_UNKNOWN_KEY });
said = await checkKey(readSlots()[0]);
line = entries().at(-1);
check("a key of the right shape that Z.ai does not know is a bad key and nothing more",
    said.verdict === "bad" && said.notAKey === false, JSON.stringify(said));
check("and its log line is the plain one", line?.text === "glm answered 401: key refused", line?.text);

answer({ status: 403, data: "Forbidden" });
said = await checkKey(readSlots()[0]);
check("a network turned away from Z.ai says nothing of the key", said.verdict === "blocked" && said.notAKey === false, JSON.stringify(said));

// --- and the same verdict where a translation is refused

fresh({ providerSlots: JSON.stringify([{ id: "gm", provider: "gemini", keys: { gemini: "AIzaWrong" }, models: { gemini: "gemini-3.8-flash" } }]) });
answer({ status: WRONG.gemini[0], data: WRONG.gemini[1] });
forgetAnswers();
let thrown = "";
try {
    await translate("sent", "hello");
} catch (e) {
    thrown = String(e?.message ?? e);
}
check("a translation Gemini refuses for a wrong key says the key was refused",
    thrown.endsWith(t("error.badKey", { provider: providerName("gemini"), status: 400 })), thrown);

// What a translation says when it meets a network turned away: the network, never the key,
// and never raw JSON. The provider's own words are quoted when it has any beyond "Forbidden".
const refused = async (provider, status, data, baseUrls) => {
    fresh({ providerSlots: JSON.stringify([{ id: "r", provider, keys: { [provider]: "k".repeat(30) }, models: { [provider]: "m" }, ...(baseUrls ? { baseUrls } : {}) }]) });
    answer({ status, data });
    forgetAnswers();
    try {
        await translate("sent", "hello");
    } catch (e) {
        return String(e?.message ?? e);
    }
    return "";
};

const network = provider => t("error.blocked", { provider: providerName(provider) });

check("a translation Groq turns away with a bare Forbidden (403) says the network, not a key and not \"a moment\"",
    (await refused("groq", 403, "Forbidden")).endsWith(network("groq")));
check("the same when Forbidden comes in an error object, as Groq answered a region it does not serve",
    (await refused("groq", 403, `{"error":{"message":"Forbidden"}}`)).endsWith(network("groq")));
check("the same for the page in front of Groq",
    (await refused("groq", 403, "Access denied. Please check your network settings")).endsWith(network("groq")));

// A VPN exit Groq refuses is answered by Cloudflare's front in an error object, and a translation quotes the
// words it has, as it does for any provider: neither a wrong key nor "usually temporary".
thrown = await refused("groq", 403, BLOCKED["the same protection in an error object (403)"][1]);
check("and for that page in an error object, in the words it came with",
    thrown.endsWith(t("error.forbiddenSaid", { provider: providerName("groq"), details: "Access denied. Please check your network settings." })), thrown);

thrown = await refused("openai", 403, BLOCKED["OpenAI's unsupported country (403)"][1], { openai: "https://llm.example.com/v1" });
check("a country OpenAI turns away is quoted in OpenAI's own words, as the notice already did",
    thrown.endsWith(t("error.forbiddenSaid", { provider: providerName("openai"), details: "Country, region, or territory not supported" })), thrown);

thrown = await refused("gemini", 400, BLOCKED["Gemini's unsupported location (400)"][1]);
check("Gemini's unsupported location (400) says the network, not a raw answer", thrown.endsWith(network("gemini")), thrown);

thrown = await refused("anthropic", 403, NEITHER["a key that is right but not allowed this model (Anthropic, 403)"][1]);
check("while a 403 that is neither the key nor the network is still the provider's own words",
    thrown.endsWith(t("error.forbiddenSaid", { provider: providerName("anthropic"), details: "Your API key does not have permission to use the specified resource." })), thrown);

thrown = await refused("groq", 401, WRONG.groq[1]);
check("and a wrong key is still a wrong key", thrown.endsWith(t("error.badKey", { provider: providerName("groq"), status: 401 })), thrown);

// Z.ai's "token expired or incorrect" is said as what it is, with the value pasted as it was.
fresh({ providerSlots: JSON.stringify([{ id: "z", provider: "glm", keys: { glm: HEX }, models: { glm: "glm-4.5-flash" } }]) });
answer({ status: WRONG.glm[0], data: WRONG.glm[1] });
forgetAnswers();
thrown = "";
try {
    await translate("sent", "hello");
} catch (e) {
    thrown = String(e?.message ?? e);
}
check("a translation Z.ai refuses with it says the value was not taken for an API key, and what to copy",
    t("apiKey.notAKey") !== "apiKey.notAKey" && thrown.endsWith(t("apiKey.notAKey", { provider: providerName("glm") })), thrown);
check("not the plain refused key, which says nothing of what to copy",
    !thrown.includes(t("error.badKey", { provider: providerName("glm"), status: 401 })), thrown);

thrown = await refused("glm", 401, ZAI_UNKNOWN_KEY);
check("while a key Z.ai does not know is still the plain refused key",
    thrown.endsWith(t("error.badKey", { provider: providerName("glm"), status: 401 })), thrown);

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
