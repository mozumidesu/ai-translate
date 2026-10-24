/*
 * AI Translate — which chats translate by themselves.
 *
 * The same rule everywhere the plugin runs, so it lives beside the
 * translation rather than inside Vencord's settings page: either every chat
 * is on, or the ones the user switched on are, and the list of those is a
 * setting like any other.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config, set } from "./host";

const switchedOn = () => new Set(String(config().enabledChannels ?? "").split(",").filter(Boolean));

export function isChannelEnabled(channelId: string) {
    if (config().mode === "always") return true;
    return switchedOn().has(channelId);
}

export function setChannelEnabled(channelId: string, on: boolean) {
    const chats = switchedOn();
    on ? chats.add(channelId) : chats.delete(channelId);
    set("enabledChannels", [...chats].join(","));
}

export function toggleChannel(channelId: string) {
    const on = !isChannelEnabled(channelId);
    setChannelEnabled(channelId, on);
    return on;
}
