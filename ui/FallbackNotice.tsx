/*
 * AI Translate — the backup provider's own setup.
 *
 * The backup is meant to be silent, which means a missing key looks exactly
 * like nothing going wrong. This says so out loud, and picks the backup a
 * model so it is ready the moment it is needed.
 *
 * Reads the settings store directly; importing settings.ts would be circular.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@utils/css";
import { Forms, useEffect } from "@webpack/common";

import { Bridge } from "../core/bridge";
import { t } from "../core/locales";
import { suggestModel } from "./ModelPicker";

const cl = classNameFactory("vc-aitrans-");

const store = () => (Settings.plugins as any)["AI Translate"];

const bareLabel = (id: string) => t(`provider.${id}`).replace(/\s*\(.*\)\s*$/, "");

export function FallbackNotice() {
    useSettings([
        "plugins.AI Translate.provider" as any,
        "plugins.AI Translate.fallbackProvider" as any,
        "plugins.AI Translate.groqApiKey" as any,
        "plugins.AI Translate.geminiApiKey" as any,
        "plugins.AI Translate.anthropicApiKey" as any,
        "plugins.AI Translate.glmApiKey" as any,
        "plugins.AI Translate.openaiApiKey" as any
    ]);

    const s = store();
    const backup: string = s.fallbackProvider ?? "none";
    const key: string = backup === "none" ? "" : (s[`${backup}ApiKey`] ?? "");

    // The chooser above only covers the provider in use, so the backup finds
    // its own model the first time it has a key to ask with.
    useEffect(() => {
        if (!key || s[`${backup}Model`]) return;

        let dropped = false;

        (async () => {
            try {
                const { status, models } = await Bridge.listAiModels(JSON.stringify({
                    provider: backup, apiKey: key, baseUrl: s.baseUrl ?? ""
                }));

                if (!dropped && status === 200 && models.length)
                    s[`${backup}Model`] = suggestModel(backup, models);
            } catch {
                // Without a model the backup stays idle, which is where it started.
            }
        })();

        return () => { dropped = true; };
    }, [backup, key]);

    if (backup === "none" || key) return null;

    return (
        // Drawn as its own setting, so it would otherwise sit a full setting's
        // gap below the field it is about.
        <Forms.FormText className={cl("warning", "warning-attached")}>
            {t("fallback.noKey", { provider: bareLabel(backup) })}
        </Forms.FormText>
    );
}
