/*
 * AI Translate — do the plugin's Vencord imports still exist?
 *
 * The plugin is bundled by Vencord's own esbuild, which marks nothing as
 * external: a name Vencord has dropped fails there with "No matching export"
 * and stops the build robot. The other tests here bundle the core with the
 * Vencord paths marked external, so they cannot see that. This one resolves
 * every @webpack, @components, @utils, @api and @vencord import against a real
 * Vencord checkout, by Vencord's own tsconfig paths, and fails the same way
 * the robot would.
 *
 * Run it from the plugin folder:  node test/imports.mjs
 *   VENCORD=/path/to/vencord     a checkout to resolve against
 *   otherwise it clones a shallow, partial one into the system temp folder
 * It needs esbuild, exactly as test/prompts.mjs does.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const WHERE = [process.env.ESBUILD, "esbuild", `${process.env.TOOLS}/esbuild`, `${process.env.HOME}/tools/node_modules/esbuild`]
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

/** Only the folders the plugin's imports can reach, so the clone stays small. */
const NEEDED = ["src", "packages/discord-types"];

function vencordCheckout() {
    if (process.env.VENCORD) return resolve(process.env.VENCORD);

    const at = join(tmpdir(), "ai-translate-vencord");
    const git = (...args) => execFileSync("git", ["-C", at, ...args], { stdio: ["ignore", "pipe", "pipe"] });

    if (!existsSync(join(at, ".git"))) {
        mkdirSync(at, { recursive: true });
        console.log("Cloning Vencord to resolve against, into", at);
        execFileSync("git", ["clone", "--depth", "1", "--filter=blob:none", "--no-checkout",
            "https://github.com/Vendicated/Vencord", at], { stdio: ["ignore", "pipe", "pipe"] });
        git("sparse-checkout", "init", "--cone");
        git("sparse-checkout", "set", ...NEEDED);
    } else {
        git("fetch", "--depth", "1", "origin", "HEAD");
        git("reset", "--hard", "FETCH_HEAD");
    }
    git("checkout", "-q");

    return at;
}

const VC = vencordCheckout();
if (!existsSync(join(VC, "tsconfig.json"))) {
    console.error(`${VC} does not look like a Vencord checkout: no tsconfig.json.`);
    process.exit(2);
}

console.log("Vencord:", VC, "at", execFileSync("git", ["-C", VC, "describe", "--tags", "--always"]).toString().trim());

/**
 * tsconfig.json is JSON with comments and trailing commas. Read character by
 * character rather than with a regular expression: the file's own strings hold
 * things like "src/**\/*", which a comment-stripping pattern eats.
 */
function readTsconfig(path) {
    const raw = readFileSync(path, "utf-8");
    let out = "";

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '"') {
            const start = i++;
            while (i < raw.length && (raw[i] !== '"' || raw[i - 1] === "\\")) i++;
            out += raw.slice(start, i + 1);
            continue;
        }

        if (raw[i] === "/" && raw[i + 1] === "/") {
            while (i < raw.length && raw[i] !== "\n") i++;
            out += "\n";
            continue;
        }

        if (raw[i] === "/" && raw[i + 1] === "*") {
            i += 2;
            while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
            i++;
            continue;
        }

        out += raw[i];
    }

    return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

// Vencord's own path aliases, so this cannot drift from what it really builds.
const paths = readTsconfig(join(VC, "tsconfig.json")).compilerOptions?.paths ?? {};
const alias = Object.entries(paths).map(([from, [to]]) => [
    from.replace(/\/\*$/, ""),
    join(VC, to.replace(/^\.\//, "").replace(/\/\*$/, ""))
]);

// The workspace package, which tsconfig does not mention: its types live in
// src/, its enums in a folder of their own.
alias.unshift(["@vencord/discord-types/enums", join(VC, "packages/discord-types/enums")]);
alias.push(["@vencord/discord-types", join(VC, "packages/discord-types/src")]);

// Longest first, so @webpack/common wins over @webpack.
alias.sort((a, b) => b[0].length - a[0].length);

/** esbuild does not add extensions to what a plugin resolves, so do it here. */
function settle(base) {
    for (const path of [base, `${base}.tsx`, `${base}.ts`, `${base}.d.ts`, `${base}.jsx`, `${base}.js`,
        `${base}/index.tsx`, `${base}/index.ts`, `${base}/index.d.ts`, `${base}/index.js`]) {
        if (existsSync(path) && statSync(path).isFile()) return path;
    }

    return null;
}

const resolver = {
    name: "vencord-paths",
    setup(build) {
        build.onResolve({ filter: /.*/ }, ({ path }) => {
            if (path.startsWith(".") || path.startsWith("/")) return null;

            for (const [from, to] of alias) {
                if (path !== from && !path.startsWith(`${from}/`)) continue;

                const found = settle(to + path.slice(from.length));
                return found ? { path: found } : { errors: [{ text: `${path} resolves to nothing under ${VC}` }] };
            }

            // Anything from node_modules: not what is being checked here.
            return { path, external: true };
        });
    }
};

let result;
try {
    result = await esbuild.build({
        entryPoints: [join(PLUGIN, "index.tsx")],
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        jsx: "automatic",
        target: "esnext",
        tsconfig: join(VC, "tsconfig.json"),
        loader: { ".css": "empty", ".png": "empty", ".svg": "empty", ".html": "empty" },
        logLevel: "silent",
        logLimit: 0,
        plugins: [resolver]
    });
} catch (e) {
    result = { errors: e.errors ?? [], warnings: e.warnings ?? [] };
}

const missing = result.errors.filter(e => /No matching export/.test(e.text));
const other = result.errors.filter(e => !/No matching export/.test(e.text));

for (const e of missing) {
    const where = (e.location?.file ?? "").replace(/.*ai-translate\//, "");
    console.log(`FAIL ${where}:${e.location?.line} ${e.text}`);
}

// A build that cannot even resolve its way through Vencord never gets as far
// as checking the exports, so a clean run with these is not a clean run.
for (const e of other) console.log(`ERROR ${e.location?.file ?? "?"}:${e.location?.line ?? "?"} ${e.text}`);

if (!missing.length && !other.length) console.log("PASS every Vencord import the plugin makes still exists");

process.exit(missing.length || other.length ? 1 : 0);
