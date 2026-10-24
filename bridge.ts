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
 * How that copy names itself in a support report, with the kind of browser
 * build it is in front, since the three are kept apart in the store and in the
 * userscript manager. The flags are Vencord's, and a build of our own will not
 * have them, so neither is assumed to exist.
 */
function browserBuild() {
    const userscript = typeof IS_USERSCRIPT !== "undefined" && IS_USERSCRIPT;
    const extension = typeof IS_EXTENSION !== "undefined" && IS_EXTENSION;

    if (userscript) return `userscript ${BROWSER_BUILD}`;
    if (extension) return `extension ${BROWSER_BUILD}`;
    return BROWSER_BUILD;
}

/** Whether this copy is the desktop one, with a main process behind it. */
export const onDesktop = () => desktop().makeAiTranslateRequest !== undefined;

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
     * Updating is the host's business. A copy in a browser is kept current by
     * the userscript manager or by the extension store, exactly as a copy
     * built from source is kept current by whoever built it, so it answers the
     * same way that one does and offers nothing.
     */
    checkAiTranslateUpdate() {
        const native = desktop().checkAiTranslateUpdate;
        return native ? native() : Promise.resolve({ state: "dev" as const, details: "" });
    },

    installAiTranslateUpdate() {
        const native = desktop().installAiTranslateUpdate;
        return native ? native() : Promise.resolve({ ok: false, details: "not an installed copy" });
    }
};
