/*
 * AI Translate — AI Learn, the part that needs no Discord.
 *
 * Deciding whether a message is the writer's own attempt at the language they
 * are learning, working out what a correction actually changed, and keeping
 * the corrections that have been made. The first two are done here rather than
 * asked of a model: one costs nothing and the other has one right answer.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config, set } from "./host";

/** Below this many words a correction is pedantry: "ok", "thanks", "lol". */
const ENOUGH_WORDS = 4;

/** What a word is, for counting and for comparing: letters and digits. */
const WORDS = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

export const wordsOf = (text: string) => text.match(WORDS) ?? [];

/**
 * Whether this looks like the writer having a go at the target language
 * themselves, rather than a message to translate.
 *
 * `share` is how much of the text is written in the target language's own
 * script, which the core works out already. Script alone decides it for the
 * pairs that differ in alphabet, and for the pairs that do not — Russian into
 * Ukrainian, English into German — nothing here can tell, so the model's own
 * reading settles it later, after a request that would have been made anyway.
 */
export function looksLikeOwnAttempt(typed: string, share: number) {
    return share >= 0.97 && wordsOf(typed).length >= ENOUGH_WORDS;
}

/**
 * The model answers with the corrected message, and one last line saying what
 * was wrong when it changed anything. The marker is needed because a message
 * can run to several lines of its own, so position alone cannot tell them
 * apart; it is only ever read off the last line.
 */
const WHY = /^\s*why\s*:\s*/i;

export function splitCorrection(answer: string) {
    const lines = answer.split("\n");
    const last = lines[lines.length - 1] ?? "";

    if (lines.length > 1 && WHY.test(last))
        return { native: lines.slice(0, -1).join("\n").trimEnd(), why: last.replace(WHY, "").trim() };

    return { native: answer, why: "" };
}

/** A correction worth keeping: what was written, what it should have been. */
export interface Correction {
    typed: string;
    native: string;
    why: string;
    at: number;
}

/**
 * How many are kept. Enough to look back over a few days of writing, small
 * enough that the settings file stays a settings file.
 */
const KEPT = 50;

export function keptCorrections(): Correction[] {
    try {
        const kept = JSON.parse(String(config().learnHistory || "[]"));
        return Array.isArray(kept) ? kept.filter(c => c?.typed && c?.native) : [];
    } catch {
        // Written by a newer version, or by hand: better empty than thrown.
        return [];
    }
}

/** Keeps a correction, newest first. The same mistake twice is kept twice. */
export function keepCorrection(entry: Correction) {
    set("learnHistory", JSON.stringify([entry, ...keptCorrections()].slice(0, KEPT)));
}

export function forgetCorrections() {
    set("learnHistory", "");
}

export interface Part {
    text: string;
    /** Whether the correction put this here or left it out. */
    changed: boolean;
}

/**
 * What a correction changed, word by word. The longest run of words both
 * versions share is found first, so the parts that did not move are recognised
 * as unmoved even when a word is added in the middle.
 */
export function changedWords(before: string, after: string): Part[] {
    const a = wordsOf(before.toLowerCase());
    const b = wordsOf(after.toLowerCase());
    const shown = after.match(WORDS) ?? [];

    // Longest common subsequence, by length only: the table is small because a
    // chat message is short, and the words themselves are compared once.
    const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);

    const parts: Part[] = [];
    let i = 0, j = 0;
    while (j < b.length) {
        if (i < a.length && a[i] === b[j]) {
            parts.push({ text: shown[j], changed: false });
            i++; j++;
        } else if (i < a.length && table[i + 1][j] >= table[i][j + 1]) {
            // A word of the original that the correction dropped: nothing to show.
            i++;
        } else {
            parts.push({ text: shown[j], changed: true });
            j++;
        }
    }

    return parts;
}

/** Nothing to show when the correction is the message again. */
export const sameMessage = (before: string, after: string) =>
    wordsOf(before.toLowerCase()).join(" ") === wordsOf(after.toLowerCase()).join(" ");
