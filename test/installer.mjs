/*
 * AI Translate — the Windows install command.
 *
 * install/install.ps1 runs through irm | iex on stock Windows, and until
 * 22 November no line of it had ever been parsed or run before it shipped.
 * This hands it to real PowerShell: parsed, held to Windows PowerShell 5.1's
 * syntax, and its functions run against a fake %LOCALAPPDATA% beside a fake
 * of Vencord's installer: which Discords are listed, which app-* is read,
 * which patched app.asar loads from which folder, and that a folder a Discord
 * still loads from is never deleted. What a real Windows, a real Discord and
 * Windows PowerShell 5.1 itself do is not checked here.
 *
 * Run it from the plugin folder:  node test/installer.mjs
 * It needs pwsh, PowerShell 7 for Linux, macOS or Windows; GitHub's runners
 * have it. Point PWSH at one that is not on the PATH.
 */

import { spawnSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const here = new URL(".", import.meta.url).pathname;
const pwsh = process.env.PWSH || "pwsh";
const root = mkdtempSync(join(tmpdir(), "ait-installer-"));

const run = spawnSync(pwsh, [
    "-NoProfile", "-NonInteractive", "-File", join(here, "installer", "cases.ps1"),
    "-ScriptPath", join(here, "..", "install", "install.ps1"), "-Root", root,
], { stdio: "inherit" });
rmSync(root, { recursive: true, force: true });

// No pwsh is a failure, not a pass: a check that did not run checked nothing.
if (run.error) {
    console.error(`No PowerShell at "${pwsh}". Install pwsh, or point PWSH at it.`);
    process.exit(2);
}
process.exit(run.status ?? 1);
