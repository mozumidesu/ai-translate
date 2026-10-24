/*
 * AI Translate — the settings panel and the two buttons that open it.
 *
 * Vencord lends a plugin its own settings page; in a browser there is none to
 * lend, so this is ours: plain elements inside the same shadow root as the
 * notices, built from one list of fields. The texts are the plugin's own, all
 * 16 languages of them, so nothing here is written twice.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Bridge } from "../bridge";
import { isChannelEnabled, toggleChannel } from "../chats";
import { config, set } from "../host";
import { LANGUAGES } from "../languages";
import { LOCALES, t } from "../locales";
import { addStyle, ui } from "./toast";

/** Which chat is open. The address bar says it, and says it reliably. */
export function currentChannel(): string | undefined {
    return /\/channels\/[^/]+\/(\d+)/.exec(location.pathname)?.[1];
}

type Option = { value: string; label: string; };

type Field =
    | { kind: "select"; name: string; label: () => string; hint?: () => string; options: () => Option[]; }
    | { kind: "switch"; name: string; label: () => string; hint?: () => string; }
    | { kind: "text" | "secret" | "area" | "model"; name: string; label: () => string; hint?: () => string; only?: () => boolean; };

const providers = ["groq", "gemini", "glm", "anthropic", "openai"];

const FIELDS: Field[] = [
    {
        kind: "select", name: "locale",
        label: () => t("locale.name"), hint: () => t("locale.desc"),
        options: () => LOCALES.map(l => ({ value: l.value, label: l.value === "auto" ? t("locale.auto") : l.label }))
    },
    {
        kind: "select", name: "provider",
        label: () => t("provider.name"), hint: () => t("provider.desc"),
        options: () => providers.map(p => ({ value: p, label: t(`provider.${p}`) }))
    },
    {
        kind: "secret", name: "key",
        label: () => t("apiKey.name"), hint: () => t("apiKey.desc")
    },
    { kind: "model", name: "model", label: () => t("model.name"), hint: () => t("model.desc") },
    {
        kind: "text", name: "baseUrl",
        label: () => t("baseUrl.name"), hint: () => t("baseUrl.desc"),
        only: () => config().provider === "openai"
    },
    {
        kind: "select", name: "fallbackProvider",
        label: () => t("fallback.name"), hint: () => t("fallback.desc"),
        options: () => [{ value: "none", label: t("fallback.none") }, ...providers.map(p => ({ value: p, label: t(`provider.${p}`) }))]
    },
    {
        kind: "select", name: "sentLanguage",
        label: () => t("panel.sentLanguage"),
        options: () => LANGUAGES.map(l => ({ value: l.value, label: l.label }))
    },
    {
        kind: "select", name: "receivedLanguage",
        label: () => t("panel.receivedLanguage"),
        options: () => LANGUAGES.map(l => ({ value: l.value, label: l.label }))
    },
    {
        kind: "select", name: "thinkingLevel",
        label: () => t("thinking.name"), hint: () => t("thinking.desc"),
        options: () => [{ value: "low", label: t("thinking.low") }, { value: "high", label: t("thinking.high") }]
    },
    {
        kind: "select", name: "mode",
        label: () => t("mode.name"), hint: () => t("mode.desc"),
        options: () => [{ value: "perChannel", label: t("mode.perChannel") }, { value: "always", label: t("mode.always") }]
    },
    {
        kind: "select", name: "onError",
        label: () => t("onError.name"), hint: () => t("onError.desc"),
        options: () => [{ value: "hold", label: t("onError.hold") }, { value: "sendAsTyped", label: t("onError.send") }]
    },
    {
        kind: "select", name: "gender",
        label: () => t("gender.name"), hint: () => t("gender.desc"),
        options: () => [
            { value: "unset", label: t("gender.unset") },
            { value: "male", label: t("gender.male") },
            { value: "female", label: t("gender.female") }
        ]
    },
    {
        kind: "select", name: "formality",
        label: () => t("formality.name"), hint: () => t("formality.desc"),
        options: () => [
            { value: "match", label: t("formality.match") },
            { value: "informal", label: t("formality.informal") },
            { value: "formal", label: t("formality.formal") }
        ]
    },
    { kind: "switch", name: "explain", label: () => t("explain.name"), hint: () => t("explain.desc") },
    { kind: "switch", name: "useContext", label: () => t("context.name"), hint: () => t("context.desc") },
    { kind: "switch", name: "showOriginal", label: () => t("showOriginal.name"), hint: () => t("showOriginal.desc") },
    { kind: "text", name: "glossary", label: () => t("glossary.name"), hint: () => t("glossary.desc") },
    { kind: "area", name: "extraInstructions", label: () => t("extra.name"), hint: () => t("extra.desc") }
];

/** The key and the model are per provider, so their real names move with it. */
const realName = (name: string) => {
    if (name === "key") return `${config().provider}ApiKey`;
    if (name === "model") return `${config().provider}Model`;
    return name;
};

const CSS = `
.sheet {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(5, 6, 24, .6);
    z-index: 2147483100;
}

.panel {
    width: min(42rem, calc(100vw - 2rem));
    max-height: min(44rem, calc(100vh - 3rem));
    overflow: auto;
    background: #0D1038;
    color: #EEEAF8;
    border: 1px solid rgba(183, 173, 220, .16);
    border-radius: 18px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, .6);
    padding: 1.5rem 1.6rem 1.8rem;
}

.head { display: flex; align-items: center; gap: .7rem; margin-bottom: 1.2rem; }
.head h1 { font-size: 1.15rem; margin: 0; flex: 1; letter-spacing: -.01em; }

.x {
    all: unset;
    cursor: pointer;
    color: #8379B3;
    font-size: 1.4rem;
    line-height: 1;
    padding: 0 .3rem;
}
.x:hover { color: #fff; }

.field { margin-bottom: 1.05rem; }
.field label { display: block; font-size: .83rem; font-weight: 600; color: #fff; margin-bottom: .3rem; }
.field .hint { display: block; font-size: .78rem; color: #8379B3; line-height: 1.4; margin-bottom: .45rem; }

.field input, .field select, .field textarea {
    width: 100%;
    padding: .5rem .65rem;
    border-radius: 9px;
    border: 1px solid rgba(183, 173, 220, .2);
    background: #1A1B55;
    color: #EEEAF8;
    font-size: .88rem;
    font-family: inherit;
}
.field textarea { min-height: 5rem; resize: vertical; }
.field label input[type="checkbox"] { width: auto; margin: 0 .5rem 0 0; vertical-align: -1px; accent-color: #8B2BFF; }
.field label:has(input[type="checkbox"]) { cursor: pointer; }
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid #8B2BFF; outline-offset: 1px; }

.dock {
    position: fixed;
    right: 18px;
    bottom: 92px;
    display: grid;
    gap: 8px;
    z-index: 2147482000;
}

.dock button {
    all: unset;
    cursor: pointer;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #1A1B55;
    color: #B7ADDC;
    border: 1px solid rgba(183, 173, 220, .18);
    box-shadow: 0 6px 18px rgba(0, 0, 0, .4);
    font-size: 15px;
    font-weight: 700;
}
.dock button:hover { color: #fff; }
.dock button.on { background: #8B2BFF; color: #fff; border-color: #8B2BFF; }
`;

let styled = false;

function row(field: Field): HTMLElement | undefined {
    if ("only" in field && field.only && !field.only()) return undefined;

    const name = realName(field.name);
    const value = config()[name];

    const box = document.createElement("div");
    box.className = "field";

    const label = document.createElement("label");
    label.textContent = field.label();
    box.append(label);

    if (field.hint) {
        const hint = document.createElement("span");
        hint.className = "hint";
        hint.textContent = field.hint();
        box.append(hint);
    }

    if (field.kind === "select") {
        const select = document.createElement("select");

        for (const option of field.options()) {
            const item = document.createElement("option");
            item.value = option.value;
            item.textContent = option.label;
            select.append(item);
        }

        select.value = String(value ?? "");
        select.onchange = () => {
            const chosen = select.value;
            set(name, chosen === "true" ? true : chosen === "false" ? false : chosen);
            // The provider decides which key, model and address are shown,
            // and the interface language decides every word on the panel.
            if (name === "provider" || name === "locale") redraw();
        };

        box.append(select);
        return box;
    }

    if (field.kind === "switch") {
        const tick = document.createElement("input");
        tick.type = "checkbox";
        tick.checked = value === true;
        tick.onchange = () => set(name, tick.checked);

        // Inside the label, so the words switch it too.
        label.prepend(tick);
        return box;
    }

    if (field.kind === "area") {
        const area = document.createElement("textarea");
        area.value = String(value ?? "");
        area.onchange = () => set(name, area.value);
        box.append(area);
        return box;
    }

    const input = document.createElement("input");
    input.type = field.kind === "secret" ? "password" : "text";
    input.value = String(value ?? "");
    input.spellcheck = false;
    input.onchange = () => set(name, input.value);

    if (field.kind === "model") {
        // Typed freely, with whatever the provider offers as suggestions:
        // no loading state to get wrong, and an unlisted model still works.
        const list = document.createElement("datalist");
        list.id = "ai-translate-models";
        input.setAttribute("list", list.id);
        box.append(list);
        void suggestModels(list);
    }

    box.append(input);
    return box;
}

async function suggestModels(list: HTMLDataListElement) {
    const provider = String(config().provider);
    const apiKey = String(config()[`${provider}ApiKey`] ?? "");
    if (!apiKey) return;

    try {
        const { models } = await Bridge.listAiModels(JSON.stringify({ provider, apiKey, baseUrl: config().baseUrl }));

        for (const model of models) {
            const item = document.createElement("option");
            item.value = model;
            list.append(item);
        }
    } catch {
        // Suggestions are a convenience; the field works without them.
    }
}

function redraw() {
    close();
    openPanel();
}

export function close() {
    ui().querySelector(".sheet")?.remove();
}

export function openPanel() {
    if (!styled) {
        addStyle(CSS);
        styled = true;
    }

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.onclick = event => {
        if (event.target === sheet) close();
    };

    const panel = document.createElement("div");
    panel.className = "panel";

    const head = document.createElement("div");
    head.className = "head";

    const title = document.createElement("h1");
    title.textContent = t("panel.title");

    const shut = document.createElement("button");
    shut.className = "x";
    shut.textContent = "×";
    shut.onclick = close;

    head.append(title, shut);
    panel.append(head);

    for (const field of FIELDS) {
        const built = row(field);
        if (built) panel.append(built);
    }

    sheet.append(panel);
    ui().append(sheet);
}

/** Two buttons, out of Discord's way: this chat on or off, and the settings. */
export function installDock() {
    if (!styled) {
        addStyle(CSS);
        styled = true;
    }

    const dock = document.createElement("div");
    dock.className = "dock";

    const toggle = document.createElement("button");
    toggle.textContent = "文A";

    const gear = document.createElement("button");
    gear.textContent = "⚙";
    gear.title = t("panel.allSettings");
    gear.onclick = openPanel;

    const show = () => {
        const channelId = currentChannel();
        const on = !!channelId && isChannelEnabled(channelId);

        toggle.className = on ? "on" : "";
        toggle.title = channelId ? `${t(on ? "button.on" : "button.off")} — ${t("button.hint")}` : "";
        toggle.style.opacity = channelId ? "1" : ".45";
    };

    toggle.onclick = () => {
        const channelId = currentChannel();
        if (!channelId) return;
        toggleChannel(channelId);
        show();
    };

    dock.append(toggle, gear);
    ui().append(dock);

    show();
    // The address changes without a page load when a chat is opened.
    setInterval(show, 1000);
}
