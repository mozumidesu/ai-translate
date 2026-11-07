/*
 * AI Translate — where a request goes.
 *
 * On the desktop it is handed to Electron's main process (native.ts), which
 * has no CORS to work around and never sees the renderer. In a browser there
 * is no such process, so the very same provider code runs here and net.ts
 * finds the way out. The rest of the plugin asks through this file and does
 * not need to know which of the two it got.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { newestBuild, userscriptUrl } from "./builds";
import { pickNet } from "./net";
import { listModels, postFeedback, sendChat } from "./providers";

/**
 * native.ts as the renderer sees it across Vencord's bridge: the same
 * functions without the Electron event that only the main process is handed.
 * Derived from native.ts itself, so the two cannot drift apart.
 */
type Called<F> = F extends (event: any, ...rest: infer A) => infer R ? (...args: A) => R : never;

type Desktop = { [K in keyof typeof import("./native")]: Called<(typeof import("./native"))[K]> };

/**
 * Vencord builds this bridge out of native.ts under the plugin's own name. In
 * its web builds the object exists but is empty, and in a standalone
 * userscript there is no VencordNative at all, so both are asked rather than
 * assumed, and each function separately: a host may grow one and not another.
 */
function desktop(): Partial<Desktop> {
    try {
        return (VencordNative?.pluginHelpers?.["AI Translate"] as Desktop) ?? {};
    } catch {
        return {};
    }
}

/**
 * Which build a copy running in a browser is. A desktop copy reads that off
 * the disk; here nothing can, so the build robot writes the name into the line
 * below before it builds (build/github.sh). Left as it stands, this is a copy
 * somebody built themselves.
 */
const BROWSER_BUILD = "web";

/**
 * Which channel that build came from, written into the line below by the same
 * robot. Left as it stands, nobody published this copy. Typed as a string
 * rather than left to its literal, because the robot's word goes there and the
 * comparisons below would otherwise read as unreachable.
 */
const BROWSER_CHANNEL: string = "dev";

/**
 * How that copy names itself in a support report, with the kind of browser
 * build it is in front, since the three are kept apart in the store and in the
 * userscript manager. The flags are Vencord's, and a build of our own will not
 * have them, so neither is assumed to exist.
 */
function browserBuild() {
    const userscript = typeof IS_USERSCRIPT !== "undefined" && IS_USERSCRIPT;
    const extension = typeof IS_EXTENSION !== "undefined" && IS_EXTENSION;

    const testing = BROWSER_CHANNEL === "testing" ? " testing" : "";

    if (userscript) return `userscript ${BROWSER_BUILD}${testing}`;
    if (extension) return `extension ${BROWSER_BUILD}${testing}`;
    return `${BROWSER_BUILD}${testing}`;
}

/** Whether this copy is the desktop one, with a main process behind it. */
export const onDesktop = () => desktop().makeAiTranslateRequest !== undefined;

/**
 * Whether this copy is a userscript the build robot made: the one kind of
 * browser copy with something to be updated from. A copy somebody built
 * themselves was never published, and an extension is kept by its store.
 */
export const isPublishedUserscript = () =>
    typeof IS_USERSCRIPT !== "undefined" && IS_USERSCRIPT
    && (BROWSER_CHANNEL === "release" || BROWSER_CHANNEL === "testing");

export const Bridge = {
    makeAiTranslateRequest(payload: string) {
        const native = desktop().makeAiTranslateRequest;
        return native ? native(payload) : sendChat(pickNet(), payload);
    },

    listAiModels(payload: string) {
        const native = desktop().listAiModels;
        return native ? native(payload) : listModels(pickNet(), payload);
    },

    sendAiTranslateFeedback(payload: string) {
        const native = desktop().sendAiTranslateFeedback;
        if (native) return native(payload);

        const { endpoint, body } = JSON.parse(payload) as { endpoint: string; body: object; };
        return postFeedback(pickNet(), endpoint, { ...body, build: browserBuild() });
    },

    /**
     * Updating is the host's business. A copy on a disk is updated by
     * native.ts. A userscript is updated by its userscript manager, from the
     * address in its own header and on the manager's own schedule, so all that
     * can be done from here is to say whether it has happened yet. A copy
     * built from source is kept current by whoever built it, and answers that
     * it is one.
     */
    async checkAiTranslateUpdate(channel?: string) {
        const native = desktop().checkAiTranslateUpdate;
        if (native) return native(channel);
        if (!isPublishedUserscript()) return { state: "dev" as const, details: "" };

        try {
            const newest = await newestBuild(pickNet(), channel);

            // The other channel is another script even when it carries the same build.
            const elsewhere = (channel === "testing" ? "testing" : "release") !== BROWSER_CHANNEL;

            return { state: newest !== BROWSER_BUILD || elsewhere ? "available" as const : "current" as const, details: "" };
        } catch (e) {
            return { state: "offline" as const, details: String(e) };
        }
    },

    /**
     * For a userscript, handing the file to the userscript manager: it takes
     * over a link to a .user.js and offers to install it, which for a script it
     * already has is an update, and for the other channel's is a switch. It
     * has to be called straight from a click, or a pop-up blocker stops the new
     * tab, and then the page itself goes there: the click asked for it.
     */
    installAiTranslateUpdate(channel?: string) {
        const native = desktop().installAiTranslateUpdate;
        if (native) return native(channel);
        if (!isPublishedUserscript()) return Promise.resolve({ ok: false, details: "not an installed copy" });

        const url = userscriptUrl(channel);
        if (!window.open(url, "_blank")) window.location.assign(url);
        return Promise.resolve({ ok: true, details: "" });
    },

    /**
     * What this copy is, for the one line in the interface that says so. A
     * desktop copy reads it off the disk; a browser copy was stamped at build
     * time, and a copy somebody built themselves has nothing to show.
     */
    aiTranslateBuild(): Promise<{ build: string; channel: string; }> {
        const native = desktop().aiTranslateBuild;
        if (native) return native();

        const published = BROWSER_CHANNEL === "release" || BROWSER_CHANNEL === "testing";
        return Promise.resolve({
            build: published ? BROWSER_BUILD : "",
            channel: published ? BROWSER_CHANNEL : ""
        });
    }
};
