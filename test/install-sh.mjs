/*
 * AI Translate — the macOS and Linux install command.
 *
 * install/install.sh runs through sh -c "$(curl ...)", and until 22 November
 * no line of it had been run before it shipped. This runs its functions, under
 * dash, bash and bash --posix (which is what a Mac's /bin/sh is: bash 3.2 in
 * POSIX mode), against a fake home beside a fake of Vencord's installer: which
 * Discords are listed, which app-* is read, which patched app.asar loads from
 * which folder, and that a folder a Discord still loads from is never deleted.
 * The home folder has Cyrillic, & and a space in its name, which Vencord's
 * installer writes into app.asar as &. What a real Mac, a real Discord, a
 * real Flatpak, sudo and a terminal do is not checked here, nor the arrow keys
 * of the menu.
 *
 * Run it from the plugin folder:  node test/install-sh.mjs
 * It needs dash and bash. SHELLS=bash,"bash --posix" runs fewer; INSTALL_SH=
 * points at another copy of the script, which is how a broken one is tried.
 */

import { spawnSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const here = new URL(".", import.meta.url).pathname;
const script = process.env.INSTALL_SH || join(here, "..", "install", "install.sh");
const shells = (process.env.SHELLS || "dash,bash,bash --posix").split(",").map(s => s.trim().split(/\s+/));
const root = mkdtempSync(join(tmpdir(), "ait-install-sh-"));

// The functions only: everything before the final case, which runs the menu.
// The places Vencord's installer looks in outside the home are absolute, so
// they are put under $SYS, which the test points into its own folder; each
// change is asserted, so a script that moves these lines fails here instead.
let text = readFileSync(script, "utf8");
const tail = '\ncase "${1:-}" in\n';
if (text.split(tail).length !== 2) throw new Error("install.sh no longer ends in the case this cuts at");
text = text.slice(0, text.indexOf(tail) + 1);
for (const [from, to] of [
    ["for dir in /usr/share /usr/lib64 /opt ", 'for dir in "$SYS"/usr/share "$SYS"/usr/lib64 "$SYS"/opt '],
    ["        /var/lib/flatpak/app ", '        "$SYS"/var/lib/flatpak/app '],
    ['case "$dir" in /var/*)', 'case "${dir#"$SYS"}" in /var/*)'],
    ['"/Applications/$1.app"', '"$SYS/Applications/$1.app"'],
]) {
    if (text.split(from).length !== 2) throw new Error(`install.sh no longer holds ${from.trim()}`);
    text = text.replace(from, () => to);
}
const funcs = join(root, "functions.sh");
writeFileSync(funcs, text);

// A locale where sort ignores punctuation, if there is one: the script must
// not depend on it, and a copy that does is caught only where there is one.
const locales = spawnSync("locale", ["-a"], { encoding: "utf8" }).stdout || "";
const lang = /^en_US\.utf-?8$/im.test(locales) ? "en_US.UTF-8" : "C.UTF-8";

const env = { ...process.env, NODE: process.execPath, LANG: lang, LC_ALL: lang };
for (const name of ["AIT_HOME", "AIT_CHANNEL", "SUDO_USER", "DOAS_USER"]) delete env[name];

console.log(`locale ${lang}`);
let pass = 0, fail = 0, missing = false;
for (const argv of shells) {
    const [cmd, ...flags] = argv;
    const probe = spawnSync(cmd, [...flags, "-c", "exit 0"]);
    if (probe.error) {
        console.error(`No ${cmd}. Install it, or leave it out with SHELLS=.`);
        missing = true;
        continue;
    }
    console.log(`\n=== ${argv.join(" ")} ===`);
    // A session of its own, so that /dev/tty is not there: the run must never
    // wait on the terminal it was started from.
    const run = spawnSync(cmd, [...flags, join(here, "installer", "cases.sh"), script, funcs, join(root, argv.join("-").replace(/\W/g, "_"))], {
        env: { ...env, AIT_SH: argv.join(" ") }, encoding: "utf8", detached: true, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 26,
    });
    process.stdout.write(run.stdout || "");
    const m = /(\d+) passed, (\d+) failed/.exec(run.stdout || "");
    if (m) { pass += +m[1]; fail += +m[2]; }
    else { fail++; console.log(`  FAIL ${argv.join(" ")} did not finish (exit ${run.status})`); }
}
rmSync(root, { recursive: true, force: true });

// A shell that is not there is a failure, not a pass: a check that did not run checked nothing.
if (missing) process.exit(2);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
