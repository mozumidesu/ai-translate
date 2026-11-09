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
 * native.ts is read too, though nothing imports it: Vencord finds it by name.
 * core/bridge.ts derives the type of the desktop bridge from it, so a misspelt
 * member of the bridge, or a type error in native.ts, fails here.
 *
 * Run it from the plugin folder:  node test/types.mjs
 *   VENCORD=/path/to/vencord     a checkout to check against
 *   otherwise test/imports.mjs's shallow clone is reused if it is there
 *
 * It needs npm. The compiler and the types are installed once into a folder of
 * their own, the compiler at the version Vencord builds with. It does not ask
 * for a `tsc` it finds: on a machine with none (a CI runner) `npx tsc` fetches
 * an abandoned package of that name, which checks nothing, and this test once
 * took that silence for a pass.
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

// What Vencord has as dependencies and a bare checkout does not: React's
// types (without them every piece of JSX in the plugin is an error of its
// own), Node's, which native.ts is written against, and the compiler.
const deps = join(tmpdir(), "ai-translate-types");
const modules = join(deps, "node_modules");

// The compiler's version is the one Vencord's own pnpm catalog names.
const catalog = existsSync(join(VC, "pnpm-workspace.yaml")) ? readFileSync(join(VC, "pnpm-workspace.yaml"), "utf8") : "";
const wanted = /^\s*["']?typescript["']?\s*:\s*["']?([^"'\s#]+)/m.exec(catalog)?.[1] ?? "latest";

if (!["typescript", "@types/react", "@types/node"].every(name => existsSync(join(modules, name)))) {
    mkdirSync(deps, { recursive: true });
    console.log(`Installing TypeScript ${wanted} and the types, once, into`, deps);
    execFileSync("npm", ["install", "--no-save", "--no-audit", "--no-fund", "--prefix", deps,
        `typescript@${wanted}`, "@types/react", "@types/node"], { stdio: ["ignore", "pipe", "pipe"] });
}

const types = join(modules, "@types");
const manifest = JSON.parse(readFileSync(join(modules, "typescript", "package.json"), "utf8"));
const tsc = join(modules, "typescript", typeof manifest.bin === "string" ? manifest.bin : manifest.bin.tsc);
console.log("TypeScript", manifest.version);

// native.ts takes one thing from Electron, the event its functions are handed,
// and a bare checkout has no node_modules to find Electron in. If it ever takes
// more, this is where that is declared.
const electron = join(deps, "electron.d.ts");
writeFileSync(electron, 'declare module "electron" {\n    export interface IpcMainInvokeEvent {}\n}\n');

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
        // Named, because TypeScript 6 reads no @types package it is not told of.
        types: ["node"],
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
        `${PLUGIN}/native.ts`,
        `${PLUGIN}/core/*.ts`,
        `${PLUGIN}/ui/*.tsx`,
        electron
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
    /settings\.ts.*implicitly has (type|return type) 'any' because it (does not have|is referenced)/
];

let output = "";
let status = 0;
let failure = "";
try {
    // From the plugin folder, whichever the caller is in: the filter below tells
    // ours from Vencord's by the paths tsc prints, relative to where it ran.
    execFileSync(process.execPath, [tsc, "-p", config], { cwd: PLUGIN, stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
    status = e.status ?? 1;
    failure = e.message;
    output = String(e.stdout ?? "") + String(e.stderr ?? "");
}

// A compiler that finds fault says what, so one that fails with nothing of the
// kind to show did not run, and its silence is not a pass.
if (status && !/error TS\d+/.test(output)) {
    console.error("tsc did not run, so nothing was checked:\n" + (output.trim() || failure));
    process.exit(2);
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
