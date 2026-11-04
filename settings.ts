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

import { KeepHelp } from "./ui/KeepHelp";
import { LearnPanel } from "./ui/LearnPanel";
import { LOCALES, t } from "./core/locales";
import { LogsPanel } from "./ui/Logs";
import { Providers } from "./ui/Providers";
import { sectionTitle } from "./ui/SectionTitle";
import { UpdatePanel } from "./ui/UpdatePanel";

export const settings = definePluginSettings({
    // --- what it talks to: first on the page, so nothing announces it ---

    // Drawn whole rather than as rows: a row is named once for the whole
    // plugin, which is why one key per provider was all there could be.
    providers: {
        type: OptionType.COMPONENT,
        component: Providers
    },
    providerSlots: {
        type: OptionType.STRING,
        description: "internal: the providers to ask, in order, as JSON",
        default: "",
        hidden: true
    },

    // Everything below is the layout from before the list. It is still read
    // when no list has been written yet, which is how a copy that has never
    // opened this page keeps working, and it is kept rather than deleted so
    // that a copy going back to an older build still finds its keys.
    provider: {
        type: OptionType.STRING,
        description: "internal: the provider, before there was a list of them",
        default: "groq",
        hidden: true
    },
    geminiApiKey: { type: OptionType.STRING, description: "internal: pre-list key for gemini", default: "", hidden: true },
    groqApiKey: { type: OptionType.STRING, description: "internal: pre-list key for groq", default: "", hidden: true },
    anthropicApiKey: { type: OptionType.STRING, description: "internal: pre-list key for anthropic", default: "", hidden: true },
    glmApiKey: { type: OptionType.STRING, description: "internal: pre-list key for glm", default: "", hidden: true },
    openaiApiKey: { type: OptionType.STRING, description: "internal: pre-list key for openai", default: "", hidden: true },

    geminiModel: { type: OptionType.STRING, description: "internal: pre-list model for gemini", default: "gemini-3.8-flash", hidden: true },
    groqModel: { type: OptionType.STRING, description: "internal: pre-list model for groq", default: "openai/gpt-oss-120b", hidden: true },
    anthropicModel: { type: OptionType.STRING, description: "internal: pre-list model for anthropic", default: "", hidden: true },
    glmModel: { type: OptionType.STRING, description: "internal: pre-list model for glm", default: "glm-4.5-flash", hidden: true },
    openaiModel: { type: OptionType.STRING, description: "internal: pre-list model for openai", default: "", hidden: true },

    baseUrl: {
        type: OptionType.STRING,
        description: "internal: pre-list address for the OpenAI-compatible provider",
        default: "",
        hidden: true
    },
    fallbackProvider: {
        type: OptionType.STRING,
        description: "internal: the one backup there used to be room for",
        default: "none",
        hidden: true
    },

    // --- how it behaves ---

    behaviourTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.behaviour")
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

    // Off by default: it puts an item in the right-click menu of every
    // message, which is a thing to choose rather than to arrive with.
    explain: {
        type: OptionType.BOOLEAN,
        get displayName() { return t("explain.name"); },
        get description() { return t("explain.desc"); },
        default: false
    },

    // Off by default: most people are not learning the language they translate
    // into, and while it is on, anything written in that language's alphabet is
    // corrected rather than translated. Not for the cost: such a message makes
    // a request either way, and this one's prompt is the smaller of the two.
    aiLearn: {
        type: OptionType.BOOLEAN,
        get displayName() { return t("learn.name"); },
        get description() { return t("learn.desc"); },
        default: false
    },
    learnPanel: {
        type: OptionType.COMPONENT,
        component: LearnPanel
    },
    learnHistory: {
        type: OptionType.STRING,
        description: "internal: the corrections kept, newest first, as JSON",
        default: "",
        hidden: true
    },

    // --- how the translation reads ---

    translationTitle: {
        type: OptionType.COMPONENT,
        component: sectionTitle("section.translation")
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

    // --- upkeep: two buttons at the foot, which need no heading ---

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
    // Deliberately not a setting of its own: the line under the update button
    // changes it, and a row here would read as a feature rather than as
    // upkeep. Empty until either that line or the installed build settles it,
    // and read as the released channel in the meantime.
    updateChannel: {
        type: OptionType.STRING,
        description: "internal: which builds this copy follows, release or testing",
        default: "",
        hidden: true
    },

    // Legacy single-provider fields, migrated on start and then left empty.
    apiKey: { type: OptionType.STRING, description: "internal: pre-migration API key", default: "", hidden: true },
    model: { type: OptionType.STRING, description: "internal: pre-migration model", default: "", hidden: true }
}, {
    // Nothing to look back over until the switch above is on.
    learnPanel: { hidden() { return !this.store.aiLearn; } }
});

/** Keys and models are kept per provider, so switching does not lose them. */
/** Carries settings over from the old plugin name and the single-key layout. */
export function migrateSettings() {
    const old = (Settings.plugins as any)?.AiTranslate;
    if (old && !settings.store.geminiApiKey && !settings.store.groqApiKey && !settings.store.apiKey) {
        for (const key of [
            "provider", "apiKey", "model", "baseUrl", "sentLanguage", "receivedLanguage",
            "mode", "enabledChannels", "extraInstructions",
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
