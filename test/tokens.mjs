/*
 * Token counts for the two scripts that need them, from the Rust tool in
 * tools/ rather than gpt-tokenizer in ~/tools. Same tokenizer, o200k, and the
 * tool carries its own tables, so counting needs nothing beside the project.
 *
 * Build it once with  cargo build --release  in tools/, or say where it is
 * with TOKENS=/path/to/tools.
 */

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// fileURLToPath rather than the URL's pathname, which on Windows keeps a
// leading slash in front of the drive letter.
const here = fileURLToPath(new URL(".", import.meta.url));
const tools = join(here, "..", "tools", "target");

const ADVICE =
    "Build it with `cargo build --release` in tools/, or point at it with TOKENS=...";

function findCounter() {
    if (process.env.TOKENS) return process.env.TOKENS;

    const built = [
        join(tools, "release", "tools"),
        join(tools, "release", "tools.exe"),
        join(tools, "x86_64-pc-windows-msvc", "release", "tools.exe"),
        join(tools, "debug", "tools"),
        join(tools, "debug", "tools.exe")
    ];

    for (const path of built) if (existsSync(path)) return path;

    throw new Error(`The token counter is not built. ${ADVICE}`);
}

const counter = findCounter();

function ask(options, input) {
    let said;
    try {
        said = execFileSync(counter, ["tokens", ...options], { input, maxBuffer: 1 << 28 });
    } catch (e) {
        if (e.code === "ENOENT") throw new Error(`No token counter at ${counter}. ${ADVICE}`);
        throw e;
    }
    return said.toString().trimEnd().split("\n").map(Number);
}

// What one text costs, counted whole, which is what a request really carries.
export const tokens = text => ask([], text)[0];

// One count per line, to put against the lines they came from. These do not
// add up to the whole: a blank line merges with the newline before it.
export const perLine = text => ask(["--lines"], text);

// Several texts in one go, so the tables are loaded once.
export const perText = texts => ask(["--each"], texts.join("\0"));
