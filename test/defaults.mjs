/*
 * AI Translate — do the browser's defaults still match the settings page?
 *
 * web/storage.ts writes its defaults out by hand rather than importing
 * settings.ts, because that file is the Vencord settings page: importing it
 * would drag Vencord into a build whose whole point is not having any. The
 * cost of writing them twice is that they drift, and nothing notices: a
 * setting added to the page is simply undefined in the browser, which reads
 * as off, or empty, or whatever falsy means where it is used.
 *
 * It has happened. AI Explain was made off by default on the page and stayed
 * on in the browser, and nothing was red.
 *
 * The page cannot be imported, so it is bundled with Vencord's own imports
 * replaced by stubs: OptionType answers with the name of whatever is asked of
 * it, definePluginSettings hands back what it was given, and every component
 * is a function that is never called. What comes out is the real definitions,
 * read from the real file.
 *
 *   node test/defaults.mjs     needs esbuild
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = resolve(HERE, "..");

/**
 * Settings the browser build has no use for, each with the reason. A new
 * setting cannot join this list by accident: leaving it out of the browser's
 * defaults fails until somebody writes down why it belongs here.
 */
const DESKTOP_ONLY = {
    updateChannel: "the browser build is kept current by the userscript manager",
    lastUpdateCheck: "the same",
    aiLearn: "AI Learn is not wired into web/intercept.ts at all",
    learnHistory: "nothing in the browser writes corrections to keep",
    apiKey: "the single key from before there were several, migrated and then left empty",
    model: "the single model from the same time"
};

// A folder is not something import() can take, so each candidate is tried
// both as a package name and as the file inside it, exactly as the other
// tests do it.
const WHERE = [process.env.ESBUILD, "esbuild", `${process.env.TOOLS}/esbuild`,
    `${process.env.HOME}/tools/node_modules/esbuild`]
    .filter(Boolean)
    .flatMap(where => [where, `${where}/lib/main.js`]);

let esbuild;
for (const candidate of WHERE) {
    try {
        esbuild = await import(candidate);
        break;
    } catch {
        // The next one, or none at all.
    }
}

if (!esbuild) {
    console.error("No esbuild. Install one and point ESBUILD at it.");
    process.exit(1);
}

const out = await mkdtemp(join(tmpdir(), "ai-translate-defaults-"));

/** Vencord, and the settings page's own components, reduced to nothing. */
const STUBS = {
    "@api/Settings":
        "export const definePluginSettings = definitions => ({ definitions, store: {} });\n"
        + "export const Settings = { plugins: {} };\n",
    // Asked for any name, it answers with that name, so a definition's kind
    // reads as "COMPONENT" or "STRING" rather than as a number.
    "@utils/types":
        "export const OptionType = new Proxy({}, { get: (_, name) => name });\n"
};

await esbuild.build({
    entryPoints: [join(PLUGIN, "settings.ts")],
    outfile: join(out, "settings.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    plugins: [{
        name: "stubs",
        setup(build) {
            const fake = /^(@|\.\/ui\/)/;
            build.onResolve({ filter: fake }, args => ({ path: args.path, namespace: "stub" }));
            build.onLoad({ filter: /.*/, namespace: "stub" }, args => ({
                contents: STUBS[args.path]
                    ?? "export default new Proxy({}, { get: () => () => null });\n"
                    + "export const KeepHelp = () => null;\nexport const LearnPanel = () => null;\n"
                    + "export const LogsPanel = () => null;\nexport const Providers = () => null;\n"
                    + "export const UpdatePanel = () => null;\nexport const sectionTitle = () => () => null;\n",
                loader: "js"
            }));
        }
    }]
});

await esbuild.build({
    entryPoints: [join(PLUGIN, "web/storage.ts")],
    outfile: join(out, "storage.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent"
});

const { settings } = await import(join(out, "settings.mjs"));
const { DEFAULTS } = await import(join(out, "storage.mjs"));

await writeFile(join(out, "ok"), "");

let pass = 0;
let fail = 0;

const check = (name, ok, detail) => {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name);
    if (!ok && detail) console.log("      ", detail);
};

for (const [name, definition] of Object.entries(settings.definitions)) {
    // A component is interface rather than a setting; there is nothing to keep.
    if (definition.type === "COMPONENT") continue;

    if (name in DESKTOP_ONLY) {
        check(`${name} is left out of the browser on purpose`,
            !(name in DEFAULTS),
            `it is in web/storage.ts after all, though DESKTOP_ONLY says: ${DESKTOP_ONLY[name]}`);
        continue;
    }

    if (!(name in DEFAULTS)) {
        check(`${name} has a default in the browser too`, false,
            "add it to DEFAULTS in web/storage.ts, or say in DESKTOP_ONLY why the browser does without it");
        continue;
    }

    check(`${name} defaults to the same thing in both`,
        DEFAULTS[name] === definition.default,
        `settings.ts ${JSON.stringify(definition.default)}, web/storage.ts ${JSON.stringify(DEFAULTS[name])}`);
}

for (const name of Object.keys(DEFAULTS)) {
    if (name in settings.definitions) continue;
    check(`${name} is still a setting`, false, "it is in web/storage.ts but no longer in settings.ts");
}

await rm(out, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
