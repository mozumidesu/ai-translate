/*
 * AI Translate — keeping installed copies up to date.
 *
 * native.ts downloads the latest ready-made build (Vencord with the plugin
 * inside) and puts it in place of the running one. It takes over at the next
 * restart, which the user is offered at once.
 *
 * A userscript in a browser is updated by its userscript manager instead,
 * from the address in the script's own header. What is here for it is only
 * the answer to "is mine the newest", and the way to hand the manager the new
 * one at once.
 *
 * Reads the settings store directly; importing settings.ts would be circular.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { relaunch } from "@utils/native";

import { Bridge, onDesktop } from "./core/bridge";
import { t } from "./core/locales";

/** How often a copy looks for a release on its own. */
const CHECK_EVERY_MS = 2 * 24 * 60 * 60 * 1000;

/** Long enough for Discord to finish starting before anything is fetched. */
const FIRST_CHECK_AFTER_MS = 60 * 1000;

/** Discord can stay open for weeks, so the two days are looked at four times a day. */
const LOOK_AGAIN_EVERY_MS = 6 * 60 * 60 * 1000;

const store = () => (Settings.plugins as any)["AI Translate"];

export type UpdateState = "current" | "available" | "dev" | "offline" | "failed";

/**
 * Which builds a copy follows. "release" is what the install command gives
 * everyone; "testing" follows the plugin's main branch, where a change can be
 * tried before it is released.
 */
export type Channel = "release" | "testing";

/** Anything but the one word is the released channel. */
export const channel = (): Channel => store()?.updateChannel === "testing" ? "testing" : "release";

export function setChannel(next: Channel) {
    store().updateChannel = next;
}

/**
 * A copy installed with AIT_CHANNEL=testing is already running testing builds
 * while the setting has never been touched. The copy on the disk is what the
 * person asked for, so it decides, once, until the settings say otherwise.
 */
async function adoptInstalledChannel() {
    if (store()?.updateChannel) return;

    try {
        const { channel: installed } = await Bridge.aiTranslateBuild();
        if (installed) store().updateChannel = installed;
    } catch {
        // The setting stays empty, which is read as the released channel.
    }
}

export async function checkForUpdate(): Promise<{ state: UpdateState; details: string; }> {
    const result = await Bridge.checkAiTranslateUpdate(channel());

    // Only an answer counts as a check; a failed attempt is retried next start.
    if (result.state === "current" || result.state === "available" || result.state === "dev")
        store().lastUpdateCheck = Date.now();

    return result;
}

/** Downloads the latest build into place. False means nothing changed. */
export async function installUpdate(): Promise<{ ok: boolean; details: string; }> {
    try {
        return await Bridge.installAiTranslateUpdate(channel());
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

/**
 * Asks the build site only once two days have passed since the last answer.
 *
 * Only a copy on a disk looks by itself. A userscript is updated by its
 * userscript manager, which looks on its own schedule; a request from here
 * would only raise the manager's question about a new address, at some moment
 * nobody chose. The button in the settings is where a browser copy asks.
 */
async function checkIfDue() {
    if (!onDesktop()) return;

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
    void adoptInstalledChannel();
    timer = setTimeout(checkIfDue, FIRST_CHECK_AFTER_MS);
    repeat = setInterval(checkIfDue, LOOK_AGAIN_EVERY_MS);
}

export function cancelUpdateCheck() {
    clearTimeout(timer);
    clearInterval(repeat);
}
