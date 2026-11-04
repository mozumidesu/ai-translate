/*
 * AI Translate — which providers this copy talks to, and in what order.
 *
 * One to ask and up to four to fall back on, each with its own key, its own
 * model and its own rate limits. The same provider may appear twice: two keys
 * from two accounts are two quotas, and nothing here ties them together.
 *
 * A key and a model are kept per provider inside the slot, so switching a
 * slot from one provider to another and back loses neither.
 *
 * Settings written before any of this existed are still read: a copy that has
 * never been through the new page answers from provider, fallbackProvider and
 * the old per-provider keys, which is also what the browser build and the
 * tests hand over.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config, set } from "./host";

export const PROVIDERS = ["groq", "gemini", "glm", "anthropic", "openai"];

/** A backup slot that is there but not in use. Only a backup may be one. */
export const NONE = "none";

/** One to ask and four behind it. Past that a message would wait all day. */
export const MOST_SLOTS = 5;

export interface Slot {
    /** Stable across reordering, because the rate limits are counted by it. */
    id: string;
    provider: string;
    keys: Record<string, string>;
    models: Record<string, string>;
    /** An OpenAI-compatible provider has an address, and it is this slot's own. */
    baseUrls?: Record<string, string>;
}

export const keyOf = (slot: Slot) => slot.keys?.[slot.provider] ?? "";
export const modelOf = (slot: Slot) => slot.models?.[slot.provider] ?? "";
export const baseUrlOf = (slot: Slot) => slot.baseUrls?.[slot.provider] ?? "";

/** Set up enough to be asked: something to send, and something to send it to. */
export const isReady = (slot: Slot) => !!keyOf(slot) && !!modelOf(slot);

/** Short, and only ever compared with itself. */
const newId = () => Math.random().toString(36).slice(2, 10);

export const emptySlot = (provider: string): Slot =>
    ({ id: newId(), provider, keys: {}, models: {} });

function asSlot(raw: any): Slot | null {
    if (!raw || typeof raw !== "object") return null;
    if (raw.provider !== NONE && !PROVIDERS.includes(raw.provider)) return null;

    return {
        id: typeof raw.id === "string" && raw.id ? raw.id : newId(),
        provider: raw.provider,
        keys: raw.keys && typeof raw.keys === "object" ? raw.keys : {},
        models: raw.models && typeof raw.models === "object" ? raw.models : {},
        baseUrls: raw.baseUrls && typeof raw.baseUrls === "object" ? raw.baseUrls : undefined
    };
}

/** What a copy from before the list looks like, read as a list of one or two. */
function fromOldSettings(): Slot[] {
    const c = config() as any;
    const made = (provider: string): Slot => ({
        id: provider,
        provider,
        keys: { [provider]: String(c[`${provider}ApiKey`] ?? "") },
        models: { [provider]: String(c[`${provider}Model`] ?? "") },
        baseUrls: { [provider]: String(c.baseUrl ?? "") }
    });

    const first = PROVIDERS.includes(c.provider) ? c.provider : PROVIDERS[0];
    const slots = [made(first)];

    // The page shows a backup from the start, with nothing chosen in it until
    // somebody chooses. An empty one costs nothing and says what is possible.
    const backup = c.fallbackProvider;
    slots.push(PROVIDERS.includes(backup) && backup !== first
        ? made(backup)
        : { id: "backup", provider: NONE, keys: {}, models: {} });

    return slots;
}

export function readSlots(): Slot[] {
    try {
        const raw = JSON.parse(String(config().providerSlots || "[]"));
        if (Array.isArray(raw)) {
            const slots = raw.map(asSlot).filter((s): s is Slot => s !== null);
            if (slots.length) return slots.slice(0, MOST_SLOTS);
        }
    } catch {
        // Written by a newer version, or by hand. The old fields still answer.
    }

    return fromOldSettings();
}

export function writeSlots(slots: Slot[]) {
    set("providerSlots", JSON.stringify(slots.slice(0, MOST_SLOTS)));
}
