/*
 * AI Translate — builds the browser version into one userscript.
 *
 * Run from this folder, inside a Vencord checkout, where esbuild is already
 * installed:  node build.mjs [--version=0.1.123]
 *
 * The plugin's own code only: none of Vencord goes in, which is the whole
 * point of the browser version. Out comes the script and, beside it, its
 * metadata on its own, which is what a userscript manager reads when it
 * checks for a new version.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, isAbsolute, join } from "path";
import { fileURLToPath } from "url";

const esbuild = await import("esbuild");

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "dist");

const asked = process.argv.find(a => a.startsWith("--version="))?.slice("--version=".length);
// A version has to grow with every build for the update check to notice, and
// a dev build says so rather than pretending to be a release.
const version = asked ?? `0.0.${Math.floor(Date.now() / 1000)}-dev`;

let header = (await readFile(join(here, "meta.js"), "utf8")).replace("%version%", version);

// A build nobody published must not be updated from where the published one
// lives: the manager would quietly replace it with that one. It also takes a
// name of its own, so it sits beside the released script instead of over it.
if (!asked) {
    header = header
        .replace(/^\/\/ @(updateURL|downloadURL).*\n/gm, "")
        .replace("// @name            AI Translate", "// @name            AI Translate (dev)");
}

const built = await esbuild.build({
    entryPoints: [join(here, "user.ts")],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2022"],
    platform: "browser",
    legalComments: "none",
    banner: { js: header },
    outfile: join(out, "ai-translate.user.js"),
    logLevel: "info",
    metafile: true,
    plugins: [{
        name: "no outsiders",
        setup(build) {
            // Everything is the plugin's own. A bare import would mean
            // something from Vencord or from npm crept in.
            build.onResolve({ filter: /^[^./]/ }, args => {
                // The file the build starts from comes through here too, and
                // on Windows its path begins with a drive letter rather than
                // a slash, which looks exactly like a bare import. So does
                // any other full path. Neither is an import of anything.
                if (!args.importer || isAbsolute(args.path)) return undefined;

                throw new Error(`the browser build reached outside the plugin: ${args.path} (from ${args.importer})`);
            });
        }
    }]
});

await mkdir(out, { recursive: true });
await writeFile(join(out, "ai-translate.meta.js"), header);

const size = Object.values(built.metafile.outputs)[0]?.bytes ?? 0;
console.log(`AI Translate ${version} — ${Math.round(size / 1024)} KB`);
