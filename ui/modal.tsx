/*
 * AI Translate — the panel behind the chat bar button.
 *
 * Holds what changes often: languages, thinking level, and the switch for the
 * current chat. Credentials stay in the plugin settings.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { Margins } from "@utils/margins";
import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, Forms, Modal, openModal, SearchableSelect, useMemo, useState } from "@webpack/common";

import { LANGUAGES } from "../core/languages";
import { isRightToLeft, t } from "../core/locales";
import { isChannelEnabled, setChannelEnabled } from "../core/chats";
import { settings } from "../settings";

const thinkingOptions = () => [
    { value: "low", label: t("thinking.low") },
    { value: "high", label: t("thinking.high") }
];

function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return t("panel.thisChat");
    if (channel.name) return "#" + channel.name;

    const names = (channel as any).rawRecipients?.map((u: any) => u.globalName || u.username).filter(Boolean);
    if (names?.length) return names.join(", ");

    return t("panel.thisChat");
}

function LanguagePicker({ title, settingsKey }: { title: string; settingsKey: "sentLanguage" | "receivedLanguage"; }) {
    const current = settings.use([settingsKey])[settingsKey];

    // keep a hand-typed language that is not in the list usable
    const options = useMemo(() => {
        if (current && !LANGUAGES.some(l => l.value === current))
            return [{ value: current, label: current }, ...LANGUAGES];
        return LANGUAGES;
    }, [current]);

    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">{title}</Forms.FormTitle>
            <SearchableSelect
                options={options}
                value={options.find(o => o.value === current)?.value}
                placeholder={t("panel.pickLanguage")}
                maxVisibleItems={6}
                closeOnSelect={true}
                onChange={(v: string) => settings.store[settingsKey] = v}
            />
        </section>
    );
}

function ThinkingPicker() {
    const { thinkingLevel } = settings.use(["thinkingLevel"]);
    const options = thinkingOptions();

    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">{t("panel.thinking")}</Forms.FormTitle>
            <SearchableSelect
                options={options}
                value={options.find(o => o.value === thinkingLevel)?.value}
                placeholder={t("panel.pickLevel")}
                maxVisibleItems={4}
                closeOnSelect={true}
                onChange={(v: string) => settings.store.thinkingLevel = v as any}
            />
        </section>
    );
}

function ChannelToggle({ channelId }: { channelId: string; }) {
    const { mode } = settings.use(["mode", "enabledChannels"]);
    const [on, setOn] = useState(() => isChannelEnabled(channelId));

    if (mode === "always")
        return (
            <FormSwitch
                title={t("panel.alwaysOn")}
                description={t("panel.alwaysOnHint")}
                value={true}
                disabled={true}
                onChange={() => { }}
                hideBorder
            />
        );

    return (
        <FormSwitch
            title={t("panel.toggle", { chat: channelLabel(channelId) })}
            description={t("panel.toggleHint")}
            value={on}
            onChange={v => {
                setChannelEnabled(channelId, v);
                setOn(v);
            }}
            hideBorder
        />
    );
}

function AiTranslateModal({ rootProps, channelId }: { rootProps: RenderModalProps; channelId: string; }) {
    const { provider } = settings.use(["provider"]);

    return (
        <Modal {...rootProps} title={t("panel.title")}>
            <div dir={isRightToLeft() ? "rtl" : undefined}>
            <LanguagePicker title={t("panel.sentLanguage")} settingsKey="sentLanguage" />
            <LanguagePicker title={t("panel.receivedLanguage")} settingsKey="receivedLanguage" />

            {provider !== "anthropic" && <ThinkingPicker />}

            <Divider className={Margins.bottom16} />

            <ChannelToggle channelId={channelId} />

            <Button
                className={Margins.top16}
                size="small"
                variant="secondary"
                onClick={() => {
                    // Settings open in their own window, so this one steps aside.
                    rootProps.onClose();
                    openPluginModal(Vencord.Plugins.plugins["AI Translate"]);
                }}
            >
                {t("panel.allSettings")}
            </Button>
            </div>
        </Modal>
    );
}

export function openAiTranslateModal(channelId: string) {
    openModal(props => <AiTranslateModal rootProps={props} channelId={channelId} />);
}
