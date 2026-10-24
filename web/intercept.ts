/*
 * AI Translate — catching a message on its way out, in a browser.
 *
 * Vencord hands a plugin the message before Discord sends it. In a browser
 * there is no such hook, so the message is caught where it leaves the page:
 * the request that carries it. Discord posts a new message to
 * /api/v9/channels/<id>/messages and an edit to the same path plus the
 * message id, and those two addresses have been the same for years, which is
 * far more than can be said for the modules inside the app.
 *
 * It also means the untranslated text physically cannot leave: if the
 * translation fails and the setting says not to send, the original request is
 * never made at all.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isChannelEnabled } from "../core/chats";
import { config, notice } from "../core/host";
import { keepPieces } from "../core/keep";
import { aiTranslate, isNotWorthTranslating } from "../core/translate";

/** Thrown instead of a translation when the message must not go out. */
class Held extends Error { }

const SEND = /\/api\/v\d+\/channels\/(\d+)\/messages(?:\?|$)/;
const EDIT = /\/api\/v\d+\/channels\/(\d+)\/messages\/\d+(?:\?|$)/;

/** The chat this request is sending to, or nothing if it is not a message. */
export function outgoingChannel(method: string, url: string): string | undefined {
    const how = String(method ?? "GET").toUpperCase();
    const where = String(url ?? "");

    if (how === "POST") return SEND.exec(where)?.[1];
    if (how === "PATCH" || how === "PUT") return EDIT.exec(where)?.[1];
    return undefined;
}

/**
 * Discord sends the same message again when the first attempt fails, and a
 * retry must not cost another translation: the answer from a moment ago is
 * reused, and a refusal is refused again at once.
 */
const recent = new Map<string, { text?: string; held?: boolean; }>();
const REMEMBER_MS = 60_000;

const remember = (key: string, what: { text?: string; held?: boolean; }) => {
    recent.set(key, what);
    setTimeout(() => recent.delete(key), REMEMBER_MS);
};

/** Being translated right now, so a second Enter does not start another. */
const inFlight = new Map<string, Promise<string>>();

/**
 * The body of a message request, translated in place. Returns the body to
 * send, which is the one that came in when there is nothing to do.
 */
export async function patchPayload(channelId: string, raw: string): Promise<string> {
    let payload: any;
    try {
        payload = JSON.parse(raw);
    } catch {
        // Not something we know how to read; let it go as it is.
        return raw;
    }

    const original = typeof payload?.content === "string" ? payload.content : "";

    if (!original) return raw;
    if (!isChannelEnabled(channelId)) return raw;
    // "\:)\" has nothing to translate, but its backslashes still have to go.
    if (isNotWorthTranslating(original) && !keepPieces(original, true).pieces.length) return raw;

    const key = channelId + "\n" + original;
    const already = recent.get(key);

    if (already?.held) throw new Held("held back a moment ago");
    if (already?.text !== undefined) {
        payload.content = already.text;
        return JSON.stringify(payload);
    }

    try {
        let waiting = inFlight.get(key);

        if (!waiting) {
            // The conversation above the message would go here. The browser
            // host cannot read it yet, and the core does without.
            waiting = aiTranslate("sent", original).then(result => result.text);
            inFlight.set(key, waiting);

            // The failure is dealt with below, where it is awaited. Hanging
            // the cleanup straight off this promise would leave a second,
            // unwatched one to reject into nobody's hands.
            void waiting.catch(() => undefined).finally(() => inFlight.delete(key));
        }

        const text = await waiting;
        remember(key, { text });
        payload.content = text;
        return JSON.stringify(payload);
    } catch (e) {
        notice(e instanceof Error ? e.message : String(e), "failure");

        // Sending the untranslated text would quietly defeat the point of the
        // plugin, so by default the message is held back.
        if (config().onError === "sendAsTyped") return raw;

        remember(key, { held: true });
        throw new Held(e instanceof Error ? e.message : String(e));
    }
}

/** Multipart, which is how a message with a file attached travels. */
async function patchForm(channelId: string, form: FormData): Promise<FormData> {
    const payload = form.get("payload_json");
    if (typeof payload !== "string") return form;

    const patched = await patchPayload(channelId, payload);
    if (patched !== payload) form.set("payload_json", patched);
    return form;
}

/**
 * What Discord is told when a message is held back. A refusal rather than a
 * server fault, so its own client treats it as final and does not keep
 * trying; the reason is in the shape Discord's errors come in, which is also
 * where its own interface looks for something to show.
 */
const refusal = (why: string) =>
    new Response(JSON.stringify({ code: 0, message: `AI Translate: ${why}` }), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" }
    });

export function install(scope: any = window) {
    const nativeFetch = scope.fetch;

    scope.fetch = async function (input: any, init?: any) {
        const url = typeof input === "string" ? input : input?.url;
        const method = init?.method ?? input?.method;
        const channelId = outgoingChannel(method, url);

        if (!channelId) return nativeFetch.call(this, input, init);

        try {
            // A body passed beside the address is the usual way; a Request
            // object carrying its own is the other, and reading that consumes
            // it, so it is read from a copy.
            if (init && typeof init.body === "string")
                return nativeFetch.call(this, input, { ...init, body: await patchPayload(channelId, init.body) });

            if (init && typeof FormData !== "undefined" && init.body instanceof FormData)
                return nativeFetch.call(this, input, { ...init, body: await patchForm(channelId, init.body) });

            if (typeof Request !== "undefined" && input instanceof Request && input.body) {
                const type = input.headers.get("content-type") ?? "";

                if (type.includes("json")) {
                    const body = await input.clone().text();
                    return nativeFetch.call(this, new Request(input, { body: await patchPayload(channelId, body) }));
                }

                if (type.includes("multipart")) {
                    const form = await patchForm(channelId, await input.clone().formData());
                    return nativeFetch.call(this, new Request(input, { body: form }));
                }
            }
        } catch (e) {
            if (e instanceof Held) return refusal(e.message);

            // Anything else here is our own bug, and a bug of ours is not a
            // reason to swallow somebody's message.
            console.error("[AI Translate]", e);
        }

        return nativeFetch.call(this, input, init);
    };

    // Discord's own HTTP layer has used XMLHttpRequest for most of its life,
    // and which of the two it uses today is not worth finding out: both cost
    // a few lines.
    const open = scope.XMLHttpRequest?.prototype?.open;
    const send = scope.XMLHttpRequest?.prototype?.send;
    if (!open || !send) return;

    scope.XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
        (this as any).__aiTranslate = outgoingChannel(method, url);
        return open.call(this, method, url, ...rest);
    };

    scope.XMLHttpRequest.prototype.send = function (body?: any) {
        const channelId = (this as any).__aiTranslate;
        if (!channelId) return send.call(this, body);

        const ready = typeof body === "string"
            ? patchPayload(channelId, body)
            : (typeof FormData !== "undefined" && body instanceof FormData)
                ? patchForm(channelId, body)
                : Promise.resolve(body);

        // The request stays open while this runs; sending it is simply later.
        ready.then(
            patched => send.call(this, patched),
            e => {
                if (e instanceof Held) return this.abort();

                console.error("[AI Translate]", e);
                send.call(this, body);
            }
        );
    };
}
