/*
 * AI Translate — settings and per-chat state.
 *
 * Labels are getters, not strings: Vencord reads them on every draw, so the
 * interface language switches without a restart.
 *
 * The page reads top to bottom in the order someone meets it: what to connect
 * to, when it should translate, how it should translate, what it looks like,
 * and the upkeep. Vencord draws the settings in the order they are written
 * here, so that order is the layout.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { FallbackNotice } from "./ui/FallbackNotice";
import { KeepHelp } from "./ui/KeepHelp";
import { LOCALES, t } from "./core/locales";
import { LogsPanel } from "./ui/Logs";
import { ModelPicker } from "./ui/ModelPicker";
import { sectionTitle } from "./ui/SectionTitle";
import { UpdatePanel } from "./ui/UpdatePanel";

/** The backup provider needs a key of its own, so two can be on screen. */
function apiKeyName(id: string) {
    const { provider, fallbackProvider } = settings.store;
    const two = fallbackProvider !== "none" && fallbackProvider !== provider;

    return two ? `${t("apiKey.name")} — ${bareProviderLabel(id)}` : t("apiKey.name");
}

const bareProviderLabel = (id: string) => t(`provider.${id}`).replace(/\s*\(.*\)\s*$/, "");

/** Shown for the provider in use and for the backup, never for the rest. */
const keyInUse = (store: any, id: string) => store.provider === id || store.fallbackProvider === id;

export const settings = definePluginSettings({
    // --- what it talks to ---

    connectionTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.connection")
    },

    provider: {
        type: OptionType.SELECT,
        get displayName() { return t("provider.name"); },
        get description() { return t("provider.desc"); },
        default: "groq",
        get options() {
            return [
                { label: t("provider.groq"), value: "groq", default: true },
                { label: t("provider.gemini"), value: "gemini" },
                { label: t("provider.glm"), value: "glm" },
                { label: t("provider.anthropic"), value: "anthropic" },
                { label: t("provider.openai"), value: "openai" }
            ];
        }
    },

    geminiApiKey: {
        type: OptionType.STRING,
        get displayName() { return apiKeyName("gemini"); },
        get description() { return t("apiKey.desc"); },
        default: ""
    },
    groqApiKey: {
        type: OptionType.STRING,
        get displayName() { return apiKeyName("groq"); },
        get description() { return t("apiKey.desc"); },
        default: ""
    },
    anthropicApiKey: {
        type: OptionType.STRING,
        get displayName() { return apiKeyName("anthropic"); },
        get description() { return t("apiKey.desc"); },
        default: ""
    },
    glmApiKey: {
        type: OptionType.STRING,
        get displayName() { return apiKeyName("glm"); },
        get description() { return t("apiKey.desc"); },
        default: ""
    },
    openaiApiKey: {
        type: OptionType.STRING,
        get displayName() { return apiKeyName("openai"); },
        get description() { return t("apiKey.desc"); },
        default: ""
    },

    // Chosen in the picker below, kept per provider so switching loses nothing.
    geminiModel: {
        type: OptionType.STRING,
        description: "internal: model chosen for gemini",
        default: "gemini-3.8-flash",
        hidden: true
    },
    groqModel: {
        type: OptionType.STRING,
        description: "internal: model chosen for groq",
        default: "openai/gpt-oss-120b",
        hidden: true
    },
    anthropicModel: {
        type: OptionType.STRING,
        description: "internal: model chosen for anthropic",
        default: "",
        hidden: true
    },
    glmModel: {
        type: OptionType.STRING,
        description: "internal: model chosen for glm",
        default: "glm-4.5-flash",
        hidden: true
    },
    openaiModel: {
        type: OptionType.STRING,
        description: "internal: model chosen for openai",
        default: "",
        hidden: true
    },

    modelPicker: {
        type: OptionType.COMPONENT,
        component: ModelPicker
    },

    baseUrl: {
        type: OptionType.STRING,
        get displayName() { return t("baseUrl.name"); },
        get description() { return t("baseUrl.desc"); },
        default: ""
    },

    thinkingLevel: {
        type: OptionType.SELECT,
        get displayName() { return t("thinking.name"); },
        get description() { return t("thinking.desc"); },
        default: "low",
        get options() {
            return [
                { label: t("thinking.low"), value: "low", default: true },
                { label: t("thinking.high"), value: "high" }
            ];
        }
    },

    fallbackProvider: {
        type: OptionType.SELECT,
        get displayName() { return t("fallback.name"); },
        get description() { return t("fallback.desc"); },
        default: "none",
        get options() {
            return [
                { label: t("fallback.none"), value: "none", default: true },
                { label: t("provider.groq").replace(/\s*\(.*\)\s*$/, ""), value: "groq" },
                { label: t("provider.gemini"), value: "gemini" },
                { label: t("provider.glm").replace(/\s*\(.*\)\s*$/, ""), value: "glm" },
                { label: t("provider.anthropic"), value: "anthropic" },
                { label: t("provider.openai"), value: "openai" }
            ];
        }
    },

    fallbackNotice: {
        type: OptionType.COMPONENT,
        component: FallbackNotice
    },

    // --- when it translates ---

    whenTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.when")
    },

    mode: {
        type: OptionType.SELECT,
        get displayName() { return t("mode.name"); },
        get description() { return t("mode.desc"); },
        default: "perChannel",
        get options() {
            return [
                { label: t("mode.perChannel"), value: "perChannel", default: true },
                { label: t("mode.always"), value: "always" }
            ];
        }
    },
    enabledChannels: {
        type: OptionType.STRING,
        description: "internal: ids of the chats where auto-translate is on",
        default: "",
        hidden: true
    },

    onError: {
        type: OptionType.SELECT,
        get displayName() { return t("onError.name"); },
        get description() { return t("onError.desc"); },
        default: "hold",
        get options() {
            return [
                { label: t("onError.hold"), value: "hold", default: true },
                { label: t("onError.send"), value: "sendAsTyped" }
            ];
        }
    },

    explain: {
        type: OptionType.BOOLEAN,
        get displayName() { return t("explain.name"); },
        get description() { return t("explain.desc"); },
        default: true
    },

    // --- how it translates ---

    howTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.how")
    },

    gender: {
        type: OptionType.SELECT,
        get displayName() { return t("gender.name"); },
        get description() { return t("gender.desc"); },
        default: "unset",
        get options() {
            return [
                { label: t("gender.unset"), value: "unset", default: true },
                { label: t("gender.male"), value: "male" },
                { label: t("gender.female"), value: "female" }
            ];
        }
    },
    formality: {
        type: OptionType.SELECT,
        get displayName() { return t("formality.name"); },
        get description() { return t("formality.desc"); },
        default: "match",
        get options() {
            return [
                { label: t("formality.match"), value: "match", default: true },
                { label: t("formality.informal"), value: "informal" },
                { label: t("formality.formal"), value: "formal" }
            ];
        }
    },
    useContext: {
        type: OptionType.BOOLEAN,
        get displayName() { return t("context.name"); },
        get description() { return t("context.desc"); },
        default: true
    },
    glossary: {
        type: OptionType.STRING,
        get displayName() { return t("glossary.name"); },
        get description() { return t("glossary.desc"); },
        default: ""
    },
    extraInstructions: {
        type: OptionType.STRING,
        get displayName() { return t("extra.name"); },
        get description() { return t("extra.desc"); },
        default: ""
    },
    // Nothing to set: how to keep part of a message untranslated.
    keepHelp: {
        type: OptionType.COMPONENT,
        component: KeepHelp
    },

    // Both languages are edited from the in-chat panel (left-click the chat
    // bar button), so they are not repeated on this page.
    sentLanguage: {
        type: OptionType.STRING,
        description: "internal: language outgoing messages are translated into",
        default: "English",
        hidden: true
    },
    receivedLanguage: {
        type: OptionType.STRING,
        description: "internal: language incoming messages are translated into",
        default: "English",
        hidden: true
    },

    // --- what it looks like ---

    lookTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.look")
    },

    locale: {
        type: OptionType.SELECT,
        get displayName() { return t("locale.name"); },
        get description() { return t("locale.desc"); },
        default: "auto",
        get options() {
            return LOCALES.map(l => ({
                value: l.value,
                label: l.value === "auto" ? t("locale.auto") : l.label,
                default: l.value === "auto"
            }));
        }
    },
    showOriginal: {
        type: OptionType.BOOLEAN,
        get displayName() { return t("showOriginal.name"); },
        get description() { return t("showOriginal.desc"); },
        default: false
    },

    // --- upkeep ---

    upkeepTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.upkeep")
    },

    updates: {
        type: OptionType.COMPONENT,
        component: UpdatePanel
    },
    logs: {
        type: OptionType.COMPONENT,
        component: LogsPanel
    },
    lastUpdateCheck: {
        type: OptionType.NUMBER,
        description: "internal: when this copy last asked builds.zolatau.com for a new build",
        default: 0,
        hidden: true
    },

    // Legacy single-provider fields, migrated on start and then left empty.
    apiKey: { type: OptionType.STRING, description: "internal: pre-migration API key", default: "", hidden: true },
    model: { type: OptionType.STRING, description: "internal: pre-migration model", default: "", hidden: true }
}, {
    geminiApiKey: { hidden() { return !keyInUse(this.store, "gemini"); } },
    groqApiKey: { hidden() { return !keyInUse(this.store, "groq"); } },
    anthropicApiKey: { hidden() { return !keyInUse(this.store, "anthropic"); } },
    glmApiKey: { hidden() { return !keyInUse(this.store, "glm"); } },
    openaiApiKey: { hidden() { return !keyInUse(this.store, "openai"); } },

    baseUrl: { hidden() { return !keyInUse(this.store, "openai"); } },
    thinkingLevel: { hidden() { return this.store.provider === "anthropic"; } }
});

/** Keys and models are kept per provider, so switching does not lose them. */
/** Carries settings over from the old plugin name and the single-key layout. */
export function migrateSettings() {
    const old = (Settings.plugins as any)?.AiTranslate;
    if (old && !settings.store.geminiApiKey && !settings.store.groqApiKey && !settings.store.apiKey) {
        for (const key of [
            "provider", "apiKey", "model", "baseUrl", "sentLanguage", "receivedLanguage",
            "thinkingLevel", "mode", "enabledChannels", "extraInstructions",
            "geminiApiKey", "groqApiKey", "anthropicApiKey", "glmApiKey", "openaiApiKey",
            "geminiModel", "groqModel", "anthropicModel", "glmModel", "openaiModel"
        ]) {
            if (old[key] !== undefined && old[key] !== "") (settings.store as any)[key] = old[key];
        }
    }

    // A provider that has since been dropped would leave the list blank.
    const KNOWN = ["groq", "gemini", "anthropic", "glm", "openai"];
    if (!KNOWN.includes(settings.store.provider)) settings.store.provider = "groq";
    if (settings.store.fallbackProvider !== "none" && !KNOWN.includes(settings.store.fallbackProvider))
        settings.store.fallbackProvider = "none";

    const { apiKey, model, provider } = settings.store;

    if (apiKey) {
        if (!(settings.store as any)[`${provider}ApiKey`]) (settings.store as any)[`${provider}ApiKey`] = apiKey;
        settings.store.apiKey = "";
    }

    if (model) {
        if (!(settings.store as any)[`${provider}Model`]) (settings.store as any)[`${provider}Model`] = model;
        settings.store.model = "";
    }
}
