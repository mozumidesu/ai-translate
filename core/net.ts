/*
 * AI Translate — one HTTP request, wherever the plugin happens to run.
 *
 * The rest of the plugin asks for a request through here, so the one thing
 * that differs between hosts stays in one place. Electron's main process has no
 * CORS and hands over Chromium's own fetch; a page inside a browser cannot call
 * fetch freely, because CORS stops it, and a userscript manager or an extension
 * each have their own way around that.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface NetRequest {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    /** One deadline for a whole exchange: the same signal goes to every try. */
    signal?: AbortSignal;
}

export interface NetResponse {
    /** What the provider answered, or -1 when there was no answer at all. */
    status: number;
    data: string;
    /** Header by name, case ignored; one that was not sent gives null. */
    header(name: string): string | null;
}

export type Net = (request: NetRequest) => Promise<NetResponse>;

const noHeaders = () => null;

/** As much of fetch as a Net needs, so a host can hand over a fetch of its own. */
export type Fetch = (url: string, init: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
}) => Promise<{ status: number; headers: { get(name: string): string | null; }; text(): Promise<string>; }>;

const messageOf = (e: any) => typeof e?.message === "string" ? e.message.trim() : "";

/**
 * Why a request got no answer. Node's fetch says only "fetch failed" and keeps
 * the reason in `cause`, so a log of it could not tell a name that did not
 * resolve from a refused connection. Chromium's net::ERR_ name is its message.
 */
export function failureOf(e: unknown): string {
    const said = String(e);
    const cause = (e as { cause?: any; } | null)?.cause;
    if (!cause || typeof cause !== "object") return said;

    // Two addresses tried at once each fail on their own, under one code.
    let reason = messageOf(cause) || (Array.isArray(cause.errors) ? cause.errors.map(messageOf).filter(Boolean).join("; ") : "");
    const code = typeof cause.code === "string" ? cause.code : "";
    if (code && !reason.includes(code)) reason = reason ? `${code}: ${reason}` : code;

    return reason ? `${said} (${reason})` : said;
}

/** A fetch as a Net: a failure is the -1 the rest of the plugin reads, cause included. */
export function netOf(fetcher: Fetch): Net {
    return async ({ url, method = "GET", headers, body, signal }) => {
        try {
            const res = await fetcher(url, { method, headers, body, signal });
            return { status: res.status, data: await res.text(), header: name => res.headers.get(name) };
        } catch (e) {
            return { status: -1, data: failureOf(e), header: noHeaders };
        }
    };
}

/**
 * Plain fetch, for Vencord's userscript build, where fetch itself has been
 * replaced by a wrapper around the userscript manager's own request. Electron's
 * main process has it too, but it is Node's and ignores the proxy Discord
 * follows, so native.ts hands over Chromium's instead.
 */
export const fetchNet: Net = netOf((url, init) => fetch(url, init));

/** Headers as a userscript manager reports them: one "name: value" per line. */
function readHeaders(raw: string | undefined) {
    const found = new Map<string, string>();

    for (const line of (raw ?? "").split("\n")) {
        const at = line.indexOf(":");
        if (at < 1) continue;
        found.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
    }

    return (name: string) => found.get(name.toLowerCase()) ?? null;
}

interface GmResponse {
    status: number;
    responseText?: string;
    responseHeaders?: string;
}

interface GmOptions {
    url: string;
    method: string;
    headers?: Record<string, string>;
    data?: string;
    onload(res: GmResponse): void;
    onerror(): void;
    ontimeout(): void;
    onabort(): void;
}

declare const GM_xmlhttpRequest: ((options: GmOptions) => { abort?(): void; } | void) | undefined;

/**
 * The userscript manager's own request. It is made by the extension rather
 * than by the page, so neither CORS nor the page's own CSP applies to it.
 */
export const gmNet: Net = ({ url, method = "GET", headers, body, signal }) => new Promise(resolve => {
    const failed = (why: string) => resolve({ status: -1, data: why, header: noHeaders });

    if (signal?.aborted) return failed("aborted");

    const handle = GM_xmlhttpRequest!({
        url,
        method,
        headers,
        data: body,
        onload: res => resolve({
            status: res.status,
            data: res.responseText ?? "",
            header: readHeaders(res.responseHeaders)
        }),
        onerror: () => failed("network error"),
        ontimeout: () => failed("timed out"),
        onabort: () => failed("aborted")
    });

    signal?.addEventListener("abort", () => handle?.abort?.(), { once: true });
});

let own: Net | undefined;

/**
 * A host with a way of its own to make a request says so here: a desktop shell
 * with an HTTP client, an app that hands requests to the platform. Without
 * one, `pickNet` looks for the userscript manager's, and then for fetch.
 */
export const useNet = (net: Net | undefined) => {
    own = net;
};

/** Whichever way out this host has, best first. */
export function pickNet(): Net {
    if (own) return own;
    if (typeof GM_xmlhttpRequest === "function") return gmNet;
    return fetchNet;
}

/**
 * A signal that gives up after `ms`. AbortSignal.timeout is newer than
 * AbortController, and an older WebView, or the engine an app runs the core in,
 * can have the second without the first. With neither there is no signal, and
 * the host's own Net has to carry a deadline of its own.
 */
export function timeoutSignal(ms: number): AbortSignal | undefined {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function")
        return AbortSignal.timeout(ms);
    if (typeof AbortController === "undefined") return undefined;

    const controller = new AbortController();
    const timer: any = setTimeout(() => controller.abort(new Error("timed out")), ms);
    // Like the real one, no reason for a process to stay alive.
    timer?.unref?.();
    return controller.signal;
}
