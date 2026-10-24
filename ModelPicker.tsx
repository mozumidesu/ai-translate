/*
 * AI Translate — the model chooser.
 *
 * Providers retire models without warning, so the list comes from the provider
 * itself and the suggested one is starred rather than typed from memory. The
 * list belongs to the provider and its key: change either and it is fetched
 * again, and the model chosen for one provider stays with that provider.
 *
 * Reads the settings store directly; importing settings.ts would be circular.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Forms, SearchableSelect, TextInput, useEffect, useState } from "@webpack/common";

import { Bridge } from "./bridge";
import { t } from "./locales";
import { FREE_MODELS } from "./providers";

const PROVIDERS = ["gemini", "groq", "anthropic", "glm", "openai"];

/** Everything that decides which list is shown and which model is chosen. */
const WATCHED = [
    "plugins.AI Translate.provider",
    "plugins.AI Translate.baseUrl",
    ...PROVIDERS.flatMap(p => [`plugins.AI Translate.${p}ApiKey`, `plugins.AI Translate.${p}Model`])
] as any[];

/** Preferred models per provider, best first. Missing ones fall through. */
const PREFERRED: Record<string, string[]> = {
    // Same free limits for both on Groq, and the larger one is far better
    // at nuance — word senses, tone, case endings.
    groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
    gemini: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-2.5-flash"],
    anthropic: ["claude-haiku-4-5", "claude-3-5-haiku-latest"],
    // Both free. 4.5 answers in a second or two; 4.7 is the better model, but
    // on the free tier it is often "overloaded" and otherwise takes half a
    // minute or more, all of it with the message held back from sending.
    glm: ["glm-4.5-flash", "glm-4.7-flash"],
    openai: []
};

/** The provider's own list, with the models it runs but does not list. */
const withUnlisted = (provider: string, models: string[]) =>
    [...new Set([...models, ...(FREE_MODELS[provider] ?? [])])].sort();

/** Small, fast models name themselves: flash, mini, lite, instant, 8b. */
const FAST_HINT = /(flash|mini|lite|instant|haiku|small|\b[478]b\b|20b)/i;

export function suggestModel(provider: string, listed: string[]) {
    const models = withUnlisted(provider, listed);

    for (const wanted of PREFERRED[provider] ?? [])
        if (models.includes(wanted)) return wanted;

    return models.find(m => FAST_HINT.test(m)) ?? models[0] ?? "";
}

function store() {
    return (Settings.plugins as any)["AI Translate"];
}

type State = "noKey" | "loading" | "list" | "known" | "badKey" | "failed";

/** Only the newest request may change what is on screen. */
let request = 0;

export function ModelPicker() {
    // Redraw when the provider, its key or its model changes.
    useSettings(WATCHED);

    const s = store();
    const provider: string = s.provider ?? "groq";
    const modelKey = `${provider}Model`;
    const apiKey: string = s[`${provider}ApiKey`] ?? "";
    const baseUrl: string = s.baseUrl ?? "";
    // Straight from the settings: switching provider switches the model with it.
    const current: string = s[modelKey] ?? "";

    const [models, setModels] = useState<string[]>([]);
    const [state, setState] = useState<State>("loading");
    const [byHand, setByHand] = useState(false);

    async function load() {
        const mine = ++request;

        if (!apiKey) {
            setModels([]);
            return setState("noKey");
        }

        setState("loading");

        let status = 0;
        let found: string[] = [];

        try {
            const answer = await Bridge.listAiModels(JSON.stringify({ provider, apiKey, baseUrl }));
            status = answer.status;
            if (status === 200) found = withUnlisted(provider, answer.models);
        } catch {
            // An answer that never arrives is a failure like any other.
        }

        // The provider or the key changed while this was in the air.
        if (mine !== request) return;

        if (found.length) {
            setModels(found);
            setState("list");

            // Nothing chosen yet, or the chosen one no longer exists.
            if (!current || !found.includes(current)) s[modelKey] = suggestModel(provider, found);
            return;
        }

        const known = FREE_MODELS[provider] ?? [];
        setModels(known);
        setState(known.length ? "known" : status === 401 || status === 403 ? "badKey" : "failed");
    }

    // A key arrives pasted or typed letter by letter; a short wait keeps that
    // from becoming one request per keystroke.
    useEffect(() => {
        setModels([]);
        setByHand(false);
        setState(apiKey ? "loading" : "noKey");
        if (!apiKey) return;

        const timer = setTimeout(load, 500);
        return () => clearTimeout(timer);
    }, [provider, apiKey, baseUrl]);

    const recommended = suggestModel(provider, models);
    const options = models.map(m => ({
        value: m,
        label: m === recommended ? `${m} ★` : m
    }));

    // A model chosen earlier stays selectable even when the list has moved on.
    if (current && !models.includes(current)) options.push({ value: current, label: current });

    // The starred one belongs at the top, the rest keep their order.
    options.sort((a, b) => (a.value === recommended ? -1 : b.value === recommended ? 1 : 0));

    const choose = (value: string) => { s[modelKey] = value; };

    const note = state === "noKey" ? "model.needKey"
        : state === "known" ? "model.builtin"
            : state === "badKey" ? "model.failedKey"
                : state === "failed" ? "model.failed"
                    : "model.desc";

    // Vencord already spaces one setting from the next; a margin of its own
    // would double the gap under this one.
    return (
        <section>
            <Forms.FormTitle tag="h3">{t("model.name")}</Forms.FormTitle>

            {byHand || !models.length
                ? <TextInput
                    value={current}
                    placeholder={t("model.pick")}
                    onChange={choose}
                />
                : <SearchableSelect
                    options={options}
                    value={options.find(o => o.value === current)?.value}
                    placeholder={state === "loading" ? t("model.loading") : t("model.pick")}
                    maxVisibleItems={8}
                    closeOnSelect={true}
                    onChange={choose}
                />}

            <Forms.FormText>{t(note)}</Forms.FormText>

            <div className="vc-aitrans-model-actions">
                <Button size="small" variant="secondary" disabled={state === "loading"} onClick={load}>
                    {t("model.refresh")}
                </Button>

                {!!models.length && (
                    <Button size="small" variant="secondary" onClick={() => setByHand(!byHand)}>
                        {byHand ? t("model.fromList") : t("model.byHand")}
                    </Button>
                )}
            </div>
        </section>
    );
}
