/*
 * AI Translate — what each provider wants and what it answers.
 *
 * One branch per provider, since their request shapes differ, plus the retry
 * rules shared by all of them. Nothing here knows how a request is actually
 * sent: that comes in as a Net (see net.ts), so the same code serves Electron,
 * a userscript and an extension.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Net, NetResponse } from "./net";

/**
 * Who is asking. Protection in front of these APIs treats a client that names
 * itself better than Electron passing for a browser it is not.
 */
const CLIENT = "AI-Translate/1.0 (Vencord plugin)";

/** Providers that speak OpenAI's shape but at a fixed address of their own. */
const OPENAI_STYLE_BASES: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1",
    glm: "https://api.z.ai/api/paas/v4"
};

const openAiBase = (provider: string, baseUrl: string) =>
    OPENAI_STYLE_BASES[provider] ?? baseUrl.replace(/\/+$/, "");

/**
 * Z.ai's free models. The list Z.ai answers with leaves them out, though any
 * key can run them, while the "flash" models it does list are paid: picking
 * from that list alone lands a free key on a model that answers "Insufficient
 * balance". Also what is offered when asking for the list fails.
 */
export const FREE_MODELS: Record<string, string[]> = {
    glm: ["glm-4.5-flash", "glm-4.7-flash"]
};

/** The same range fetch calls ok, so a move off fetch changes nothing. */
const ok = (status: number) => status >= 200 && status < 300;

export interface Req {
    provider: "gemini" | "groq" | "glm" | "openai" | "anthropic";
    apiKey: string;
    model: string;
    baseUrl: string;
    system: string;
    text: string;
    thinkingLevel: string; // "default" | "low" | "medium" | "high"
    /** A second go after the first ran out of room: triple the budget. */
    roomy?: boolean;
}

/** Model ids a provider currently offers, so nobody has to type one by hand. */
export async function listModels(net: Net, payload: string) {
    const { provider, apiKey, baseUrl } = JSON.parse(payload) as { provider: string; apiKey: string; baseUrl: string; };

    let url: string;
    const headers: Record<string, string> = { "User-Agent": CLIENT };

    switch (provider) {
        case "gemini":
            url = "https://generativelanguage.googleapis.com/v1beta/models";
            headers["x-goog-api-key"] = apiKey;
            break;
        case "anthropic":
            url = "https://api.anthropic.com/v1/models";
            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";
            break;
        default:
            url = openAiBase(provider, baseUrl) + "/models";
            headers["Authorization"] = `Bearer ${apiKey}`;
            break;
    }

    const res = await net({ url, headers, signal: AbortSignal.timeout(20_000) });
    if (!ok(res.status)) return { status: res.status, models: [] as string[], data: res.data };

    try {
        const json = JSON.parse(res.data);
        let models: string[];

        if (provider === "gemini") {
            models = (json.models ?? [])
                // Image, audio and embedding models cannot answer a chat request.
                .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
                .map((m: any) => String(m.name).replace(/^models\//, ""));
        } else {
            models = (json.data ?? []).map((m: any) => m.id).filter(Boolean);
        }

        return { status: 200, models: [...new Set<string>(models)].sort(), data: "" };
    } catch (e) {
        return { status: -1, models: [] as string[], data: String(e) };
    }
}

/** Posts to the relay; only the relay knows the Discord webhook behind it. */
export async function postFeedback(net: Net, endpoint: string, body: object) {
    const res = await net({
        url: endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    return { status: res.status, data: ok(res.status) ? "" : res.data };
}

/** What a provider says is left of its per-minute token budget. */
export interface TokenBudget {
    limit: number;
    remaining: number;
    /** Until the budget is whole again; it fills back evenly till then. */
    refillMs: number;
}

export interface Result {
    status: number;
    data: string;
    /** Only from providers that report it: Groq, OpenAI and their kind. */
    budget?: TokenBudget;
    /** How long a refusal asked to wait, from its retry-after header. */
    retryMs?: number;
}

/** "14.43s", "1m26.4s", "500ms": the way these headers, and the refusals, write a duration. */
export function readDuration(value: string | null) {
    const units: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1000, ms: 1 };
    let total = 0;
    let found = false;

    for (const [, amount, unit] of (value ?? "").matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
        total += Number(amount) * units[unit];
        found = true;
    }

    return found ? total : undefined;
}

function readBudget(header: NetResponse["header"]): TokenBudget | undefined {
    const number = (name: string) => {
        const value = header(name);
        return value === null ? NaN : Number(value);
    };

    const limit = number("x-ratelimit-limit-tokens");
    const remaining = number("x-ratelimit-remaining-tokens");
    const refillMs = readDuration(header("x-ratelimit-reset-tokens"));

    if (!(limit > 0) || !Number.isFinite(remaining) || refillMs === undefined) return undefined;
    return { limit, remaining, refillMs };
}

/** Seconds, as a refusal gives them; the date form is not worth the trouble. */
function readRetry(header: NetResponse["header"]) {
    const seconds = Number(header("retry-after") ?? NaN);
    return seconds >= 0 ? seconds * 1000 : undefined;
}

/**
 * Bad timing rather than real failure, so a short retry usually wins. A rate
 * limit is left out: there the wait asked for is far longer than these.
 */
const TRANSIENT_STATUSES = new Set([-1, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200];

/**
 * Z.ai's free models say they are busy with a 429 rather than a 503: code
 * 1305, "temporarily overloaded". That one is bad timing like the rest, and
 * the next request often goes through.
 */
const isTransient = (result: Result) =>
    TRANSIENT_STATUSES.has(result.status)
    || (result.status === 429 && /"code"\s*:\s*"?1305\b/.test(result.data));

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendWithRetry(send: (payload: any) => Promise<Result>, body: any): Promise<Result> {
    let result = await send(body);

    for (const delay of RETRY_DELAYS_MS) {
        if (!isTransient(result)) break;
        await sleep(delay);
        result = await send(body);
    }

    return result;
}

export async function sendChat(net: Net, payload: string): Promise<Result> {
    const { provider, apiKey, model, baseUrl, system, text, thinkingLevel, roomy }: Req = JSON.parse(payload);

    let url: string;
    const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": CLIENT };
    let body: any;

    // The answer budget counts against the per-minute limit as if already
    // spent, so it is sized to the text rather than set flat and high.
    // Most answers fit easily; a reasoning model on a long message can think
    // its way through all of it first, so that one gets a far larger second go.
    const room = Math.ceil(text.length / 2) + 256;
    const maxTokens = Math.min(4000, Math.max(512, (thinkingLevel === "high" ? room * 4 : room) * (roomy ? 3 : 1)));

    // "default" means: say nothing about thinking and let the model decide.
    const sendThinking = thinkingLevel !== "default" && thinkingLevel !== "off";

    // Gemini 3.x takes a string enum (thinkingLevel); 2.x took a token budget.
    const geminiThinkingConfig = !sendThinking
        ? undefined
        : /gemini-3/.test(model)
            ? { thinkingLevel }
            : { thinkingBudget: thinkingLevel === "low" ? 0 : 1024 };

    switch (provider) {
        case "gemini":
            url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
            headers["x-goog-api-key"] = apiKey;
            body = {
                system_instruction: { parts: [{ text: system }] },
                contents: [{ role: "user", parts: [{ text }] }],
                generationConfig: {
                    temperature: 0.2,
                    // Reasoning tokens come out of the same budget as the answer,
                    // so this is set high on purpose: unused budget costs nothing,
                    // while a tight one can leave no room for the translation.
                    maxOutputTokens: maxTokens,
                    ...(geminiThinkingConfig ? { thinkingConfig: geminiThinkingConfig } : {})
                }
            };
            break;

        case "anthropic":
            url = "https://api.anthropic.com/v1/messages";
            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";
            body = {
                model,
                max_tokens: maxTokens,
                temperature: 0.2,
                system,
                messages: [{ role: "user", content: text }]
            };
            break;

        // Groq, Z.AI and any other OpenAI-compatible endpoint
        default: {
            url = openAiBase(provider, baseUrl) + "/chat/completions";
            headers["Authorization"] = `Bearer ${apiKey}`;

            // Z.AI switches thinking with a field of its own and rejects the
            // OpenAI one.
            const zai = provider === "glm";

            body = {
                model,
                temperature: 0.2,
                max_tokens: maxTokens,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: text }
                ],
                // Lower effort is faster, and nobody reads the reasoning.
                ...(sendThinking && !zai ? { reasoning_effort: thinkingLevel } : {}),
                ...(sendThinking && zai ? { thinking: { type: thinkingLevel === "high" ? "enabled" : "disabled" } } : {}),
                ...(/gpt-oss/.test(model) ? { include_reasoning: false } : {})
            };
            break;
        }
    }

    // One budget for the whole exchange, retries included. Without it a request
    // the provider never answers waits for ever: no translation appears and no
    // error either, and from the outside the plugin looks simply dead.
    const deadline = AbortSignal.timeout(60_000);

    const send = async (payload: any): Promise<Result> => {
        const res = await net({
            url,
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: deadline
        });

        if (res.status === -1) return { status: -1, data: res.data };

        return {
            status: res.status,
            data: res.data,
            budget: readBudget(res.header),
            retryMs: readRetry(res.header)
        };
    };

    let result = await sendWithRetry(send, body);

    // A 403 that says nothing about the key is usually the protection in front
    // of the API, and that often lets the next request through.
    for (const delay of [800, 2000]) {
        if (result.status !== 403 || /api.?key|unauthori[sz]|invalid.?auth/i.test(result.data)) break;
        await sleep(delay);
        result = await send(body);
    }

    // Some models reject the reasoning settings outright.
    if (result.status === 400 && /thinking|reasoning/i.test(result.data)) {
        delete body.generationConfig?.thinkingConfig;
        delete body.reasoning_effort;
        delete body.include_reasoning;
        delete body.thinking;
        result = await sendWithRetry(send, body);
    }

    return result;
}
