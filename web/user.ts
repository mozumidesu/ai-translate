/*
 * AI Translate — the browser version's starting point.
 *
 * Installs the host, catches outgoing messages and puts up the two buttons.
 * Runs at document-start, before Discord's own code, which is the only moment
 * at which the request that carries a message can still be caught.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config, useHost } from "../host";
import { t } from "../locales";
import { browserHost } from "./host";
import { install } from "./intercept";
import { installDock, openPanel } from "./panel";
import { toast } from "./toast";

// First, and before anything else asks for a setting.
useHost(browserHost);

// Before Discord takes its own copy of fetch, which is why the script runs at
// document-start and does this at once rather than waiting for the page.
install();

const addButtons = () => {
    try {
        installDock();
    } catch (e) {
        console.error("[AI Translate]", e);
    }
};

if (document.body) addButtons();
else document.addEventListener("DOMContentLoaded", addButtons, { once: true });

// A key is the one thing nobody can guess for the user, and without it
// nothing works at all, so a fresh install says so once and opens the panel.
// Said after Discord has drawn itself, where it will actually be read.
setTimeout(() => {
    try {
        const provider = String(config().provider);
        if (config()[`${provider}ApiKey`]) return;

        toast(t("error.noKey", { provider: t(`provider.${provider}`).replace(/\s*\(.*\)\s*$/, "") }), "failure");
        openPanel();
    } catch (e) {
        console.error("[AI Translate]", e);
    }
}, 6000);
