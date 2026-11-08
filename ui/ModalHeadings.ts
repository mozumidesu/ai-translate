/*
 * AI Translate — the two headings Vencord draws over the plugin's settings.
 *
 * "Authors" and "Settings" are written into Vencord's plugin window in
 * English, the same for every plugin, and Vencord has no way to translate
 * them. The plugin can only change them once they are drawn, so it does that
 * with care: a heading that holds nothing but that one word, inside this
 * plugin's own window. Anything else, Vencord having moved the headings or
 * begun to translate them itself, is left exactly as it is.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "../core/locales";

/** What Vencord writes, and the string that stands in for it. */
const HEADINGS = new Map([
    ["Authors", "modal.authors"],
    ["Settings", "modal.settings"]
]);

/**
 * Remembers which word a heading was drawn with: once it has been translated
 * the word is gone from it, and a change of language has to find it again.
 */
const DRAWN_AS = "data-vc-aitrans-heading";

/** The text node, when a heading is nothing but that. */
function onlyText(heading: Element) {
    const [only] = heading.childNodes;
    return heading.childNodes.length === 1 && only.nodeType === 3 ? only : null;
}

/**
 * Translates the headings of the window `inside` stands in. Safe to call after
 * every draw: a heading already in the right language is not touched.
 */
export function localizeHeadings(inside: Element | null) {
    const content = inside?.closest(".vc-settings-modal-content");
    if (!content) return;

    for (const heading of content.querySelectorAll(":scope > section > h3")) {
        const text = onlyText(heading);
        if (!text) continue;

        const drawn = heading.getAttribute(DRAWN_AS) ?? text.nodeValue?.trim() ?? "";
        const key = HEADINGS.get(drawn);
        if (!key) continue;

        heading.setAttribute(DRAWN_AS, drawn);

        const label = t(key);
        if (text.nodeValue !== label) text.nodeValue = label;
    }
}
