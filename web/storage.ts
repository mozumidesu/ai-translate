/*
 * AI Translate — settings for the browser version.
 *
 * The userscript manager keeps them, which survives both a reload of Discord
 * and an update of the script itself. Everything lives in one record under
 * one key, so a setting read by name has exactly the shape the rest of the
 * plugin already expects.
 *
 * The defaults below mirror settings.ts, the Vencord settings page. They are
 * written out rather than imported because that file is the page itself,
 * Vencord and all; a test compares the two and fails if they drift apart.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Config } from "../host";

declare const GM_getValue: (<T>(name: string, fallback: T) => T) | undefined;
declare const GM_setValue: ((name: string, value: unknown) => void) | undefined;

const KEY = "aiTranslateSettings";

export const DEFAULTS: Config = {
    locale: "auto",
    provider: "groq",
    geminiApiKey: "",
    groqApiKey: "",
    anthropicApiKey: "",
    glmApiKey: "",
    openaiApiKey: "",
    geminiModel: "gemini-3.8-flash",
    groqModel: "openai/gpt-oss-120b",
    anthropicModel: "",
    glmModel: "glm-4.5-flash",
    openaiModel: "",
    baseUrl: "",
    fallbackProvider: "none",
    sentLanguage: "English",
    receivedLanguage: "English",
    thinkingLevel: "low",
    mode: "perChannel",
    enabledChannels: "",
    onError: "hold",
    gender: "unset",
    explain: true,
    useContext: true,
    showOriginal: false,
    formality: "match",
    glossary: "",
    extraInstructions: ""
};

/**
 * Read once into memory. Every read of a setting goes through the core many
 * times per translation, and asking the userscript manager each time would be
 * both slow and pointless: nothing changes it but this file.
 */
let held: Config | undefined;

function stored(): Config {
    if (held) return held;

    let saved: Partial<Config> = {};
    try {
        saved = (typeof GM_getValue === "function" ? GM_getValue<Partial<Config>>(KEY, {}) : {}) ?? {};
    } catch {
        // A manager without storage, or storage refused: defaults it is.
    }

    // Spread in this order so a setting added in a later version appears with
    // its default rather than as undefined.
    held = { ...DEFAULTS, ...saved };
    return held;
}

export const settings = () => stored();

export function save(name: string, value: unknown) {
    const all = stored() as Record<string, unknown>;
    all[name] = value;

    try {
        GM_setValue?.(KEY, all);
    } catch {
        // Nothing to do about it; the change still holds for this session.
    }
}

/** Everything at once, for the settings panel's "start over" and for tests. */
export function replace(all: Partial<Config>) {
    held = { ...DEFAULTS, ...all };
    try {
        GM_setValue?.(KEY, held);
    } catch {
        // As above.
    }
}
