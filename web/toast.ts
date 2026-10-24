/*
 * AI Translate — our own notices, and the shadow root everything of ours
 * lives in.
 *
 * Discord's toasts belong to Discord, and reaching into them means depending
 * on the shape of the app. A root of our own with its own styles depends on
 * nothing: Discord cannot restyle what it cannot see into, and we cannot
 * restyle Discord by accident either.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }

.toasts {
    position: fixed;
    left: 50%;
    bottom: 84px;
    transform: translateX(-50%);
    display: grid;
    gap: 8px;
    z-index: 2147483000;
    pointer-events: none;
}

.toast {
    max-width: 32rem;
    padding: 10px 16px;
    border-radius: 12px;
    background: #1A1B55;
    color: #EEEAF8;
    font-size: 14px;
    line-height: 1.45;
    border: 1px solid rgba(183, 173, 220, .18);
    box-shadow: 0 10px 30px rgba(0, 0, 0, .45);
    animation: in .16s ease-out;
}

.toast.bad { border-color: rgba(255, 120, 140, .5); }

@keyframes in { from { opacity: 0; transform: translateY(6px); } }
`;

let shadow: ShadowRoot | undefined;

/** One root for the toasts and the settings panel alike. */
export function ui(): ShadowRoot {
    if (shadow) return shadow;

    const mount = document.createElement("div");
    mount.id = "ai-translate";
    // Closed, so nothing on the page can reach in and nothing of ours leaks.
    shadow = mount.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.append(style);

    (document.body ?? document.documentElement).append(mount);
    return shadow;
}

/** Where the panel adds its own rules, so there is still only one root. */
export function addStyle(css: string) {
    const style = document.createElement("style");
    style.textContent = css;
    ui().append(style);
}

const SHOWN_MS = 7000;

export function toast(text: string, kind: "message" | "failure" = "message") {
    const root = ui();

    let shelf = root.querySelector(".toasts");
    if (!shelf) {
        shelf = document.createElement("div");
        shelf.className = "toasts";
        root.append(shelf);
    }

    const note = document.createElement("div");
    note.className = kind === "failure" ? "toast bad" : "toast";
    note.textContent = text;
    shelf.append(note);

    setTimeout(() => note.remove(), SHOWN_MS);
}
