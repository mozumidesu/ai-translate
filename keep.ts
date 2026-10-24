/*
 * AI Translate — the parts of a message that stay as they are.
 *
 * Code is never translated. In the writer's own messages, neither is anything
 * fenced off with backslashes: \carpe diem\ keeps a phrase, and a backslash at
 * the start of a line keeps the whole line. The backslashes themselves go.
 * Faces drawn with a backslash, \o/ or \ ^^ /, are not markers: they are kept
 * whole, backslash included. And in both directions, so are the words the
 * user listed in the glossary as never to be translated: a name asked to stay
 * as it is should not depend on the model remembering a rule.
 *
 * Kept parts leave the text before the model sees it, as numbered
 * placeholders, and are put back afterwards — so they come out exactly as
 * typed, whatever the model does with the words around them.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface KeptPiece {
    /** Exactly what goes back into the message. */
    text: string;
    /** Code, a stretch the writer fenced off, a face drawn with a backslash, or a word from the glossary. */
    kind: "code" | "kept" | "face" | "word";
}

export interface Kept {
    /** The message with every kept part replaced by its placeholder. */
    masked: string;
    pieces: KeptPiece[];
    /** What the model is told about the placeholders. */
    note(): string;
    /** A firmer word for the second attempt. */
    nudge(): string;
    /** Text with the placeholders taken out, to judge what is left to translate. */
    bare(text: string): string;
    /** Every placeholder present exactly once. */
    complete(answer: string): boolean;
    /** The answer with the kept parts back in, or null if one cannot be put back. */
    restore(answer: string): string | null;
}

// ── placeholders ──

interface Form {
    make(n: number): string;
    /** Also accepts what models turn a placeholder into: full-width brackets, native digits, spaces. */
    find: RegExp;
    /** A form is only used when nothing like it is in the message already. */
    clash: RegExp;
}

const FORMS: Form[] = [
    {
        make: n => `{{${n}}}`,
        find: /[{｛]{1,2}[ \t]*(\p{Nd}{1,3})[ \t]*[}｝]{1,2}/gu,
        clash: /[{}｛｝]/
    },
    {
        make: n => `⟦${n}⟧`,
        find: /⟦[ \t]*(\p{Nd}{1,3})[ \t]*⟧/gu,
        clash: /[⟦⟧]/
    }
];

/** Where "0" sits in the digit sets models are likely to switch to. */
const ZEROS = [0x30, 0x660, 0x6F0, 0x966, 0x9E6, 0xE50, 0xFF10];

function numberOf(digits: string) {
    let value = 0;

    for (const ch of digits) {
        const code = ch.codePointAt(0)!;
        const zero = ZEROS.find(z => code >= z && code <= z + 9);
        if (zero === undefined) return NaN;
        value = value * 10 + code - zero;
    }

    return value;
}

// ── finding the kept parts ──

/** Fenced blocks first, then inline code in double and in single backticks. */
const CODE = /```[\s\S]*?```|``(?:[^`\n]|`(?!`))+?``|`[^`\n]+`/g;

/** Discord's own escapes — \*, \_, \:emoji:, \@everyone — are not markers. */
const ESCAPED = new Set([..."\\*_~`|<>#:@[]-()/"]);

/**
 * Faces drawn with a backslash. Arms raised: \o/, \m/, \^^/, \ ^^ /, \(^o^)/,
 * \ (•◡•) /, a backslash, a few marks and a slash. And the shrug, ¯\_(ツ)_/¯,
 * also typed ¯\\_(ツ)_/¯ the way Discord needs it.
 */
const FACE = /(?<![\p{L}\p{N}\\])\\{1,2}[^\S\n]*([^\s\\/`][^\\/`\n]{0,9}?)[^\S\n]*\/(?![\p{L}\p{N}])|¯\\{1,2}_\(ツ\)_\/¯/gu;

/** Between the arms: a few marks, not a word. \o/ and \owo/ are faces, \this/that is not. */
function looksLikeFace(between: string) {
    if (/\p{L}{4,}/u.test(between)) return false;
    return /[^\p{L}\p{N}\s]/u.test(between) || between.replace(/\s/g, "").length <= 3;
}

/** A marker opens after a space or an opening bracket or quote, never mid-word. */
const OPENERS = new Set([..."([{\"'«„“‘‹（「『【"]);

/** Discord markdown that may stand in front of a line-long marker. */
const LINE_START = /^[ \t]*(?:#{1,3}[ \t]+|-#[ \t]+|>{1,3}[ \t]+|[-*][ \t]+|\d+\.[ \t]+)?[ \t]*$/;

interface Span {
    start: number;
    end: number;
    piece: KeptPiece;
    /** Spaces inside the markers stay in the text, around the placeholder. */
    before: string;
    after: string;
}

function findCode(text: string): Span[] {
    return [...text.matchAll(CODE)].map(m => ({
        start: m.index!,
        end: m.index! + m[0].length,
        piece: { text: m[0], kind: "code" },
        before: "",
        after: ""
    }));
}

function findFaces(text: string, code: Span[]): Span[] {
    const faces: Span[] = [];
    FACE.lastIndex = 0;

    for (let m = FACE.exec(text); m; m = FACE.exec(text)) {
        const start = m.index;
        const end = start + m[0].length;

        const inCode = code.some(c => start < c.end && end > c.start);
        if (inCode || (m[1] !== undefined && !looksLikeFace(m[1]))) {
            FACE.lastIndex = start + 1;
            continue;
        }

        faces.push({ start, end, piece: { text: m[0], kind: "face" }, before: "", after: "" });
    }

    return faces;
}

function findMarkers(text: string, code: Span[], faces: Span[]): Span[] {
    const spans: Span[] = [];
    // Neither code nor a face can open or close a marker.
    const skipAt = (i: number) =>
        code.find(c => i >= c.start && i < c.end) ?? faces.find(f => i >= f.start && i < f.end);

    let lineStart = 0;

    while (lineStart <= text.length) {
        let lineEnd = text.indexOf("\n", lineStart);
        if (lineEnd === -1) lineEnd = text.length;

        let i = lineStart;

        while (i < lineEnd) {
            const skip = skipAt(i);
            if (skip) { i = skip.end; continue; }

            if (text[i] !== "\\") { i++; continue; }

            const next = text[i + 1] ?? "";
            const prev = i > lineStart ? text[i - 1] : "";
            const atLineStart = LINE_START.test(text.slice(lineStart, i));

            const opens = (atLineStart || /\s/.test(prev) || OPENERS.has(prev))
                && next !== "" && next !== "\n"
                && !ESCAPED.has(next)
                // "\ text" only at the start of a line; mid-line it is a stray backslash
                && (!/\s/.test(next) || atLineStart);

            if (!opens) { i++; continue; }

            let close = -1;

            for (let j = i + 1; j < lineEnd; j++) {
                const skip = skipAt(j);
                if (skip) { j = skip.end - 1; continue; }
                if (text[j] !== "\\") continue;

                const after = text[j + 1] ?? "";
                const inside = text.slice(i + 1, j);

                if (inside.trim() && !/[\p{L}\p{N}]/u.test(after)) { close = j; break; }
            }

            let end = close >= 0 ? close + 1 : atLineStart ? lineEnd : -1;
            if (end < 0) { i++; continue; }

            // A code block that opens on this line and runs on past it is kept
            // on its own; the line gives way to it.
            if (close < 0) {
                const straddling = code.find(c => c.start > i && c.start < end && c.end > end);
                if (straddling) end = straddling.start;
            }

            const inside = text.slice(i + 1, close >= 0 ? close : end);
            const trimmed = inside.trim();

            if (!trimmed) { i++; continue; }

            // A backslash that opens a line with not a letter or a digit after
            // it is part of a drawing, \ ^^ or \ :(, and stays where it is.
            if (close < 0 && !/[\p{L}\p{N}]/u.test(trimmed)) { i++; continue; }

            spans.push({
                start: i,
                end,
                piece: { text: trimmed, kind: "kept" },
                before: inside.match(/^\s*/)![0],
                after: inside.match(/\s*$/)![0]
            });

            i = end;
        }

        lineStart = lineEnd + 1;
    }

    return spans;
}

/** Links, mentions, custom emoji, timestamps and :shortcodes: — a glossary word inside one is not a word. */
const NOT_WORDS = /https?:\/\/\S+|www\.\S+|<[^>\s]+>|:[\w~-]+:/g;

/**
 * Every whole-word occurrence of a glossary word, in any case, kept exactly as
 * the writer typed it. Longer entries go first, so "Kai Chan" wins over "Kai".
 */
function findWords(text: string, words: string[], taken: Span[]): Span[] {
    const spans: Span[] = [];
    const blocked = [...text.matchAll(NOT_WORDS)].map(m => ({ start: m.index!, end: m.index! + m[0].length }));
    const overlaps = (start: number, end: number) =>
        [...taken, ...spans, ...blocked].some(s => start < s.end && end > s.start);

    const sorted = [...new Set(words.map(w => w.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);

    for (const word of sorted) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");

        for (const m of text.matchAll(pattern)) {
            const start = m.index!;
            const end = start + m[0].length;
            if (overlaps(start, end)) continue;
            spans.push({ start, end, piece: { text: m[0], kind: "word" }, before: "", after: "" });
        }
    }

    return spans;
}

/**
 * The kept parts of a message. `markers` is for the writer's own messages,
 * where backslashes fence text off; `words` are the glossary's never-translate
 * entries, kept in either direction.
 */
export function keepPieces(text: string, markers: boolean, words: string[] = []): Kept {
    const code = findCode(text);
    // Markers and faces belong to the writer's own messages; received ones only keep their code.
    const faces = markers ? findFaces(text, code) : [];
    const fenced = markers ? findMarkers(text, code, faces) : [];

    // Code or a face inside a fenced-off stretch is simply part of that stretch.
    const outer = [
        ...fenced,
        ...[...code, ...faces].filter(c => !fenced.some(f => c.start >= f.start && c.end <= f.end))
    ];

    // A glossary word inside code, a face or a fenced-off stretch is already kept.
    const spans = [...outer, ...findWords(text, words, outer)].sort((a, b) => a.start - b.start);

    let outside = "";
    let at = 0;
    for (const span of spans) {
        outside += text.slice(at, span.start) + "\n";
        at = span.end;
    }
    outside += text.slice(at);

    const form = FORMS.find(f => !f.clash.test(outside)) ?? FORMS[0];

    let masked = "";
    at = 0;
    spans.forEach((span, index) => {
        masked += text.slice(at, span.start) + span.before + form.make(index + 1) + span.after;
        at = span.end;
    });
    masked += text.slice(at);

    const pieces = spans.map(s => s.piece);
    const tokens = pieces.map((_, index) => form.make(index + 1));

    const counts = (answer: string) => {
        const seen = new Array(pieces.length + 1).fill(0);
        for (const m of answer.matchAll(form.find)) {
            const n = numberOf(m[1]);
            if (n >= 1 && n <= pieces.length) seen[n]++;
        }
        return seen;
    };

    return {
        masked,
        pieces,

        note() {
            if (!pieces.length) return "";

            const described = pieces.map((piece, index) => {
                const token = tokens[index];
                if (piece.kind === "code")
                    return piece.text.length <= 60 && !piece.text.includes("\n")
                        ? `${token} is a piece of code: ${piece.text}`
                        : `${token} is a block of code`;

                if (piece.kind === "face") return `${token} is an emoticon: ${piece.text}`;

                if (piece.kind === "word") return `${token} is a name or a term that is never translated: "${piece.text}"`;

                const shown = piece.text.length > 150 ? piece.text.slice(0, 150) + "…" : piece.text;
                return `${token} is text the writer keeps in its original form: "${shown}"`;
            });

            return "\n\nParts of the message have been replaced by placeholders: "
                + tokens.join(", ") + ". Each one stands for something that must stay exactly as"
                + " the writer typed it. Copy every placeholder into your answer exactly once,"
                + " unchanged — the same brackets, the same ASCII digits — at the point where that"
                + " part belongs in the translated sentence. Never translate, explain, repeat or"
                + " drop a placeholder, and never write out what it stands for."
                + "\nWhat they stand for, so the sentence around them comes out right:\n"
                + described.join("\n");
        },

        nudge() {
            return `\n\nIMPORTANT: your previous answer did not contain each placeholder (${tokens.join(", ")})`
                + " exactly once. Translate the message again and copy every placeholder exactly"
                + " once, unchanged.";
        },

        bare(answer: string) {
            return answer.replace(form.find, " ");
        },

        complete(answer: string) {
            return counts(answer).slice(1).every(n => n === 1);
        },

        restore(answer: string) {
            const seen = counts(answer);

            for (let n = 1; n <= pieces.length; n++) {
                if (seen[n] > 1) return null;
                // A model that wrote the kept part out in full instead of its
                // placeholder did no harm, as long as it wrote it out unchanged.
                if (seen[n] === 0 && !answer.includes(pieces[n - 1].text)) return null;
            }

            return answer.replace(form.find, (whole, digits) => {
                const n = numberOf(digits);
                return n >= 1 && n <= pieces.length ? pieces[n - 1].text : whole;
            });
        }
    };
}
