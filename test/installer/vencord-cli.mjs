// A fake of Vencord's installer CLI for install.sh's test, written after the
// Go source of Vencord/Installer: cli.go, patcher.go, app_asar.go,
// find_discord_linux.go and find_discord_darwin.go.
//
//   vencord-cli.mjs --install|--uninstall --location <folder>   the CLI itself
//   vencord-cli.mjs write-asar <file> <patcher.js>              a patched app.asar
//   vencord-cli.mjs read-asar <file>                            the path it requires
//
// What it reads from the environment: FAKE_OS (Darwin or Linux), FAKE_LOG (a
// file each call is written to), FAKE_FAIL and FAKE_SILENT (colon-separated
// locations the call fails for, or says success for and does nothing).

import fs from "fs";
import path from "path";

const PACKAGE_JSON = '{\n\t"name": "discord",\n\t"main": "index.js"\n}';

// Go's json.Marshal of a string: \ and " escaped, < > & as < > &.
const goJson = s => JSON.stringify(s).replace(/[<>&\u2028\u2029]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

// WriteAppAsar: four int32s, the JSON header padded with "0" to four bytes,
// then index.js and package.json.
function asar(patcher) {
    const index = "require(" + goJson(patcher) + ")";
    const iLen = Buffer.byteLength(index);
    let header = `{"files":{"index.js":{"size":${iLen},"offset":"0"},"package.json":{"size":${Buffer.byteLength(PACKAGE_JSON)},"offset":"${iLen}"}}}`;
    const hLen = Buffer.byteLength(header);
    const aligned = (hLen + 3) & ~3;
    header += "0".repeat(aligned - hLen);
    const ints = Buffer.alloc(16);
    [4, aligned + 8, aligned + 4, hLen].forEach((n, i) => ints.writeInt32LE(n, i * 4));
    return Buffer.concat([ints, Buffer.from(header + index + PACKAGE_JSON)]);
}

function requireOf(file) {
    let raw;
    try { raw = fs.readFileSync(file, "latin1"); } catch { return ""; }
    // latin1 keeps every byte one character; the path is UTF-8, so read it back as bytes.
    const m = /require\(("(?:[^"\\]|\\.)*")\)/.exec(raw);
    return m ? JSON.parse(Buffer.from(m[1], "latin1").toString("utf8")) : "";
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "write-asar") { fs.writeFileSync(rest[0], asar(rest[1])); process.exit(0); }
if (mode === "read-asar") { process.stdout.write(requireOf(rest[0])); process.exit(0); }

const exists = p => fs.existsSync(p);
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const die = msg => { console.error("Failed! " + msg); process.exit(1); };

const location = rest[0] === "--location" ? rest[1] : undefined;
const dataDir = process.env.VENCORD_USER_DATA_DIR;
if (!["--install", "--uninstall"].includes(mode) || !location) die("bad call: " + process.argv.slice(2).join(" "));
if (!dataDir || process.env.VENCORD_DEV_INSTALL !== "1") die("VENCORD_USER_DATA_DIR and VENCORD_DEV_INSTALL=1 are what stops it downloading Vencord");
fs.appendFileSync(process.env.FAKE_LOG, `${mode} ${location}\n`);

const listed = name => (process.env[name] || "").split(":").includes(location);
if (listed("FAKE_FAIL")) die("patching " + location);
if (listed("FAKE_SILENT")) process.exit(0);

const darwin = process.env.FAKE_OS === "Darwin";

// ParseDiscord, then ParseDiscordNew: the resources folder it works on.
function resources(p) {
    if (darwin) {
        const r = path.join(p, "Contents/Resources");
        return exists(p) && exists(path.join(r, "app.asar")) ? r : null;
    }
    let q = p;
    if (p.includes("/flatpak/") && !p.includes("/current/active/files/")) {
        let name = path.basename(p).slice("com.discordapp.".length).toLowerCase();
        if (name !== "discord") name = name.slice(0, 7) + "-" + name.slice(7);
        q = path.join(p, "current/active/files", name);
    }
    const r = path.join(q, "resources");
    if (exists(path.join(r, "app.asar"))) return r;
    // The app-* folder whose resources path is greatest, byte by byte.
    let best = "";
    let entries = [];
    try { entries = fs.readdirSync(p).sort(); } catch { return null; }
    for (const name of entries) {
        if (!isDir(path.join(p, name)) || !name.startsWith("app-")) continue;
        const res = path.join(p, name, "resources");
        if (!exists(res)) continue;
        if (Buffer.compare(Buffer.from(res), Buffer.from(best)) > 0) best = res;
    }
    return best || null;
}

const res = resources(location);
if (!res) die(location + " is not a valid Discord install");
const app = path.join(res, "app.asar"), kept = path.join(res, "_app.asar");

// unpatchAppAsar: with no _app.asar to put back it fails, and changes nothing.
function unpatch() {
    if (!exists(kept)) die("no _app.asar in " + res);
    fs.unlinkSync(app);
    fs.renameSync(kept, app);
}

if (mode === "--uninstall") unpatch();
else {
    if (exists(kept)) unpatch();
    fs.renameSync(app, kept);
    fs.writeFileSync(app, asar(path.join(dataDir, "dist", "patcher.js")));
    // A Flatpak is given access to the files, which needs flatpak itself.
    if (location.includes("com.discordapp")) fs.appendFileSync(process.env.FAKE_LOG, `flatpak override ${location}\n`);
}
console.log("fake Vencord installer: " + mode.slice(2) + " " + location);
