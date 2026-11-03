/*
 * AI Translate — AI Learn, the part that needs no Discord.
 *
 * Deciding whether a message is the writer's own attempt at the language they
 * are learning, and working out what a correction actually changed. Both are
 * done here rather than asked of a model: the first costs nothing and the
 * second has one right answer.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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
