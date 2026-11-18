/*
 * AI Translate — the few things the translation core cannot know by itself.
 *
 * Settings, the messages above the one being translated, who the signed-in
 * user is and how to show a notice all belong to whatever the plugin is
 * running inside. On the desktop and in Vencord's web builds that is Vencord;
 * in a build of our own, for Discord in a browser tab, it will be our own
 * code. The core asks through here, so everything a new host has to provide
 * is one short list in one small file.
 *
 * Three more things are asked here and may be left unsaid: what the chat is
 * called in the prompts, how it writes text (dialect.ts) and which language
 * the app is shown in. Unsaid, they are Discord's, and English for the
 * language, so a host written before they existed behaves as it did.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { dialectNamed, type Dialect, type DialectName } from "./dialect";

/** The settings the core reads. Where the host keeps them is its business. */
export interface Config {
    provider: string;
    baseUrl: string;
    fallbackProvider: string;
    sentLanguage: string;
    receivedLanguage: string;
    gender: string;
    formality: string;
    glossary: string;
    extraInstructions: string;
    useContext: boolean;
    /** Which language the plugin speaks, or "auto" to follow the app. */
    locale: string;
    /** A key and a model for each provider, read as `${provider}ApiKey`. */
    [name: string]: unknown;
}

/** A message already in the conversation, as the context prompt wants it. */
export interface Said {
    id: string;
    authorId?: string;
    authorName?: string;
    content: string;
}

export interface Host {
    config(): Config;
    /** Changes one setting. Which chats are switched on is a setting too. */
    set(name: string, value: unknown): void;
    /** This channel's messages, oldest first. Nothing is a fine answer. */
    recent(channelId: string): Said[];
    /** The signed-in user, so their own messages are told apart. */
    meId(): string | undefined;
    notice(text: string, kind: "message" | "failure"): void;

    /** What the chat is called in the prompts: "inside a Discord chat client", "one Discord message". */
    appName?(): string;
    /** How the chat writes text, which decides what is kept as typed and what is put back. */
    dialect?(): DialectName;
    /** The language the app itself is shown in, as a locale code: what a plugin set to follow the app speaks. */
    appLocale?(): string;
}

/**
 * Until a host is installed the core answers from nothing rather than
 * throwing out of somewhere deep: settings come back empty, which reads as
 * "not set up yet" everywhere they are used, and a notice goes to the
 * console. The entry point installs the real one as it loads, so this is what
 * a module that runs even earlier sees, and nothing more.
 */
const NONE: Host = {
    config: () => ({} as Config),
    set: () => {},
    recent: () => [],
    meId: () => undefined,
    notice: (text, kind) => console.warn("[AI Translate]", kind, text)
};

let installed = NONE;

export const useHost = (host: Host) => {
    installed = host;
};

export const config = () => installed.config();
export const set = (name: string, value: unknown) => installed.set(name, value);
export const recent = (channelId: string) => installed.recent(channelId);
export const meId = () => installed.meId();
export const notice = (text: string, kind: "message" | "failure") => installed.notice(text, kind);
export const appName = () => installed.appName?.() || "Discord";
export const dialect = (): Dialect => dialectNamed(installed.dialect?.());
export const appLocale = () => installed.appLocale?.() || "en";
