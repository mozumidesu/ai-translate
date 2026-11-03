/*
 * AI Translate — do the plugin's types still agree with Vencord's?
 *
 * test/imports.mjs answers whether a name Vencord exports still exists. This
 * answers the other half: whether the values handed to it are still ones it
 * accepts. Vencord builds with esbuild, which strips types without reading
 * them, so neither the robot nor that test would ever notice. It is how
 * `tags: ["Chat", "Utility", "Translate"]` went unnoticed after Vencord made
 * its tags a closed list and "Translate" stopped being one of them.
 *
 * Run it from the plugin folder:  node test/types.mjs
 *   VENCORD=/path/to/vencord     a checkout to check against
 *   otherwise test/imports.mjs's shallow clone is reused if it is there
 *
 * It needs the TypeScript compiler and npm, for React's types.
 *
 * Errors Vencord's own build also carries are listed below and not counted:
 * its globals, its CSS imports, and one piece of inference in settings.ts that
 * predates this test. Anything else fails.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VC = process.env.VENCORD
    ? resolve(process.env.VENCORD)
    : join(tmpdir(), "ai-translate-vencord");

if (!existsSync(join(VC, "tsconfig.json"))) {
    console.error(`No Vencord checkout at ${VC}. Run test/imports.mjs first, or set VENCORD.`);
    process.exit(2);
}

// React's types, which Vencord has as a dependency and a bare checkout does
// not: without them every piece of JSX in the plugin is an error of its own.
const deps = join(tmpdir(), "ai-translate-types");
if (!existsSync(join(deps, "node_modules", "@types", "react"))) {
    mkdirSync(deps, { recursive: true });
    console.log("Installing React's types, once, into", deps);
    execFileSync("npm", ["install", "--no-save", "--no-audit", "--no-fund", "--prefix", deps,
        "@types/react", "@types/node"], { stdio: ["ignore", "pipe", "pipe"] });
}

const types = join(deps, "node_modules", "@types");

const config = join(deps, "tsconfig.check.json");
writeFileSync(config, JSON.stringify({
    compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        paths: {
            "@api/*": [`${VC}/src/api/*`],
            "@components/*": [`${VC}/src/components/*`],
            "@utils/*": [`${VC}/src/utils/*`],
            "@webpack/common": [`${VC}/src/webpack/common/index.ts`],
            "@webpack": [`${VC}/src/webpack/webpack.ts`],
            "@vencord/discord-types": [`${VC}/packages/discord-types/src/index.d.ts`],
            react: [`${types}/react`],
            "react/*": [`${types}/react/*`]
        }
    },
    include: [
        `${PLUGIN}/index.tsx`,
        `${PLUGIN}/settings.ts`,
        `${PLUGIN}/core/*.ts`,
        `${PLUGIN}/ui/*.tsx`
    ]
}, null, 2));

/**
 * What Vencord's own build carries too. Each is a thing its bundler supplies
 * and a bare tsc cannot: a global it defines, a stylesheet it loads, and the
 * settings object that describes itself through its own labels.
 */
const EXPECTED = [
    /Cannot find module or type declarations for side-effect import of '\.\/styles\.css'/,
    /Cannot find name 'Vencord(Native)?'/,
    /Cannot find name 'IS_[A-Z_]+'/,
    /Cannot find module '~plugins'/,
    /Cannot find module '\.\/native'/,
    /settings\.ts.*implicitly has (type|return type) 'any' because it (does not have|is referenced)/
];

let output = "";
try {
    execFileSync("npx", ["tsc", "-p", config], { stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
    output = String(e.stdout ?? "") + String(e.stderr ?? "");
}

// tsc prints paths relative to where it was run, so the plugin's own files
// come out as "index.tsx" and Vencord's as a path climbing out of here. Ours
// are therefore the ones that are not Vencord's, rather than the ones that
// look like ours: the first filter written here matched nothing at all.
const ours = output.split("\n")
    .filter(line => /error TS/.test(line))
    .filter(line => !line.includes(VC) && !/^\.\.\//.test(line.trim()))
    .filter(line => !EXPECTED.some(known => known.test(line)));

for (const line of ours) console.log("FAIL " + line.trim());

if (ours.length) {
    console.log(`\n${ours.length} type error(s) the plugin's own code is responsible for.`);
    process.exit(1);
}

console.log("PASS the plugin's types still agree with Vencord's");
