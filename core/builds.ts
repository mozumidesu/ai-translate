/*
 * AI Translate — where the builds are handed out.
 *
 * The one address the build robot publishes on, the two channels on it, and
 * how to read what a channel is handing out. native.ts fetches the files of a
 * desktop copy from here, and a copy in a browser tab asks the same place
 * whether the userscript it runs is still the newest one.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Net, timeoutSignal } from "./net";

/** Where the build robot publishes (build/github.sh). */
export const BUILDS = "https://builds.zolatau.com";

/**
 * Released builds are handed out at the root; testing builds, which follow the
 * plugin's main branch, from a folder of their own. Anything that is not
 * "testing" is the released channel, so a settings value this version does not
 * know cannot send a copy somewhere that is not there.
 */
export const channelRoot = (channel?: string) => channel === "testing" ? `${BUILDS}/testing` : BUILDS;

/** The file a userscript manager installs, and keeps up to date from the same address. */
export const userscriptUrl = (channel?: string) => `${channelRoot(channel)}/ai-translate.user.js`;

/** The name of the build a channel is handing out now. Throws when that cannot be found out. */
export async function newestBuild(net: Net, channel?: string) {
    const res = await net({
        url: `${channelRoot(channel)}/build.json`,
        headers: { "Cache-Control": "no-cache" },
        // A userscript manager may be waiting for its owner to answer a question about this address.
        signal: timeoutSignal(30_000)
    });
    if (res.status !== 200) throw new Error(res.status === -1 ? res.data : `HTTP ${res.status}`);

    const build = JSON.parse(res.data)?.build;
    if (!build || typeof build !== "string") throw new Error("no build named");
    return build;
}
