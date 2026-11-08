/*
 * AI Translate — how a chat writes text.
 *
 * Discord draws things out of what a person types: <@123> is a mention, "# "
 * at the start of a line is a heading, a backslash before a mark is an escape.
 * A rule about any of that is wrong in a chat that draws none of it, so those
 * rules are gathered here, one record for each way of writing, and the core
 * asks the host which one it is in (host.ts). A host that says nothing is in
 * Discord, which is what the plugin was written for.
 *
 * What every chat has stays where it is: links, :shortcodes:, code in
 * backticks, faces drawn with a backslash, and the writer's own \fragments\.
 * So do the heuristics that treat anything in angle brackets as markup rather
 * than writing: they cost nothing where there is none.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type DialectName = "discord" | "plain" | "telegram";

export interface Dialect {
    name: DialectName;
    /** Each form of id the chat writes for something it draws itself: Discord's <@123>, Telegram's @username. Global, and taken out one after another. */
    ids: RegExp[];
    /** Those ids as words a model can use, where it is told who is who: a mention becomes the name `names` has for it. */
    readIds(text: string, names: Map<string, string>): string;
    /** What the prompts say the chat draws itself, each in the shape a model will meet it. */
    prompt: {
        /** What is drawn from an id. */
        ids: string[];
        /** What is drawn from marks around text. */
        marks: string[];
        /** Markdown that is only drawn at the start of a line, or "" where there is none. */
        lines: string;
    };
    /** The start of a line the chat draws as markdown: a heading, a quote, a list item. Null where it draws none. */
    lineMark: RegExp | null;
    /** What may stand in front of a backslash that fences off a whole line: spaces, and that same markdown. */
    lineStart: RegExp;
    /** The marks a backslash escapes, which is not a fence of the writer's own. A chat with none leaves a backslash as typed. */
    escapes: ReadonlySet<string>;
}

export const DISCORD: Dialect = {
    name: "discord",

    ids: [
        // A custom emoji; a mention, a role or a channel; a timestamp.
        /<a?:\w+:\d+>/g,
        /<[@#][!&]?\d+>/g,
        /<t:\d+(?::[tTdDfFR])?>/g
    ],

    readIds: (text, names) => text
        // A custom emoji keeps its name, which carries a little meaning.
        .replace(/<a?:(\w+):\d+>/g, ":$1:")
        // A mention is a number until it is a name.
        .replace(/<@!?(\d+)>/g, (_, id) => names.get(id) ?? "(someone)")
        // The rest name nothing a reader could use, but taking them out
        // altogether leaves a hole: "про который ты говорил в" reads worse
        // than the number did. A word of the right shape goes in their place.
        .replace(/<@&\d+>/g, "(a role)")
        .replace(/<#\d+>/g, "(a channel)")
        .replace(/<t:\d+(?::[tTdDfFR])?>/g, "(a time)"),

    prompt: {
        ids: ["custom emoji <:name:123>", "mentions <@123>", "roles <@&123>", "channels <#123>", "timestamps <t:123:R>"],
        marks: ["spoilers ||like this||"],
        lines: "headings (#, ##, ###), subtext (-#), quotes (>), bullets (- or *) and numbered list markers"
    },

    // Discord markdown that only works at the very start of a line.
    lineMark: /^(\s*(?:#{1,3}\s|-#\s|>{1,3}\s|[-*]\s|\d+\.\s))/,

    // The same markdown, as it may stand in front of a line-long marker.
    lineStart: /^[ \t]*(?:#{1,3}[ \t]+|-#[ \t]+|>{1,3}[ \t]+|[-*][ \t]+|\d+\.[ \t]+)?[ \t]*$/,

    // Discord's own escapes — \*, \_, \:emoji:, \@everyone — are not markers.
    escapes: new Set([..."\\*_~`|<>#:@[]-()/"])
};

/** Text and nothing drawn out of it: no ids, no markdown, no escapes. */
export const PLAIN: Dialect = {
    name: "plain",
    ids: [],
    readIds: text => text,
    prompt: { ids: [], marks: [], lines: "" },
    lineMark: null,
    lineStart: /^[ \t]*$/,
    escapes: new Set<string>()
};

/**
 * Telegram: no raw ids, a username drawn as a link, and formatting written as
 * marks around the text, which is how a host hands a formatted message over.
 */
export const TELEGRAM: Dialect = {
    name: "telegram",

    // A letter, then letters, digits and underscores, up to 32 in all; never the middle of an address.
    ids: [/(?<![\w@.])@[A-Za-z]\w{3,31}(?!\w)/g],

    // An @username already reads as a name.
    readIds: text => text,

    prompt: {
        ids: ["mentions @username"],
        // Links are named: unnamed, one went missing whole, address and all, 1 run in 3.
        marks: ["bold **like this**", "italic __like this__", "strikethrough ~~like this~~", "spoilers ||like this||", "links [like this](https://example.com)"],
        lines: ""
    },

    lineMark: null,
    lineStart: /^[ \t]*$/,

    // Telegram shows a backslash as typed.
    escapes: new Set<string>()
};

const ALL = new Map<string, Dialect>([["discord", DISCORD], ["plain", PLAIN], ["telegram", TELEGRAM]]);

/** The dialect a host named: Discord's when it named none, or one this version has not heard of. */
export const dialectNamed = (name?: string): Dialect => ALL.get(name ?? "") ?? DISCORD;
