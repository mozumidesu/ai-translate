/*
 * AI Translate — the providers this copy talks to, in order.
 *
 * One to ask and up to four behind it. Each is its own slot with its own key
 * and its own model, so the same provider can stand in two of them with two
 * keys from two accounts, and the two know nothing about each other.
 *
 * Drawn here rather than as rows of Vencord settings because a row knows only
 * its own name: with the key under the provider's name there could be one key
 * per provider in the whole plugin, and the backup's key appeared under the
 * first provider's heading because that is where the row lived.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { SearchableSelect, TextInput, useState } from "@webpack/common";

import { t } from "../core/locales";
import {
    baseUrlOf, emptySlot, keyOf, MOST_SLOTS, NONE, PROVIDERS, readSlots, Slot, writeSlots
} from "../core/slots";
import { ModelPicker, Verdict } from "./ModelPicker";

const cl = classNameFactory("vc-aitrans-");

/** "Groq (recommended)" is advice for the first choice, not a name. */
const bareLabel = (id: string) => t(`provider.${id}`).replace(/\s*\(.*\)\s*$/, "");

export function Providers() {
    const [slots, setSlots] = useState(readSlots);
    /** Bumped when a key or an address is finished, to ask the provider again. */
    const [revisions, setRevisions] = useState<Record<string, number>>({});
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});

    const save = (next: Slot[]) => {
        writeSlots(next);
        setSlots(next);
    };

    const change = (at: number, make: (slot: Slot) => Slot) =>
        save(slots.map((slot, i) => (i === at ? make(slot) : slot)));

    const bump = (id: string) =>
        setRevisions(was => ({ ...was, [id]: (was[id] ?? 0) + 1 }));

    const verdict = (id: string, said: Verdict) =>
        setVerdicts(was => (was[id] === said ? was : { ...was, [id]: said }));

    return (
        <section>
            {slots.map((slot, at) => {
                const first = at === 0;
                const options = [
                    ...(first ? [] : [{ value: NONE, label: t("fallback.none") }]),
                    ...PROVIDERS.map(id => ({ value: id, label: first ? t(`provider.${id}`) : bareLabel(id) }))
                ];

                return (
                    <div key={slot.id} className={cl("slot")}>
                        <Heading className={`${Margins.bottom8} vc-aitrans-label`} defaultColor={false}>
                            {first ? t("provider.name") : t("fallback.numbered", { number: at })}
                        </Heading>

                        <SearchableSelect
                            options={options}
                            value={options.find(o => o.value === slot.provider)?.value}
                            maxVisibleItems={6}
                            closeOnSelect={true}
                            onChange={(value: string) => change(at, s => ({ ...s, provider: value }))}
                        />

                        {at <= 1 && (
                            <Paragraph className="vc-aitrans-quiet" defaultColor={false}>
                                {first ? t("provider.desc") : t("fallback.desc")}
                            </Paragraph>
                        )}

                        {slot.provider !== NONE && (
                            <>
                                <Heading className={`${Margins.top16} ${Margins.bottom8} vc-aitrans-label`} defaultColor={false}>
                                    {`${t("apiKey.name")} — ${bareLabel(slot.provider)}`}
                                </Heading>

                                {/* The provider is asked when the field is left, not while it
                                    is being filled: one request for a key however it arrives. */}
                                <div onBlur={() => bump(slot.id)}>
                                    <TextInput
                                        type="password"
                                        value={keyOf(slot)}
                                        placeholder={t("apiKey.desc")}
                                        onChange={(value: string) => change(at, s =>
                                            ({ ...s, keys: { ...s.keys, [s.provider]: value } }))}
                                    />
                                </div>

                                {verdicts[slot.id] === "bad" && (
                                    <Paragraph className={cl("warning")} defaultColor={false}>
                                        {t("apiKey.bad", { provider: bareLabel(slot.provider) })}
                                    </Paragraph>
                                )}

                                {slot.provider === "openai" && (
                                    <>
                                        <Heading className={`${Margins.top16} ${Margins.bottom8} vc-aitrans-label`} defaultColor={false}>
                                            {t("baseUrl.name")}
                                        </Heading>
                                        <div onBlur={() => bump(slot.id)}>
                                            <TextInput
                                                value={baseUrlOf(slot)}
                                                placeholder={t("baseUrl.desc")}
                                                onChange={(value: string) => change(at, s =>
                                                    ({ ...s, baseUrls: { ...s.baseUrls, [s.provider]: value } }))}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className={cl("slot-model")}>
                                    <ModelPicker
                                        slot={slot}
                                        revision={revisions[slot.id] ?? 0}
                                        onChoose={model => change(at, s =>
                                            ({ ...s, models: { ...s.models, [s.provider]: model } }))}
                                        onVerdict={said => verdict(slot.id, said)}
                                    />
                                </div>
                            </>
                        )}

                        {!first && (
                            <Button
                                className={cl("slot-remove")}
                                size="small"
                                variant="secondary"
                                onClick={() => save(slots.filter((_, i) => i !== at))}
                            >
                                {t("fallback.remove")}
                            </Button>
                        )}
                    </div>
                );
            })}

            {slots.length < MOST_SLOTS && (
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => save([...slots, emptySlot(NONE)])}
                >
                    {t("fallback.add")}
                </Button>
            )}
        </section>
    );
}
