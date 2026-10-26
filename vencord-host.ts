/*
 * AI Translate — Vencord as the host.
 *
 * Answers what host.ts asks for out of Vencord: its settings store, its
 * message store, its current user and its toasts. Imported for its own sake
 * before anything else in the plugin, so that whatever loads next already has
 * a host to ask.
 *
 * Reads the settings store directly rather than importing the plugin's own
 * settings module: that one imports the whole settings page with it, and this
 * has to be ready before any of that.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { MessageStore, showToast, Toasts, UserStore } from "@webpack/common";

import { Config, Host, Said, useHost } from "./core/host";

/**
 * Vencord's own numeric toast type. The plugin passes the kind around as a
 * word, and handing that word to showToast draws a toast with nothing in it.
 * Vencord once dropped Toasts.Type from under the plugin, so the numbers it
 * has always used stand behind it.
 */
function toastType(kind: "message" | "failure") {
    const plain = kind === "failure" ? 2 : 0;

    try {
        return (Toasts as any)?.Type?.[kind === "failure" ? "FAILURE" : "MESSAGE"] ?? plain;
    } catch {
        return plain;
    }
}

export const vencordHost: Host = {
    config: () => ((Settings.plugins as any)?.["AI Translate"] ?? {}) as Config,

    set(name: string, value: unknown) {
        (Settings.plugins as any)["AI Translate"][name] = value;
    },

    recent(channelId: string): Said[] {
        try {
            // The message store's shape is not a stable API, and context is a
            // bonus rather than a must, so a change there costs the context
            // and nothing else.
            const all = (MessageStore as any).getMessages(channelId)?.toArray?.() ?? [];

            return all
                .filter((m: any) => m?.content)
                .map((m: any) => ({
                    id: String(m.id),
                    authorId: m.author?.id,
                    authorName: m.author?.globalName || m.author?.username,
                    content: String(m.content)
                }));
        } catch {
            return [];
        }
    },

    meId: () => UserStore.getCurrentUser()?.id,

    notice(text: string, kind: "message" | "failure") {
        try {
            showToast(text, toastType(kind));
        } catch (e) {
            // Vencord once dropped Toasts.Type from under the plugin, and the
            // throw that followed escaped the error handler before it could
            // hold a message back. A notice is never worth that.
            console.error("[AI Translate]", text, e);
        }
    }
};

useHost(vencordHost);
