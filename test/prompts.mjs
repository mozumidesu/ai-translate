/*
 * AI Translate — what the model is actually told.
 *
 * Every rule in the prompts was added because something came back wrong, and
 * the only way a rule quietly disappears is a change to how the prompt is put
 * together. This builds the real translation core, runs a real translation
 * past a fake provider, and reads the prompt that provider was handed.
 *
 * Run it from the plugin folder:  node test/prompts.mjs
 * It needs esbuild. If there is none beside it, install one anywhere and
 * point ESBUILD at it:            ESBUILD=~/tools/node_modules/esbuild
 */

import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

// A folder is not something import() can take, so each candidate is tried
// both as a package name and as the file inside it.
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
const out = await mkdtemp(join(tmpdir(), "ai-translate-"));

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./host";\nexport { aiTranslate, isJustAName } from "./translate";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: join(out, "core.mjs"),
    logLevel: "error"
});

// --- a provider that answers whatever it is told to, and keeps the questions
let answers = ["[ru] перевод"];
const asked = [];

globalThis.GM_xmlhttpRequest = options => {
    asked.push(JSON.parse(options.data));
    // The last scripted answer stands for every further request, so a test
    // that does not care how many times the model is asked need not say.
    const reply = answers.length > 1 ? answers.shift() : answers[0];
    // A string is a translation; an object is a whole answer, refusals included.
    const scripted = typeof reply === "string"
        ? { status: 200, body: JSON.stringify({ choices: [{ message: { content: reply }, finish_reason: "stop" }] }) }
        : reply;

    setTimeout(() => options.onload({
        status: scripted.status,
        responseText: scripted.body,
        responseHeaders: scripted.headers ?? ""
    }), 0);
    return { abort() { } };
};

const { useHost, aiTranslate, isJustAName } = await import(join(out, "core.mjs"));

/** What the chat above shows, for the tests that need someone in it. */
let history = [];

const settings = ({
        provider: "groq", groqApiKey: "k", groqModel: "m", baseUrl: "",
        sentLanguage: "English", receivedLanguage: "Russian",
        thinkingLevel: "low", mode: "always", enabledChannels: "",
        onError: "hold", gender: "unset", formality: "match",
        glossary: "", extraInstructions: "", useContext: false, locale: "en",
        fallbackProvider: "none"
    });

useHost({
    config: () => settings,
    set: () => { },
    recent: () => history,
    meId: () => undefined,
    notice: () => { }
});

/** Runs one translation and hands back what came out of it. */
async function translated(kind, text, ...replies) {
    asked.length = 0;
    answers = replies;
    const result = await aiTranslate(kind, text);
    return result.text;
}

/** The system prompt the provider was handed for one translation. */
async function promptFor(kind, text, reply) {
    asked.length = 0;
    answers = [reply];
    await aiTranslate(kind, text).catch(() => { });
    if (!asked.length) throw new Error("the provider was never asked");

    // Groq takes OpenAI's shape, where the rules are the first message.
    const system = asked[0].messages?.[0]?.content;
    if (!system) throw new Error("no rules in what the provider was sent");
    return system;
}

const outgoing = await promptFor("sent", "привет как дела", "[ru] hi, how are you");
const incoming = await promptFor("received", "hi how are you", "[en] привет, как дела");

let pass = 0, fail = 0;

function check(name, where, phrase) {
    const ok = where.text.includes(phrase);
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `${where.name}: ${name}`);
    if (!ok) console.log("       missing:", phrase);
}

const OUT = { name: "outgoing", text: outgoing };
const IN = { name: "incoming", text: incoming };

// Each line below is a complaint that came back from real use. The phrase is
// the part of the rule that answers it.
const RULES = [
    ["a past clause stays past", "Thank you for having loved me"],
    ["a time clause takes the target's own tense", "пока могу дышать"],
    ["words agree with their noun", "это первое сообщение"],
    ["gender is looked up in the target language", "gender does not travel between languages"],
    ["a carry-over that means nothing is wrong", "пытаюсь выбраться"],
    ["an ambiguous word is read by sense", "guilt, not about wine"],
    ["a slip of the keyboard is read, not copied", "the conjunction the writer meant to type"],
    ["a plain word is never made crude", "never \"член\""],
    ["a missing copula is put back", "Yes, it's better tomorrow"],
    ["family words are not guessed narrowly", "a son's wife and nothing else"],
    ["a name is not respelled by guesswork", "never \"Кляд\""],
    ["an unfamiliar name is left as written", "leave the name exactly as it was written"],
    ["bluntness is not softened either", "do not soften it"],

    // Older ones, so a change to how the prompt is assembled shows up here.
    ["dreams собираются, never снимаются", "снятся"],
    ["evaluations keep their temperature", "stands on the same rung"],
    ["praise is a set phrase", "Молодец"],
    ["aspect survives", "I've read the Bible"]
];

for (const [name, phrase] of RULES) {
    check(name, OUT, phrase);
    check(name, IN, phrase);
}

function absent(name, where, phrase) {
    const ok = !where.text.includes(phrase);
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `${where.name}: ${name}`);
}

// A few that belong to one side only.
check("the answer carries a language code", OUT, "one square-bracketed ISO 639-1 code");
check("no dash the writer did not type", OUT, "Never add a dash the writer did not type");
// On purpose: in an incoming translation a dash is often what the grammar
// asks for, as in "Мой друг — программист".
absent("and that rule is kept away from here", IN, "Never add a dash");
check("the writer's own capitals are kept", IN, "typed in lower case stays in lower case");

// Rules about something a message may or may not contain go only with the
// messages that contain it, so a plain message does not pay for them.
const CONDITIONAL = [
    ["capitals the writer typed are kept", "I WAS A TOTAL PIECE OF SHIT"],
    ["emphasis stays on the same word", "never a demonstrative"],
    ["repeated marks are tone", "\"??\" is not \"?\""],
    ["app names are names", "\"tik\" is TikTok"],
    ["Vietnamese pronouns come from the conversation", "tôi reads like a form"],
    ["drawn-out sounds keep their length", "Three letters stay three"],
    ["Arabic courtesy word", "the answer to thanks, not an apology"]
];

const fullOut = await promptFor("sent", "Я БЫЛ ПОЛНЫМ ГОВНОМ!! Ооо, видел в tik, mình ơi, عفوا", "[ru] I WAS!! Ooo");
const fullIn = await promptFor("received", "I WAS SO TIRED!! Ooo, saw it on tik, có đâu, عفوا", "[en] Я БЫЛ!! Ооо");
const FULL_OUT = { name: "outgoing with all of it", text: fullOut };
const FULL_IN = { name: "incoming with all of it", text: fullIn };

for (const [name, phrase] of CONDITIONAL) {
    check(name, FULL_OUT, phrase);
    check(name, FULL_IN, phrase);
    absent(`${name}: not sent with a plain message`, OUT, phrase);
    absent(`${name}: not sent with a plain message`, IN, phrase);
}
check("Vietnamese negation frame", FULL_IN, "có … đâu");
absent("Vietnamese negation frame: not with a message in English", IN, "có … đâu");

// The part of the prompt that does not depend on the message comes first and
// is the same for every message, so a provider's cache can keep it.
const head = text => text.slice(0, text.indexOf("Answer format:"));
check("the fixed part of an outgoing prompt does not change with the message", { name: "outgoing", text: head(outgoing) }, head(await promptFor("sent", "да, мне понравилось", "[ru] yes")));
check("nor does an incoming one", { name: "incoming", text: head(incoming) }, head(await promptFor("received", "yes i liked it", "[en] да")));

// Names: a nickname is a name even when it looks like a word.
check("a nickname is never decoded", OUT, "never decode it into what its parts might mean");
check("a message that is only a name comes back as written", OUT, "nothing but a name");
check("and that is allowed as an answer", OUT, "or if it is nothing but a name");
check("a nickname is never decoded", IN, "never decode it into what its parts might mean");

// Russian rules go only where Russian is involved.
const english = await promptFor("sent", "hello there", "[en] hello there");
absent("the Russian aspect rule is not sent with an English message into English", { name: "outgoing", text: english }, "I've read the Bible");
// English has one "you": the long list of other languages' forms is not sent.
absent("no list of familiar forms for a translation into English", OUT, "aku and kamu");

// --- and what actually comes out, not only what the model is told

/** How many times the provider was asked during the last translation. */
function counted(name, want) {
    const ok = asked.length === want;
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `result: ${name}`);
    if (!ok) console.log("       asked", asked.length, "times, expected", want);
}

async function behaves(name, got, want) {
    const ok = (await got) === want;
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `result: ${name}`);
    if (!ok) console.log("       got:", JSON.stringify(await got), "want:", JSON.stringify(want));
}

// An empty line between paragraphs is put back without asking again.
await behaves(
    "an empty line survives a model that runs the paragraphs together",
    translated("sent", "первая строка\n\nвторая строка", "[ru] first line\nsecond line"),
    "first line\n\nsecond line"
);
counted("and it cost one request", 1);

// Capitals are asked for again, since which words they belong to cannot be
// worked out from here.
await behaves(
    "shouting that was answered quietly is asked for again",
    translated(
        "sent",
        "Я признаю, Я БЫЛ ПОЛНЫМ ГОВНОМ",
        "[ru] I admit, I was a total piece of shit",
        "[ru] I admit, I WAS A TOTAL PIECE OF SHIT"
    ),
    "I admit, I WAS A TOTAL PIECE OF SHIT"
);
counted("and that took a second request", 2);

// An answer that keeps the capitals is not asked for twice.
await behaves(
    "shouting answered loudly is left alone",
    translated("sent", "Скажу прямо, Я БЫЛ ПОЛНЫМ ГОВНОМ", "[ru] I'll say it plainly, I WAS A TOTAL PIECE OF SHIT"),
    "I'll say it plainly, I WAS A TOTAL PIECE OF SHIT"
);
counted("and that one request was enough", 1);

// --- names

settings.glossary = "Yumechka, rights = permissions";
await behaves("a glossary name on its own goes out as typed", translated("sent", "Yumechka!", "[ru] A little dream!"), "Yumechka!");
counted("without asking the model at all", 0);

await behaves(
    "a glossary name inside a sentence is kept whatever the model does with it",
    translated("sent", "Yumechka, привет", "[ru] {{1}}, hi"),
    "Yumechka, hi"
);
check("and the model is told what the placeholder is", { name: "request", text: asked[0]?.messages?.[0]?.content ?? "" }, "is a name or a term that is never translated: \"Yumechka\"");
check("the name itself never reaches the model as a word", { name: "request", text: "" + !(asked[0]?.messages?.[1]?.content ?? "").includes("Yumechka") }, "true");
settings.glossary = "";

history = [
    { id: "1", authorId: "them", authorName: "Hoshi 🌸", content: "hi" },
    { id: "2", authorId: "me", authorName: "Mozumi", content: "привет" }
];
const nameCheck = (text, want) => {
    const got = isJustAName(text, "c");
    const ok = got === want;
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `result: "${text}" is ${want ? "" : "not "}just a name`);
};
nameCheck("Hoshi", true);
nameCheck("hoshi!!", true);
nameCheck("Hoshi 🌸", true);
nameCheck("Hoshi, привет", false);
nameCheck("Привет", false);
history = [];

await behaves("a one-word message read back unchanged is taken as a name", translated("received", "Yumechka", "[ja] Yumechka"), "Yumechka");
counted("and not asked about again", 1);

await behaves("a one-word message sent back untranslated is still asked again", translated("sent", "Привет", "[ru] Привет", "[ru] Hi"), "Hi");
counted("which takes a second request", 2);

// --- limits

const groqDay = {
    status: 429,
    headers: "retry-after: 433\n",
    body: JSON.stringify({ error: { message: "Rate limit reached for model `m` in organization `org_x` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199500, Requested 3456. Please try again in 7m12.48s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing", type: "tokens", code: "rate_limit_exceeded" } })
};

async function failure(name, kind, text, reply, want) {
    asked.length = 0;
    answers = [reply];
    let said = "";
    try { await aiTranslate(kind, text); } catch (e) { said = e.message; }
    const ok = said.includes(want);
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", `result: ${name}`);
    if (!ok) console.log("       said:", JSON.stringify(said), "want:", JSON.stringify(want));
}

await failure("a daily limit says it is the daily one, with the real wait", "sent", "проверка лимита", groqDay, "used up the daily limit for m. It frees up in 8 min");
counted("after one request", 1);
await failure("and the next message is told the same without asking", "sent", "ещё одна проверка", groqDay, "used up the daily limit for m");
counted("asking nothing", 0);
settings.groqModel = "m2";
await behaves("a different model is asked as usual", translated("sent", "другая модель", "[ru] another model"), "another model");
settings.groqModel = "m";

const groqMinute = {
    status: 429,
    headers: "retry-after: 45\n",
    body: JSON.stringify({ error: { message: "Rate limit reached for model `m2` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6000, Requested 3456. Please try again in 44.1s." } })
};
settings.groqModel = "m2";
await failure("a per-minute limit gives the wait in seconds", "sent", "минутный лимит", groqMinute, "Try again in 45 s");
settings.groqModel = "m";

const gemini = {
    status: 429,
    body: JSON.stringify({ error: { code: 429, message: "You exceeded your current quota. Please retry in 61.5s.", status: "RESOURCE_EXHAUSTED", details: [{ "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }] }, { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "61s" }] } })
};
settings.groqModel = "m3";
await failure("a refusal worded like Gemini's is read the same way", "sent", "как у джемини", gemini, "Try again in 2 min");
settings.groqModel = "m";

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
