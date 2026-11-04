/*
 * AI Translate — the model chooser, one per provider slot.
 *
 * Providers retire models without warning, so the list comes from the provider
 * itself and the suggested one is starred rather than typed from memory.
 *
 * The same request answers two questions, which is why it is made here and
 * not twice: which models this key can reach, and whether the provider takes
 * the key at all. It is made when the key is finished rather than while it is
 * being typed, so a pasted key costs one request and a typed one costs one
 * request, not one per letter.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { SearchableSelect, TextInput, useEffect, useState } from "@webpack/common";

import { Bridge } from "../core/bridge";
import { t } from "../core/locales";
import { FREE_MODELS } from "../core/providers";
import { baseUrlOf, keyOf, modelOf, Slot } from "../core/slots";

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

type State = "noKey" | "loading" | "list" | "known" | "badKey" | "failed";

/** What the provider said about the key, for whoever drew the field above. */
export type Verdict = "unknown" | "ok" | "bad";

/** Only the newest request may change what is on screen. */
let request = 0;

export function ModelPicker({ slot, revision, onChoose, onVerdict }: {
    slot: Slot;
    /** Bumped when the key or the address is finished, to ask again. */
    revision: number;
    onChoose(model: string): void;
    onVerdict(verdict: Verdict): void;
}) {
    const apiKey = keyOf(slot);
    const baseUrl = baseUrlOf(slot);
    const current = modelOf(slot);

    const [models, setModels] = useState<string[]>([]);
    const [state, setState] = useState<State>(apiKey ? "loading" : "noKey");
    const [byHand, setByHand] = useState(false);

    async function load() {
        const mine = ++request;

        if (!apiKey) {
            setModels([]);
            onVerdict("unknown");
            return setState("noKey");
        }

        setState("loading");

        let status = 0;
        let found: string[] = [];

        try {
            const answer = await Bridge.listAiModels(JSON.stringify({ provider: slot.provider, apiKey, baseUrl }));
            status = answer.status;
            if (status === 200) found = withUnlisted(slot.provider, answer.models);
        } catch {
            // An answer that never arrives is a failure like any other.
        }

        // The slot or the key changed while this was in the air.
        if (mine !== request) return;

        // Only a refusal of the key itself is the key's fault. A timeout, a
        // rate limit or an outage say nothing about it, and a red line under
        // a key that is perfectly good is worse than no line at all.
        onVerdict(status === 200 ? "ok" : status === 401 || status === 403 ? "bad" : "unknown");

        if (found.length) {
            setModels(found);
            setState("list");

            // Nothing chosen yet, or the chosen one no longer exists.
            if (!current || !found.includes(current)) onChoose(suggestModel(slot.provider, found));
            return;
        }

        const known = FREE_MODELS[slot.provider] ?? [];
        setModels(known);
        setState(known.length ? "known" : status === 401 || status === 403 ? "badKey" : "failed");
    }

    useEffect(() => {
        setModels([]);
        setByHand(false);
        setState(apiKey ? "loading" : "noKey");
        if (!apiKey) return onVerdict("unknown");

        void load();
    }, [slot.id, slot.provider, revision]);

    const recommended = suggestModel(slot.provider, models);
    const options = models.map(m => ({
        value: m,
        label: m === recommended ? `${m} ★` : m
    }));

    // A model chosen earlier stays selectable even when the list has moved on.
    if (current && !models.includes(current)) options.push({ value: current, label: current });

    // The starred one belongs at the top, the rest keep their order.
    options.sort((a, b) => (a.value === recommended ? -1 : b.value === recommended ? 1 : 0));

    const note = state === "noKey" ? "model.needKey"
        : state === "known" ? "model.builtin"
            : state === "badKey" ? "model.failedKey"
                : state === "failed" ? "model.failed"
                    : "model.desc";

    return (
        <section>
            <Heading className={`${Margins.bottom8} vc-aitrans-label`} defaultColor={false}>{t("model.name")}</Heading>

            {byHand || !models.length
                ? <TextInput
                    value={current}
                    placeholder={t("model.pick")}
                    onChange={onChoose}
                />
                : <SearchableSelect
                    options={options}
                    value={options.find(o => o.value === current)?.value}
                    placeholder={state === "loading" ? t("model.loading") : t("model.pick")}
                    maxVisibleItems={8}
                    closeOnSelect={true}
                    onChange={onChoose}
                />}

            <Paragraph className="vc-aitrans-quiet" defaultColor={false}>{t(note)}</Paragraph>

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
