/*
 * AI Translate — one HTTP request, wherever the plugin happens to run.
 *
 * The rest of the plugin asks for a request through here, so the one thing
 * that differs between hosts stays in one place. Electron's main process calls
 * fetch freely; a page inside a browser cannot, because CORS stops it, and a
 * userscript manager or an extension each have their own way around that.
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

/**
 * Plain fetch, which is enough in two places: Electron's main process, where
 * CORS does not apply, and Vencord's userscript build, where fetch itself has
 * been replaced by a wrapper around the userscript manager's own request.
 */
export const fetchNet: Net = async ({ url, method = "GET", headers, body, signal }) => {
    try {
        const res = await fetch(url, { method, headers, body, signal });
        return { status: res.status, data: await res.text(), header: name => res.headers.get(name) };
    } catch (e) {
        return { status: -1, data: String(e), header: noHeaders };
    }
};

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

/** Whichever way out this host has, best first. */
export function pickNet(): Net {
    if (typeof GM_xmlhttpRequest === "function") return gmNet;
    return fetchNet;
}
