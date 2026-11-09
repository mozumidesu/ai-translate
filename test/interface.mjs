/*
 * AI Translate — what a person sees, as far as it can be checked without Discord.
 *
 * Every string in all sixteen languages, the names a provider goes by, the
 * minus that must not take the last backup away, the echo of what somebody
 * typed, the two headings Vencord draws in English over the plugin's settings,
 * updating a copy that lives in a browser tab, and the build a support report
 * names, the same way from every kind of copy. The React that draws them is
 * not here; what it is handed is.
 *
 * Run it from the plugin folder:  node test/interface.mjs
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
const out = await mkdtemp(join(tmpdir(), "ai-translate-interface-"));

let pass = 0, fail = 0;

function check(name, ok, detail) {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name);
    if (!ok && detail !== undefined) console.log("       ", detail);
}

await esbuild.build({
    stdin: {
        contents: `export { useHost } from "./core/host";\n`
            + `export { t } from "./core/locales";\n`
            + `export { canRemove, keyHeading, providerLabel, providerName } from "./core/slots";\n`
            + `export { literalBackslashes } from "./core/keep";\n`
            + `export { localizeHeadings } from "./ui/ModalHeadings";\n`,
        resolveDir: plugin,
        loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: join(out, "ui.mjs"),
    logLevel: "error"
});

const { useHost, t, canRemove, keyHeading, providerLabel, providerName,
    literalBackslashes, localizeHeadings } = await import(join(out, "ui.mjs"));

let locale = "en";

useHost({
    config: () => ({ locale }),
    set: () => { },
    recent: () => [],
    meId: () => undefined,
    notice: () => { }
});

// --- every string, in every language ---
//
// Missing keys fall back to English, which is why nothing else notices one:
// a partial translation is safe, and so is a forgotten one. Read from the
// source rather than from t(), which would hand English back for the gap.

const source = await readFile(join(plugin, "core/locales.ts"), "utf8");
const blocks = {};

for (const block of source.matchAll(/^const (\w+): Strings = \{\n([\s\S]*?)\n\};$/gm))
    blocks[block[1]] = [...block[2].matchAll(/^ *"([^"]+)": "(.*)",?$/gm)].map(m => [m[1], m[2]]);

const LANGUAGES = ["en", "ru", "uk", "ro", "de", "es", "fr", "pt", "ja", "zh", "th", "vi", "tr", "id", "ar", "ko"];
const englishKeys = new Set((blocks.en ?? []).map(([key]) => key));

check("all sixteen languages are in the file", LANGUAGES.every(l => blocks[l]), Object.keys(blocks).join(" "));

for (const lang of LANGUAGES.filter(l => blocks[l])) {
    const keys = blocks[lang].map(([key]) => key);
    const missing = [...englishKeys].filter(key => !keys.includes(key));
    const extra = keys.filter(key => !englishKeys.has(key));
    const empty = blocks[lang].filter(([, value]) => !value.trim()).map(([key]) => key);

    check(`${lang}: has every string English has, and no other`,
        !missing.length && !extra.length && keys.length === new Set(keys).size,
        `missing ${missing} extra ${extra}`);
    check(`${lang}: none of them is empty`, !empty.length, empty.join(" "));
}

// A placeholder lost in translation prints as the braces.
for (const lang of LANGUAGES.filter(l => blocks[l])) {
    const lost = blocks[lang].filter(([key, value]) => {
        const want = (blocks.en.find(([k]) => k === key)?.[1].match(/\{\w+\}/g) ?? []).sort().join();
        return (value.match(/\{\w+\}/g) ?? []).sort().join() !== want;
    }).map(([key]) => key);

    check(`${lang}: every {placeholder} is where English has it`, !lost.length, lost.join(" "));
}

// --- Logs ---
//
// The button and the window it opens were "Logs" in all sixteen, and the error
// that sends a person there named the button in English as well. The error has
// to name the button the way it now reads, or it points at something that is
// not on the page.

const word = (lang, key) => blocks[lang].find(([k]) => k === key)?.[1];

for (const lang of LANGUAGES.filter(l => l !== "en" && blocks[l])) {
    check(`${lang}: the Logs button is not left in English`, word(lang, "logs.open") !== "Logs");
    check(`${lang}: its window is called what the button is`, word(lang, "logs.title") === word(lang, "logs.open"));
    check(`${lang}: the error that sends a person there names it`,
        word(lang, "error.unknown").includes(word(lang, "logs.open")),
        word(lang, "error.unknown"));
}

// --- the two headings Vencord draws ---

for (const lang of LANGUAGES.filter(l => l !== "en" && blocks[l])) {
    check(`${lang}: Authors and Settings are put into its language`,
        word(lang, "modal.authors") !== "Authors" && word(lang, "modal.settings") !== "Settings");
}

// --- what a provider is called ---

locale = "en";
check("the generic provider reads \"Any OpenAI-compatible\", with no API at the end",
    providerLabel("openai", true) === "Any OpenAI-compatible", providerLabel("openai", true));
check("in a backup's list too", providerLabel("openai") === "Any OpenAI-compatible");
check("its key is headed \"API key — any OpenAI-compatible\"",
    keyHeading("openai") === "API key — any OpenAI-compatible", keyHeading("openai"));
check("another provider's key is headed with its name", keyHeading("groq") === "API key — Groq", keyHeading("groq"));
check("advice stays on the first provider only",
    providerLabel("groq", true) === "Groq (recommended)" && providerLabel("groq") === "Groq");
check("in a sentence it is called by what it speaks, not by a label that starts with Any",
    providerName("openai") === "OpenAI-compatible" && providerName("groq") === "Groq");

locale = "ru";
check("in Russian the key heading follows the same pattern",
    keyHeading("openai") === "Ключ API — любой, совместимый с OpenAI", keyHeading("openai"));
locale = "en";

// --- the minus ---

check("the first provider has no minus", !canRemove(2, 0) && !canRemove(5, 0));
check("the one backup the page shows has none either: it is switched off with None", !canRemove(2, 1));
check("with two backups each can go", canRemove(3, 1) && canRemove(3, 2));
check("and with the most there is room for", [1, 2, 3, 4].every(at => canRemove(5, at)));

// --- the echo of what was typed ---
//
// Discord drops a backslash in front of a mark, or of a letter outside A to Z.
// This is its own rule, so that the echo can be checked against it.

const discord = text => text.replace(/\\([^0-9A-Za-z\s])/g, "$1");

const typed = "\\WoW\\, ещё вечер";
check("without the fix, Discord eats the closing backslash of \\WoW\\,", discord(typed) === "\\WoW, ещё вечер");
check("the echo of \\WoW\\, shows both backslashes", discord(literalBackslashes(typed)) === typed, literalBackslashes(typed));

for (const [name, text] of [
    ["a phrase kept in Russian", "\\привет\\ мир"],
    ["escaped marks are shown, not obeyed", "\\*word\\* and \\_this\\_"],
    ["two backslashes in a row are two", "a \\\\ b"],
    ["a shrug", "¯\\_(ツ)_/¯"],
    ["raised arms", "\\o/ yes"],
    ["a line kept whole", "one\n\\this line stays"],
    ["an emoji code is not turned into an emoji", "\\:smile:"],
    ["a backslash at the very end", "end\\"],
    ["nothing to change", "no backslashes here"]
]) check(`the echo shows what was typed: ${name}`, discord(literalBackslashes(text)) === text, literalBackslashes(text));

check("an escaped star is not left to start italics", literalBackslashes("\\*a\\*") === "\\\\\\*a\\\\\\*", literalBackslashes("\\*a\\*"));
check("a mention after a backslash is left for Discord to draw",
    literalBackslashes("\\<@123> hi") === "\\\\<@123> hi", literalBackslashes("\\<@123> hi"));
check("code is shown as it is, backslashes and all",
    literalBackslashes("`C:\\dir` and ```\na\\b\n``` x") === "`C:\\dir` and ```\na\\b\n``` x");
check("text between code is still put right",
    literalBackslashes("`a\\b` \\x\\!") === "`a\\b` \\\\x\\\\\\!", literalBackslashes("`a\\b` \\x\\!"));

// --- the headings, in a page shaped like Vencord's plugin window ---

class Text {
    constructor(value) {
        this.nodeType = 3;
        this.nodeValue = value;
    }
}

/** Only what ModalHeadings asks of the page: closest, one selector, attributes, children. */
class Element {
    constructor(tag, classes = [], children = []) {
        this.nodeType = 1;
        this.tag = tag;
        this.classes = classes;
        this.attributes = {};
        this.childNodes = children.map(c => typeof c === "string" ? new Text(c) : c);
        for (const child of this.childNodes) child.parent = this;
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    closest(selector) {
        if (!selector.startsWith(".")) throw new Error(`unsupported selector ${selector}`);
        for (let at = this; at; at = at.parent) if (at.classes.includes(selector.slice(1))) return at;
        return null;
    }

    querySelectorAll(selector) {
        if (selector !== ":scope > section > h3") throw new Error(`unsupported selector ${selector}`);
        return this.childNodes
            .filter(c => c.tag === "section")
            .flatMap(section => section.childNodes.filter(c => c.tag === "h3"));
    }
}

function pluginWindow() {
    const authors = new Element("h3", [], ["Authors"]);
    const settings = new Element("h3", [], ["Settings"]);
    const row = new Element("div");
    const deeper = new Element("h3", [], ["Settings"]);

    const content = new Element("div", ["vc-settings-modal-content"], [
        new Element("section", [], [authors, new Element("div")]),
        new Element("div", [], [new Element("section", [], [row])]),
        new Element("section", [], [settings, new Element("div", [], [deeper])])
    ]);

    return { content, authors, settings, row, deeper };
}

{
    const page = pluginWindow();
    locale = "ru";
    localizeHeadings(page.row);
    check("Authors becomes Авторы", page.authors.childNodes[0].nodeValue === "Авторы", page.authors.childNodes[0].nodeValue);
    check("Settings becomes Настройки", page.settings.childNodes[0].nodeValue === "Настройки");
    check("a heading further down is not touched", page.deeper.childNodes[0].nodeValue === "Settings");

    locale = "ja";
    localizeHeadings(page.row);
    check("the language can change while the window is open",
        page.authors.childNodes[0].nodeValue === "作者" && page.settings.childNodes[0].nodeValue === "設定");

    locale = "en";
    localizeHeadings(page.row);
    check("and go back to English",
        page.authors.childNodes[0].nodeValue === "Authors" && page.settings.childNodes[0].nodeValue === "Settings");
}

{
    // Not inside a plugin window at all, or with nothing to start from: nothing happens.
    const stray = new Element("div", [], [new Element("section", [], [new Element("h3", [], ["Settings"])])]);
    locale = "ru";
    localizeHeadings(stray);
    localizeHeadings(null);
    check("outside the plugin's window nothing is touched", stray.childNodes[0].childNodes[0].childNodes[0].nodeValue === "Settings");

    // A heading that holds more than the word, or another word, is Vencord's business.
    const page = pluginWindow();
    page.authors.childNodes.push(new Element("span", [], ["!"]));
    page.settings.childNodes[0].nodeValue = "Preferences";
    localizeHeadings(page.row);
    check("a heading with anything else in it is left alone", page.authors.childNodes[0].nodeValue === "Authors");
    check("so is one that says something else", page.settings.childNodes[0].nodeValue === "Preferences");
    locale = "en";
}

// --- updating a copy that lives in a browser tab ---
//
// The userscript is updated by its userscript manager. What the plugin can do
// is say whether that has happened and hand the manager the file, and none of
// it must reach anything but the build site.

const OWN = "abc1234-def5678";

/** The core as the build robot leaves it: the same two lines, rewritten the way build/github.sh does. */
async function bridgeAs(channel) {
    const outfile = join(out, `bridge-${channel ?? "unpublished"}.mjs`);

    await esbuild.build({
        stdin: {
            contents: `export { Bridge, isPublishedUserscript, onDesktop } from "./core/bridge";\n`,
            resolveDir: plugin,
            loader: "ts"
        },
        bundle: true,
        format: "esm",
        platform: "node",
        outfile,
        logLevel: "error",
        plugins: [{
            name: "robot",
            setup(build) {
                build.onLoad({ filter: /core[\\/]bridge\.ts$/ }, async args => {
                    let text = await readFile(args.path, "utf8");

                    if (channel) {
                        const named = text.replace(/^const BROWSER_BUILD = "web";$/m, `const BROWSER_BUILD = "${OWN}";`);
                        const stamped = named.replace(/^const BROWSER_CHANNEL: string = "dev";$/m,
                            `const BROWSER_CHANNEL: string = "${channel}";`);

                        check(`the robot's two lines are still in bridge.ts (${channel})`,
                            named !== text && stamped !== named);
                        text = stamped;
                    }

                    return { contents: text, loader: "ts" };
                });
            }
        }]
    });

    return import(outfile);
}

const asked = [];
const sent = [];
const opened = [];
const assigned = [];
let served = { status: 200, body: JSON.stringify({ build: OWN, channel: "release" }) };
let blocked = false;

globalThis.GM_xmlhttpRequest = options => {
    asked.push(options.url);
    sent.push(options.data);
    setImmediate(() => served === "silence" ? options.onerror() : options.onload({
        status: served.status,
        responseText: served.body,
        responseHeaders: ""
    }));
    return { abort() { } };
};

globalThis.window = {
    open: url => (opened.push(url), blocked ? null : {}),
    location: { assign: url => assigned.push(url) }
};

const serve = build => served = { status: 200, body: JSON.stringify({ build }) };
const reset = () => { asked.length = opened.length = assigned.length = 0; blocked = false; };

globalThis.IS_USERSCRIPT = true;

const release = await bridgeAs("release");
const testing = await bridgeAs("testing");

check("a published userscript is one", release.isPublishedUserscript() === true && testing.isPublishedUserscript() === true);
check("and is not a desktop copy", release.onDesktop() === false);

reset();
serve(OWN);
check("the newest build is the one running: current",
    (await release.Bridge.checkAiTranslateUpdate("release")).state === "current");
check("it asked the released channel, and only that",
    asked.length === 1 && asked[0] === "https://builds.zolatau.com/build.json", asked.join());

reset();
serve("0000000-1111111");
check("another build is out: available", (await release.Bridge.checkAiTranslateUpdate("release")).state === "available");

reset();
serve(OWN);
check("the other channel is another script even with the same build: available",
    (await release.Bridge.checkAiTranslateUpdate("testing")).state === "available");
check("the testing channel is asked at its own address", asked[0] === "https://builds.zolatau.com/testing/build.json", asked.join());

reset();
serve(OWN);
check("a testing userscript following testing: current",
    (await testing.Bridge.checkAiTranslateUpdate("testing")).state === "current");
check("a setting this version does not know is the released channel",
    (await release.Bridge.checkAiTranslateUpdate("nightly")).state === "current" && asked.at(-1) === "https://builds.zolatau.com/build.json");

reset();
served = { status: 500, body: "oops" };
check("the build site failing is offline, not an update", (await release.Bridge.checkAiTranslateUpdate("release")).state === "offline");

served = { status: 200, body: "{\"nothing\":1}" };
check("an answer that names no build is offline", (await release.Bridge.checkAiTranslateUpdate("release")).state === "offline");

served = { status: 200, body: "not json" };
check("an answer that is not JSON is offline", (await release.Bridge.checkAiTranslateUpdate("release")).state === "offline");

served = "silence";
check("no answer at all is offline", (await release.Bridge.checkAiTranslateUpdate("release")).state === "offline");

reset();
check("handing the release script over opens its own address",
    (await release.Bridge.installAiTranslateUpdate("release")).ok === true
    && opened.length === 1 && opened[0] === "https://builds.zolatau.com/ai-translate.user.js", opened.join());
check("and asks nothing else", asked.length === 0);

reset();
await release.Bridge.installAiTranslateUpdate("testing");
check("switching to testing hands over the testing script",
    opened[0] === "https://builds.zolatau.com/testing/ai-translate.user.js", opened.join());

reset();
blocked = true;
await release.Bridge.installAiTranslateUpdate("release");
check("a blocked pop-up sends the page itself there",
    assigned.length === 1 && assigned[0] === "https://builds.zolatau.com/ai-translate.user.js", assigned.join());

// A copy nothing published has nothing to be updated from.
const unpublished = await bridgeAs(null);
reset();
serve("0000000-1111111");
check("a copy somebody built is not a published userscript", unpublished.isPublishedUserscript() === false);
check("it says it is a development copy, without asking anyone",
    (await unpublished.Bridge.checkAiTranslateUpdate("release")).state === "dev" && asked.length === 0);
check("and hands nothing over",
    (await unpublished.Bridge.installAiTranslateUpdate("release")).ok === false && opened.length === 0);

// Nor does a browser copy that is not a userscript: an extension is kept by its store.
globalThis.IS_USERSCRIPT = false;
const extension = await bridgeAs("release");
reset();
check("an extension copy is not asked about either",
    (await extension.Bridge.checkAiTranslateUpdate("release")).state === "dev" && asked.length === 0);

// --- the build a support report names ---
//
// Whoever reads a report has to read its build line the same way whichever copy
// sent it: the plugin's version, then the build in brackets. A desktop copy's
// is written by native.ts, a browser copy's by bridge.ts.

const VERSION = (await readFile(join(plugin, "core/version.ts"), "utf8")).match(/^export const VERSION = "(.+)";$/m)?.[1];
check("the plugin's version can be read from core/version.ts", /^\d+\.\d+\.\d+[a-z]?$/.test(VERSION), VERSION);

const report = JSON.stringify({ endpoint: "https://relay.example/report", body: { subject: "s", message: "m" } });

async function reportOf(bridge) {
    await bridge.Bridge.sendAiTranslateFeedback(report);
    return JSON.parse(sent.at(-1));
}

globalThis.IS_USERSCRIPT = true;
globalThis.IS_EXTENSION = false;
const fromRelease = await reportOf(release);
check("a userscript's report: the version, then its build in brackets, as a userscript",
    fromRelease.build === `${VERSION} (userscript ${OWN})`, fromRelease.build);
check("and the rest of the report goes as the form wrote it", fromRelease.subject === "s" && fromRelease.message === "m");

const fromTesting = (await reportOf(testing)).build;
check("a testing userscript says so inside the brackets", fromTesting === `${VERSION} (userscript ${OWN} testing)`, fromTesting);

const fromSource = (await reportOf(unpublished)).build;
check("a userscript somebody built has no build of the robot's to name",
    fromSource === `${VERSION} (userscript web)`, fromSource);

globalThis.IS_USERSCRIPT = false;
globalThis.IS_EXTENSION = true;
const fromExtension = (await reportOf(extension)).build;
check("an extension says so in front of its build", fromExtension === `${VERSION} (extension ${OWN})`, fromExtension);

globalThis.IS_EXTENSION = false;
const fromPlain = (await reportOf(release)).build;
check("a browser copy that is neither is only its build", fromPlain === `${VERSION} (${OWN})`, fromPlain);

// The desktop copy: native.ts as Electron's main process runs it, which finds the build the installer wrote beside it.
const desktop = join(out, "desktop");
await mkdir(desktop);
await esbuild.build({
    entryPoints: [join(plugin, "native.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    outfile: join(desktop, "native.cjs"),
    external: ["electron"],
    logLevel: "error"
});
const native = createRequire(import.meta.url)(join(desktop, "native.cjs"));

const posted = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (posted.push(init.body), new Response("", { status: 200 }));

async function desktopBuild(installed) {
    const file = join(desktop, "build.json");
    if (installed) await writeFile(file, JSON.stringify(installed));
    else await rm(file, { force: true });

    await native.sendAiTranslateFeedback({}, report);
    return JSON.parse(posted.at(-1)).build;
}

const desktopRelease = await desktopBuild({ build: OWN, channel: "release" });
check("a desktop copy's report: the version, then its build in brackets", desktopRelease === `${VERSION} (${OWN})`, desktopRelease);

const desktopTesting = await desktopBuild({ build: OWN, channel: "testing" });
check("a testing build says so inside the brackets", desktopTesting === `${VERSION} (${OWN} testing)`, desktopTesting);

const desktopOlder = await desktopBuild({ build: OWN });
check("a copy installed before there were two channels is a release", desktopOlder === `${VERSION} (${OWN})`, desktopOlder);

const desktopSource = await desktopBuild(null);
check("a copy built from source has no build to name: dev", desktopSource === `${VERSION} (dev)`, desktopSource);

globalThis.fetch = realFetch;

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
