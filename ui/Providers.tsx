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

/** Shown beside the key, so a pasted one can be read back before it is used. */
const EyeIcon = ({ off }: { off: boolean; }) => (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
        <path
            fill="currentColor"
            d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        />
        {off && <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 4 20 20" />}
    </svg>
);

/** "Groq (recommended)" is advice for the first choice, not a name. */
const bareLabel = (id: string) => t(`provider.${id}`).replace(/\s*\(.*\)\s*$/, "");

export function Providers() {
    const [slots, setSlots] = useState(readSlots);
    /** Bumped when a key or an address is finished, to ask the provider again. */
    const [revisions, setRevisions] = useState<Record<string, number>>({});
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
    /** Which keys are being read back. Hidden again as soon as the page closes. */
    const [shown, setShown] = useState<Record<string, boolean>>({});

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

    /** The slot's own two buttons, which stand at the end of the row of them. */
    const actions = (at: number) => (
        <>
            {at > 0 && (
                <Button
                    className={cl("slot-sign")}
                    size="small"
                    variant="secondary"
                    aria-label={t("fallback.remove")}
                    onClick={() => save(slots.filter((_, i) => i !== at))}
                >
                    &minus;
                </Button>
            )}

            {/* There is one list to add to, not one per slot, so the plus
                belongs to the last of them. */}
            {at === slots.length - 1 && slots.length < MOST_SLOTS && (
                <Button
                    className={cl("slot-sign")}
                    size="small"
                    variant="secondary"
                    aria-label={t("fallback.add")}
                    onClick={() => save([...slots, emptySlot(NONE)])}
                >
                    +
                </Button>
            )}
        </>
    );

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
                            {first ? t("provider.name")
                                : slots.length > 2 ? t("fallback.numbered", { number: at })
                                    : t("fallback.name")}
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
                                <div className={cl("key-row")} onBlur={() => bump(slot.id)}>
                                    <TextInput
                                        type={shown[slot.id] ? "text" : "password"}
                                        value={keyOf(slot)}
                                        placeholder={t("apiKey.desc")}
                                        onChange={(value: string) => change(at, s =>
                                            ({ ...s, keys: { ...s.keys, [s.provider]: value } }))}
                                    />
                                    <Button
                                        size="small"
                                        variant="secondary"
                                        aria-label={t(shown[slot.id] ? "apiKey.hide" : "apiKey.show")}
                                        onClick={() => setShown(was => ({ ...was, [slot.id]: !was[slot.id] }))}
                                    >
                                        <EyeIcon off={!!shown[slot.id]} />
                                    </Button>
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
                                        actions={actions(at)}
                                    />
                                </div>
                            </>
                        )}

                        {slot.provider === NONE && (!first || slots.length < MOST_SLOTS) && (
                            <div className={cl("slot-actions")}>{actions(at)}</div>
                        )}
                    </div>
                );
            })}
        </section>
    );
}
