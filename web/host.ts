/*
 * AI Translate — the browser as the host.
 *
 * Answers what host.ts asks for without Vencord: settings come from the
 * userscript manager, notices from our own toast.
 *
 * The conversation above a message is not answered yet. Vencord reads it out
 * of Discord's own message store, which the page does not hand out, and
 * reading it off the screen needs a way to tell the user's own messages from
 * everyone else's. Until that is done this returns nothing, and the core
 * simply translates without context, which it is built to do.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Host, Said } from "../host";
import { toast } from "./toast";
import { save, settings } from "./storage";

export const browserHost: Host = {
    config: settings,
    set: save,
    recent: (): Said[] => [],
    meId: () => undefined,
    notice: (text, kind) => toast(text, kind)
};
