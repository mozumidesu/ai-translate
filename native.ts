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

import { IpcMainInvokeEvent, session } from "electron";
import { readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

import { channelRoot } from "./core/builds";
import { failureOf, Net, netOf } from "./core/net";
import { listModels, postFeedback, sendChat } from "./core/providers";
import { VERSION } from "./core/version";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

let chromium: Fetcher | undefined;
let own: ReturnType<typeof session.fromPartition> | undefined;

/**
 * The way out Discord's own traffic takes: Chromium's network stack, which
 * follows the system proxy, a PAC file, --proxy-server and Chromium's DNS.
 * The global fetch here is Node's and follows none of them, so behind a VPN
 * running as a system proxy these requests left from the real address. The
 * session is the plugin's own and kept in memory: Discord's cookies, cache and
 * the hooks set on its default session stay out of it, while the proxy, which
 * Chromium keeps for the whole app, is the same. No cookies, as with Node's.
 */
function fetcher(): Fetcher {
    if (chromium) return chromium;

    try {
        const ses = session.fromPartition("ai-translate");
        // Electron 25 and later.
        if (typeof ses.fetch === "function") {
            own = ses;
            return chromium = (url, init) => ses.fetch(url, { ...init, credentials: "omit" });
        }
    } catch {
        // No session before the app is ready.
    }

    return (url, init) => fetch(url, init);
}

/** A proxy on this computer is named; one elsewhere only said to be, since a log is pasted in public. */
const hideRemote = (route: string) => route.replace(/\b([A-Z0-9]+) +(\[[^\]]*\]|[^\s:;]+):(\d+)/g, (all, scheme, host, port) =>
    /^(?:127\.|localhost$|\[::1\]$)/i.test(host) ? all : `${scheme} remote:${port}`);

/**
 * Which way a request that failed went, as Chromium resolves it for that
 * address: "DIRECT", or the proxy it took. Without it a 403 from a provider
 * could not say whether the request went through the VPN or round it.
 */
async function routeOf(url: string) {
    if (!own) return "Node, no proxy";

    try {
        return `Chromium, ${hideRemote(await own.resolveProxy(url))}`;
    } catch {
        return "Chromium";
    }
}

const send = netOf((url, init) => fetcher()(url, init));

const net: Net = async request => {
    const res = await send(request);
    return res.status >= 200 && res.status < 300 ? res : { ...res, route: await routeOf(request.url) };
};

export async function makeAiTranslateRequest(_: IpcMainInvokeEvent, payload: string) {
    return sendChat(net, payload);
}

/** Model ids a provider currently offers, so nobody has to type one by hand. */
export async function listAiModels(_: IpcMainInvokeEvent, payload: string) {
    return listModels(net, payload);
}

/** Posts to the relay; only the relay knows the Discord webhook behind it. */
export async function sendAiTranslateFeedback(_: IpcMainInvokeEvent, payload: string) {
    const { endpoint, body } = JSON.parse(payload) as { endpoint: string; body: object; };

    // Which build the report came from, so it can be checked against that
    // exact version. The form does not know it; this process does.
    // The plugin's version goes first and the build follows in brackets, the
    // same from every copy (browserBuild in core/bridge.ts writes it for a
    // browser). A report from a testing build says so: the version number
    // alone cannot, because it is the same one the last release carries.
    const info = installedInfo();
    const which = info ? info.channel === "testing" ? `${info.build} testing` : info.build : "dev";

    return postFeedback(net, endpoint, { ...body, build: `${VERSION} (${which})` });
}

// --- updates ---
//
// An installed copy runs a ready-made build: Vencord with this plugin inside,
// made by the build robot on GitHub (build/github.sh) whenever Vencord or a
// release of the plugin changes. Updating is swapping those files for newer
// ones; nothing is ever built on the user's computer.

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
    /** Which channel it came from. Copies installed before there were two carry none. */
    channel?: string;
    vencord?: string;
    plugin?: string;
    date?: string;
}

function installedInfo(): BuildInfo | null {
    for (const path of [BUILD_INFO, OLD_BUILD_INFO]) {
        try {
            const info = JSON.parse(readFileSync(path, "utf8")) as BuildInfo;
            if (info?.build) return info;
        } catch {
            // Not there, or not readable: try the other name.
        }
    }

    return null;
}

const installedBuild = () => installedInfo()?.build ?? null;

/** What this copy is, for the version line in the settings. */
export async function aiTranslateBuild(_: IpcMainInvokeEvent) {
    const info = installedInfo();
    return { build: info?.build ?? "", channel: info ? info.channel ?? "release" : "" };
}

async function latestBuild(channel?: string): Promise<BuildInfo> {
    const res = await fetcher()(`${channelRoot(channel)}/build.json`, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const info = JSON.parse(await res.text()) as BuildInfo;
    if (!info?.build) throw new Error("no build named");
    return info;
}

export async function checkAiTranslateUpdate(_: IpcMainInvokeEvent, channel?: string) {
    // A copy built from source, the developer's own among them, carries no
    // build info: whoever builds it keeps it up to date, not this.
    const installed = installedBuild();
    if (!installed) return { state: "dev" as const, details: "" };

    try {
        // Switching channels is an update like any other: the build the other
        // channel hands out is a different one, so there is something to install.
        const { build } = await latestBuild(channel);
        return { state: build !== installed ? "available" as const : "current" as const, details: "" };
    } catch (e) {
        return { state: "offline" as const, details: failureOf(e) };
    }
}

/** Downloads the latest build and puts it where the running one is. */
export async function installAiTranslateUpdate(_: IpcMainInvokeEvent, channel?: string) {
    if (!installedBuild()) return { ok: false, details: "not an installed copy" };

    try {
        const info = await latestBuild(channel);

        // Everything arrives before anything is replaced: a dropped
        // connection leaves the old build whole, not half of each.
        const files = await Promise.all(BUILD_FILES.map(async name => {
            const res = await fetcher()(`${channelRoot(channel)}/${encodeURIComponent(info.build)}/${name}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);

            const data = Buffer.from(await res.arrayBuffer());
            if (!data.length) throw new Error(`${name} came back empty`);
            return [name, data] as const;
        }));

        for (const [name, data] of files) writeFileSync(join(DIST, `${name}.new`), data);
        for (const [name] of files) renameSync(join(DIST, `${name}.new`), join(DIST, name));

        // Last, so an interrupted update is simply offered again. The channel
        // written down is the one these files were taken from, whatever the
        // published file says of itself.
        writeFileSync(BUILD_INFO, JSON.stringify({ ...info, channel: channel === "testing" ? "testing" : "release" }));

        // A copy installed before the rename left its own; one name is enough.
        try {
            unlinkSync(OLD_BUILD_INFO);
        } catch {
            // It was not there, which is the normal case.
        }

        return { ok: true, details: "" };
    } catch (e) {
        return { ok: false, details: failureOf(e) };
    }
}
