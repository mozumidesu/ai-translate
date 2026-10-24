/*
 * AI Translate — keeping installed copies up to date.
 *
 * native.ts downloads the latest ready-made build (Vencord with the plugin
 * inside) and puts it in place of the running one. It takes over at the next
 * restart, which the user is offered at once.
 *
 * Reads the settings store directly; importing settings.ts would be circular.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { relaunch } from "@utils/native";

import { Bridge } from "./core/bridge";
import { t } from "./core/locales";

/** How often a copy looks for a release on its own. */
const CHECK_EVERY_MS = 2 * 24 * 60 * 60 * 1000;

/** Long enough for Discord to finish starting before anything is fetched. */
const FIRST_CHECK_AFTER_MS = 60 * 1000;

/** Discord can stay open for weeks, so the two days are looked at four times a day. */
const LOOK_AGAIN_EVERY_MS = 6 * 60 * 60 * 1000;

const store = () => (Settings.plugins as any)["AI Translate"];

export type UpdateState = "current" | "available" | "dev" | "offline" | "failed";

export async function checkForUpdate(): Promise<{ state: UpdateState; details: string; }> {
    const result = await Bridge.checkAiTranslateUpdate();

    // Only an answer counts as a check; a failed attempt is retried next start.
    if (result.state === "current" || result.state === "available" || result.state === "dev")
        store().lastUpdateCheck = Date.now();

    return result;
}

/** Downloads the latest build into place. False means nothing changed. */
export async function installUpdate(): Promise<{ ok: boolean; details: string; }> {
    try {
        return await Bridge.installAiTranslateUpdate();
    } catch (e) {
        return { ok: false, details: String(e) };
    }
}

export function announceUpdate() {
    showNotification({
        title: t("update.notifyTitle"),
        body: t("update.notifyBody"),
        // It waits until it is clicked or dismissed: the update is on disk
        // either way, and applies by itself at the next restart.
        permanent: true,
        onClick: relaunch
    });
}

/** Asks the build site only once two days have passed since the last answer. */
async function checkIfDue() {
    const last = Number(store()?.lastUpdateCheck) || 0;
    if (Date.now() - last < CHECK_EVERY_MS) return;

    try {
        const { state } = await checkForUpdate();
        if (state !== "available") return;

        const { ok } = await installUpdate();
        if (ok) announceUpdate();
    } catch {
        // Quietly: the next look, or the button, tries again.
    }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let repeat: ReturnType<typeof setInterval> | undefined;

export function scheduleUpdateCheck() {
    timer = setTimeout(checkIfDue, FIRST_CHECK_AFTER_MS);
    repeat = setInterval(checkIfDue, LOOK_AGAIN_EVERY_MS);
}

export function cancelUpdateCheck() {
    clearTimeout(timer);
    clearInterval(repeat);
}
