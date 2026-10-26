/*
 * AI Translate — what happened, kept so it can be handed over.
 *
 * An error that shows no text, or one of a dozen in a row, cannot be reported
 * from memory. Every request and every failure leaves a line here, the
 * provider's own answer included, and the Logs panel turns the lot into text
 * to copy or to save.
 *
 * It is written to be pasted in public, so nothing secret may reach it: the
 * request, which carries the key, is never recorded, and anything key-shaped
 * in a provider's answer is masked before it is kept.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** An evening's worth of failures, and still nothing worth freeing. */
const KEPT = 200;

/** A provider's answer is the useful part of a failure, and the longest. */
const DETAIL_LIMIT = 600;

/**
 * Key shapes the providers hand out, and any long unbroken token that could be
 * one. A provider that echoes the key back must not put it in a file the user
 * is about to attach to a public report.
 */
const SECRETS = [
    /\b(?:sk|gsk|xai|sk-ant|sk-proj)[-_][A-Za-z0-9_-]{8,}/g,
    /\bAIza[A-Za-z0-9_-]{10,}/g,
    /\b[A-Fa-f0-9]{32}\.[A-Za-z0-9_-]{8,}/g,
    /("(?:api_?key|authorization|token)"\s*:\s*")[^"]+/gi
];

function masked(text: string) {
    let out = text;
    for (const pattern of SECRETS)
        out = out.replace(pattern, (whole, keep) => (keep ? `${keep}***` : "***"));

    return out;
}

export interface Entry {
    at: number;
    level: "info" | "error";
    /** What was going on: a kind of request, an update, a report. */
    what: string;
    text: string;
    /** The provider's own answer, where there was one. */
    detail?: string;
}

const kept: Entry[] = [];

export function record(level: Entry["level"], what: string, text: string, detail?: string) {
    kept.push({
        at: Date.now(),
        level,
        what,
        text: masked(String(text ?? "")).slice(0, DETAIL_LIMIT),
        detail: detail ? masked(String(detail)).replace(/\s+/g, " ").trim().slice(0, DETAIL_LIMIT) : undefined
    });

    if (kept.length > KEPT) kept.splice(0, kept.length - KEPT);
}

export const entries = (): Entry[] => kept.slice();

export const howMany = () => kept.length;

export function clear() {
    kept.length = 0;
}

/** One line per entry, oldest first, ready to paste or to save. */
export function asText() {
    if (!kept.length) return "";

    return kept.map(e => {
        const when = new Date(e.at).toISOString().replace("T", " ").slice(0, 19);
        const head = `${when}  ${e.level === "error" ? "ERROR" : "info "}  ${e.what}  ${e.text}`;
        return e.detail ? `${head}\n${" ".repeat(21)}${e.detail}` : head;
    }).join("\n");
}
