/*
 * AI Translate — the plugin as Vencord sees it.
 *
 * Translates outgoing messages before they are sent and incoming ones on
 * demand, switched on per chat. The translation itself is in translate.ts;
 * what is here is the chat bar button, the block under a message, the right
 * click menu and the plugin's own definition.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";
// Before anything else in the plugin: whatever loads next can then ask the
// host for settings without checking whether there is one yet.
import "./vencord-host";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { MessageObject } from "@api/MessageEvents";
import { classNameFactory } from "@utils/css";
import definePlugin, { IconComponent } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, Parser, useEffect, useState, UserStore } from "@webpack/common";

import { SettingsHeader } from "./ui/Feedback";
import { keepPieces } from "./core/keep";
import { LANGUAGES } from "./core/languages";
import { currentLocale, shapeLanguageName, t } from "./core/locales";
import { openAiTranslateModal } from "./ui/modal";
import { isChannelEnabled, toggleChannel } from "./core/chats";
import { migrateSettings, settings } from "./settings";
import { aiTranslate, collectContext, isJustAName, isNotWorthTranslating, notify, TranslationResult } from "./core/translate";
import { cancelUpdateCheck, scheduleUpdateCheck } from "./updater";

const cl = classNameFactory("vc-aitrans-");

// --- chat bar button ---

const TranslateIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 96 960 960" height={height} width={width} className={className}>
        <path fill="currentColor" d="m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z" />
    </svg>
);

const ExplainIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" height={height} width={width} className={className}>
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 17h-2v-2h2v2Zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26A2 2 0 1 0 10 9H8a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25Z" />
    </svg>
);

const AiTranslateChatBarIcon: ChatBarButtonFactory = ({ channel, isAnyChat }) => {
    const { mode, enabledChannels } = settings.use(["mode", "enabledChannels"]);

    // isAnyChat rather than isMainChat, so the button also appears in the
    // side panel: voice channel chat, threads and the DM popout.
    if (!isAnyChat) return null;

    const active = mode === "always" || enabledChannels.split(",").includes(channel.id);

    return (
        <ChatBarButton
            tooltip={`${active ? t("button.on") : t("button.off")} — ${t("button.hint")}`}
            onClick={e => {
                // The icon colour already reports the state, so toggling stays silent.
                if (e.shiftKey) return void toggleChannel(channel.id);
                openAiTranslateModal(channel.id);
            }}
            onContextMenu={() => void toggleChannel(channel.id)}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <TranslateIcon className={cl({ "active": active, "chat-button": true })} />
        </ChatBarButton>
    );
};

// --- message accessory ---

interface Shown extends TranslationResult {
    /** An explanation rather than a translation, so it is labelled differently. */
    explained?: boolean;
}

const TranslationSetters = new Map<string, (v: Shown | undefined) => void>();

/**
 * What is shown under each message. Kept here as well as in the accessory's own
 * state, because the message list is rebuilt as it scrolls: an answer that
 * arrived while the message was off screen is still there when it comes back.
 */
const shownTranslations = new Map<string, Shown>();

function showUnderMessage(id: string, value: Shown) {
    if (shownTranslations.size > 200) shownTranslations.clear();
    shownTranslations.set(id, value);
    TranslationSetters.get(id)?.(value);
}

/** Translated text -> what was typed, so the original can be shown back under the sent message. */
const sentOriginals = new Map<string, string>();

function rememberOriginal(original: string, translated: string) {
    if (sentOriginals.size > 100) sentOriginals.clear();
    sentOriginals.set(translated, original);
}

/**
 * Discord's message box carries a quote on by itself: inside one, every new
 * line arrives with "> " already on it. The writer typed the marker once, so
 * the echo of what they wrote shows it once.
 */
function asTyped(original: string) {
    let quoting = false;

    return original.split("\n").map(line => {
        const marker = line.match(/^\s*>{1,3}\s?/)?.[0];
        if (!marker) {
            quoting = false;
            return line;
        }

        const shown = quoting ? line.slice(marker.length) : line;
        quoting = true;
        return shown;
    }).join("\n");
}

function TranslationAccessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<Shown | undefined>(() => shownTranslations.get(message.id));

    // Discord gives one accessory to another message as the list scrolls. With
    // no dependency here, the setter stayed registered under whichever message
    // the accessory was first built for, and the translation of the new one had
    // nowhere to go: nothing appeared and nothing said why. Changing channel
    // rebuilt the list, and then it worked again.
    useEffect(() => {
        TranslationSetters.set(message.id, setTranslation);
        setTranslation(shownTranslations.get(message.id));
        return () => void TranslationSetters.delete(message.id);
    }, [message.id]);

    const isOwn = message.author?.id === UserStore.getCurrentUser()?.id;
    const original = isOwn && settings.store.showOriginal
        ? sentOriginals.get(message.content)
        : undefined;

    if (!translation && !original) return null;

    return (
        <span className={cl("accessory")}>
            {translation?.explained
                ? <ExplainIcon width={16} height={16} className={cl("accessory-icon")} />
                : <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />}
            {translation
                ? <>
                    {Parser.parse(translation.text)}
                    <span className={cl("note")}>
                        {!translation.explained && translation.sourceLanguage
                            ? `${t("message.translatedFrom", { language: languageName(translation.sourceLanguage) })} — `
                            : ""}
                        <button className={cl("dismiss")} onClick={() => {
                            shownTranslations.delete(message.id);
                            setTranslation(undefined);
                        }}>{t("message.hide")}</button>
                    </span>
                </>
                : <>{t("message.youWrote")} {asTyped(original)}</>}
        </span>
    );
}

/**
 * The name of a language belongs in the language the reader is using: "Arabic"
 * for an English interface, "арабский" for a Russian one. The system knows every
 * one of those names already, so nothing has to be translated by hand — it only
 * needs the language's standard code.
 */
function languageName(reported: string) {
    const said = reported.trim();

    // Newer answers give a code; older ones may still give an English name.
    const known = LANGUAGES.find(l =>
        l.code.toLowerCase() === said.toLowerCase() || l.value.toLowerCase() === said.toLowerCase());

    const code = known?.code ?? said;

    try {
        const display = new Intl.DisplayNames([currentLocale()], { type: "language" }).of(code);
        if (display && display.toLowerCase() !== code.toLowerCase())
            // The sentence around it decides the ending and the article.
            return shapeLanguageName(display);
    } catch {
        // An unknown code, or a build without the name tables.
    }

    return shapeLanguageName(known?.value ?? said);
}

function getMessageContent(message: Message) {
    return message.content || message.messageSnapshots?.[0]?.message.content || "";
}

async function translateMessage(message: Message) {
    const content = getMessageContent(message);
    if (!content) return;

    try {
        // Someone's name on its own: the translation of a name is the name.
        if (isJustAName(content, message.channel_id)) {
            showUnderMessage(message.id, { text: content });
            return;
        }

        const author = (message.author as any)?.globalName || message.author?.username;
        const mine = message.author?.id === UserStore.getCurrentUser()?.id;
        const context = collectContext(message.channel_id, message.id)
            + (author ? `\n\nThe message below was written by ${author}.` : "");

        showUnderMessage(message.id, await aiTranslate("received", content, context, mine));
    } catch (e) {
        notify(e, "failure");
    }
}

async function explainMessage(message: Message) {
    const content = getMessageContent(message);
    if (!content) return;

    try {
        const author = (message.author as any)?.globalName || message.author?.username;
        const context = collectContext(message.channel_id, message.id)
            + (author ? `\n\nThe message below was written by ${author}.` : "");

        const result = await aiTranslate("explain", content, context);
        showUnderMessage(message.id, { ...result, explained: true });
    } catch (e) {
        notify(e, "failure");
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!getMessageContent(message)) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    const items = [
        <Menu.MenuItem
            id="vc-ai-trans"
            label={t("message.translate")}
            icon={TranslateIcon}
            leadingAccessory={{ type: "icon", icon: TranslateIcon }}
            action={() => translateMessage(message)}
        />
    ];

    if (settings.store.explain)
        items.push(
            <Menu.MenuItem
                id="vc-ai-explain"
                label={t("message.explain")}
                icon={ExplainIcon}
                leadingAccessory={{ type: "icon", icon: ExplainIcon }}
                action={() => explainMessage(message)}
            />
        );

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, ...items);
};

/** Channel and text of every message being translated on its way out. */
const inFlight = new Set<string>();

/**
 * Shared by sending and editing: translate in place, or hold the message back.
 *
 * Everything happens inside the try, the checks included. Vencord catches
 * whatever a listener throws and then sends the message anyway, so a throw
 * anywhere in here, outside the try, would send it untranslated whatever the
 * "if the translation fails" setting says.
 */
async function translateOutgoing(channelId: string, message: MessageObject) {
    const original = message.content;
    const sending = channelId + "\n" + original;

    try {
        if (!original) return;
        if (!isChannelEnabled(channelId)) return;
        // "\:)\" has nothing to translate, but its backslashes still have to go.
        if (isNotWorthTranslating(original) && !keepPieces(original, true).pieces.length) return;
        // Someone in the chat being called by name, and nothing else: there is
        // nothing to translate, and a nickname on its own is exactly what a
        // model mistakes for a word.
        if (isJustAName(original, channelId)) return;

        // A message can wait half a minute for a provider's budget, with its
        // text still in the chat box; Enter pressed again meanwhile must not
        // send it a second time.
        if (inFlight.has(sending)) return { cancel: true };
        inFlight.add(sending);

        try {
            message.content = (await aiTranslate("sent", original, collectContext(channelId))).text;
        } finally {
            inFlight.delete(sending);
        }
        rememberOriginal(original, message.content);
    } catch (e) {
        notify(e, "failure");

        // Sending the untranslated text would quietly defeat the point of the
        // plugin, so by default the message is held back. Discord keeps what
        // was typed in the chat box, so nothing is lost. Sent as typed means
        // exactly that, even if the failure came after the text was replaced.
        if (settings.store.onError === "sendAsTyped") {
            message.content = original;
            return;
        }
        return { cancel: true };
    }
}

// --- plugin ---

export default definePlugin({
    name: "AI Translate",
    description: "Translate your outgoing (and incoming) Discord messages with an LLM, per chat, without wrecking your writing style.",
    tags: ["Chat", "Utility", "Translate"],
    authors: [{ name: "「OI」茂住", id: 1418804885066874880n }],
    settings,

    // Source code and support: Vencord draws the title bar itself, so the row
    // goes here, where it lands beside the authors.
    settingsAboutComponent: SettingsHeader,

    // Whoever installed it did so to use it; hunting for a switch first is noise.
    enabledByDefault: true,

    start() {
        migrateSettings();
        scheduleUpdateCheck();
    },

    stop() {
        cancelUpdateCheck();
    },

    contextMenus: { "message": messageCtxPatch },

    renderMessageAccessory: props => <TranslationAccessory message={props.message} />,

    chatBarButton: {
        icon: TranslateIcon,
        render: AiTranslateChatBarIcon
    },

    messagePopoverButton: {
        icon: TranslateIcon,
        render(message: Message) {
            if (!getMessageContent(message)) return null;
            return {
                label: t("message.translate"),
                icon: TranslateIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => void translateMessage(message)
            };
        }
    },

    onBeforeMessageSend: (channelId: string, message: MessageObject) => translateOutgoing(channelId, message),

    // An edit is text going out under the user's name just as much as a new
    // message, so it takes the same route.
    onBeforeMessageEdit: (channelId: string, _messageId: string, message: MessageObject) => translateOutgoing(channelId, message)
});
