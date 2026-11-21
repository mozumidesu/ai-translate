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

import { Bridge } from "./bridge";
import { config, set } from "./host";
import { t } from "./locales";
import { record, withoutKey } from "./log";
import { cleanAddress, cleanKey, KeyVerdict, keyVerdict } from "./providers";

export const PROVIDERS = ["groq", "gemini", "glm", "anthropic", "openai"];

/** A backup slot that is there but not in use. Only a backup may be one. */
export const NONE = "none";

/** "Groq (recommended)" is advice for the first choice, not part of the name. */
const withoutAdvice = (label: string) => label.replace(/\s*\(.*\)\s*$/, "");

/** How a provider reads in the list. A backup leaves the advice out. */
export const providerLabel = (id: string, first = false) =>
    first ? t(`provider.${id}`) : withoutAdvice(t(`provider.${id}`));

/**
 * What a provider is called inside a sentence: "No API key set for Groq". The
 * generic one is not named by its label, which begins with "Any", but by what
 * it speaks, the way the others are named by who they are.
 */
export const providerName = (id: string) =>
    id === "openai" ? "OpenAI-compatible" : withoutAdvice(t(`provider.${id}`));

/** The line over a slot's key: "API key — Groq", "API key — any OpenAI-compatible". */
export const keyHeading = (id: string) =>
    `${t("apiKey.name")} — ${id === "openai" ? t("provider.openaiInline") : providerName(id)}`;

/** One to ask and four behind it. Past that a message would wait all day. */
export const MOST_SLOTS = 5;

/**
 * Whether the backup at `at` of `count` slots may be taken away. The one backup
 * the page always shows is switched off by choosing None, not removed: a minus
 * there would only take the whole block away, and with it the way to ask for a
 * backup. From two backups on, the extra ones are the ones to remove.
 */
export const canRemove = (count: number, at: number) => at > 0 && count > 2;

export interface Slot {
    /** Stable across reordering, because the rate limits are counted by it. */
    id: string;
    provider: string;
    keys: Record<string, string>;
    models: Record<string, string>;
    /** An OpenAI-compatible provider has an address, and it is this slot's own. */
    baseUrls?: Record<string, string>;
}

/** Cleaned where read as well as where saved, so a key saved before the cleaning is cleaned too. */
export const keyOf = (slot: Slot) => cleanKey(slot.keys?.[slot.provider]);
export const modelOf = (slot: Slot) => slot.models?.[slot.provider] ?? "";
export const baseUrlOf = (slot: Slot) => cleanAddress(slot.baseUrls?.[slot.provider]);

const cleaned = <T>(values: Record<string, T> | undefined, clean: (value: T) => string) =>
    values && Object.fromEntries(Object.entries(values).map(([id, value]) => [id, clean(value)]));

/** Every key and address of a slot, as saved: what a paste brought along is gone. */
export const cleanSlot = (slot: Slot): Slot => ({
    ...slot,
    keys: cleaned(slot.keys, cleanKey) ?? {},
    ...(slot.baseUrls ? { baseUrls: cleaned(slot.baseUrls, cleanAddress) } : {})
});

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
    const made = (provider: string): Slot => {
        const key = String(c[`${provider}ApiKey`] ?? "");

        return {
            id: provider,
            provider,
            keys: { [provider]: key },
            // The model these carried was a default rather than a choice, and
            // with no key it was never checked against anything. Showing it
            // would say the provider is set up when nothing has been asked.
            models: { [provider]: key ? String(c[`${provider}Model`] ?? "") : "" },
            baseUrls: { [provider]: String(c.baseUrl ?? "") }
        };
    };

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

/** Saves the slots cleaned, and hands them back so the page shows what was saved. */
export function writeSlots(slots: Slot[]) {
    const clean = slots.slice(0, MOST_SLOTS).map(cleanSlot);
    set("providerSlots", JSON.stringify(clean));
    return clean;
}

/** How a verdict reads in the log. */
const SAID: Record<KeyVerdict, string> = {
    ok: "key accepted",
    bad: "key refused",
    blocked: "network or region refused, key not checked",
    unknown: "nothing said about the key"
};

export interface KeyCheck {
    verdict: KeyVerdict;
    status: number;
    models: string[];
}

/**
 * Asks the provider for its models, which is also its verdict on the key, and
 * writes both down: a key that "did not take" is otherwise reported from
 * memory, without the one line that says why.
 */
export async function checkKey(slot: Slot): Promise<KeyCheck> {
    const apiKey = keyOf(slot);
    let status = -1;
    let models: string[] = [];
    let data = "";

    try {
        ({ status, models, data } = await Bridge.listAiModels(JSON.stringify({
            provider: slot.provider, apiKey, baseUrl: baseUrlOf(slot)
        })));
    } catch (e) {
        // An answer that never arrives is a failure like any other.
        data = String(e);
    }

    const verdict = keyVerdict(status, data);
    record(
        verdict === "ok" ? "info" : "error",
        "key check",
        `${slot.provider} answered ${status}: ${SAID[verdict]}${verdict === "ok" ? `, ${models.length} models` : ""}`,
        verdict === "ok" ? undefined : withoutKey(data, apiKey)
    );

    return { verdict, status, models };
}
