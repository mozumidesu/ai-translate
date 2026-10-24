/*
 * AI Translate — provider requests from Electron's main process.
 *
 * No CORS here, and the API key stays out of the renderer. What each provider
 * wants is in providers.ts, which knows nothing about Electron, so the same
 * code also serves the browser version; this file is the desktop's end of it,
 * plus the updating, which only an installed copy on a disk can do.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

import { fetchNet } from "./net";
import { listModels, postFeedback, sendChat } from "./providers";

export async function makeAiTranslateRequest(_: IpcMainInvokeEvent, payload: string) {
    return sendChat(fetchNet, payload);
}

/** Model ids a provider currently offers, so nobody has to type one by hand. */
export async function listAiModels(_: IpcMainInvokeEvent, payload: string) {
    return listModels(fetchNet, payload);
}

/** Posts to the relay; only the relay knows the Discord webhook behind it. */
export async function sendAiTranslateFeedback(_: IpcMainInvokeEvent, payload: string) {
    const { endpoint, body } = JSON.parse(payload) as { endpoint: string; body: object; };

    // Which build the report came from, so it can be checked against that
    // exact version. The form does not know it; this process does.
    return postFeedback(fetchNet, endpoint, { ...body, build: installedBuild() ?? "dev" });
}

// --- updates ---
//
// An installed copy runs a ready-made build: Vencord with this plugin inside,
// made by the build robot on GitHub (build/github.sh) whenever Vencord or a
// release of the plugin changes. Updating is swapping those files for newer
// ones; nothing is ever built on the user's computer.

/** Where the build robot publishes. */
const BUILDS = "https://builds.zolatau.com";

/** The files Discord loads, named as Vencord's own updater names them. */
const BUILD_FILES = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];

/** Vencord runs from its dist folder, and this code is part of it. */
const DIST = __dirname;

/** Which build this is. The install command and every update write it. */
const BUILD_INFO = join(DIST, "build.json");

/** What that file was called before it was renamed: still read, never written. */
const OLD_BUILD_INFO = join(DIST, "ait-build.json");

interface BuildInfo {
    build: string;
    vencord?: string;
    plugin?: string;
    date?: string;
}

function installedBuild(): string | null {
    for (const path of [BUILD_INFO, OLD_BUILD_INFO]) {
        try {
            const build = JSON.parse(readFileSync(path, "utf8")).build;
            if (build) return build;
        } catch {
            // Not there, or not readable: try the other name.
        }
    }

    return null;
}

async function latestBuild(): Promise<BuildInfo> {
    const res = await fetch(`${BUILDS}/build.json`, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const info = JSON.parse(await res.text()) as BuildInfo;
    if (!info?.build) throw new Error("no build named");
    return info;
}

export async function checkAiTranslateUpdate(_: IpcMainInvokeEvent) {
    // A copy built from source, the developer's own among them, carries no
    // build info: whoever builds it keeps it up to date, not this.
    const installed = installedBuild();
    if (!installed) return { state: "dev" as const, details: "" };

    try {
        const { build } = await latestBuild();
        return { state: build !== installed ? "available" as const : "current" as const, details: "" };
    } catch (e) {
        return { state: "offline" as const, details: String(e) };
    }
}

/** Downloads the latest build and puts it where the running one is. */
export async function installAiTranslateUpdate(_: IpcMainInvokeEvent) {
    if (!installedBuild()) return { ok: false, details: "not an installed copy" };

    try {
        const info = await latestBuild();

        // Everything arrives before anything is replaced: a dropped
        // connection leaves the old build whole, not half of each.
        const files = await Promise.all(BUILD_FILES.map(async name => {
            const res = await fetch(`${BUILDS}/${encodeURIComponent(info.build)}/${name}`);
            if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);

            const data = Buffer.from(await res.arrayBuffer());
            if (!data.length) throw new Error(`${name} came back empty`);
            return [name, data] as const;
        }));

        for (const [name, data] of files) writeFileSync(join(DIST, `${name}.new`), data);
        for (const [name] of files) renameSync(join(DIST, `${name}.new`), join(DIST, name));

        // Last, so an interrupted update is simply offered again.
        writeFileSync(BUILD_INFO, JSON.stringify(info));

        // A copy installed before the rename left its own; one name is enough.
        try {
            unlinkSync(OLD_BUILD_INFO);
        } catch {
            // It was not there, which is the normal case.
        }

        return { ok: true, details: "" };
    } catch (e) {
        return { ok: false, details: String(e) };
    }
}
