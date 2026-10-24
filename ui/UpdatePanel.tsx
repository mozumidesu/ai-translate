/*
 * AI Translate — the "Check for updates" button at the foot of the settings.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { classNameFactory } from "@utils/css";
import { relaunch } from "@utils/native";
import { Forms, useState } from "@webpack/common";

import { onDesktop } from "../bridge";
import { t } from "../locales";
import { checkForUpdate, installUpdate, UpdateState } from "../updater";

const cl = classNameFactory("vc-aitrans-");

type Phase = "idle" | "checking" | "installing" | "done" | Exclude<UpdateState, "available">;

/** Nothing is said until there is an answer to report. */
const NOTE: Record<Phase, string | null> = {
    idle: null,
    checking: null,
    installing: null,
    done: "update.done",
    current: "update.current",
    dev: "update.dev",
    offline: "update.offline",
    failed: "update.failed"
};

export function UpdatePanel() {
    const [phase, setPhase] = useState<Phase>("idle");

    // In a browser the copy is kept current by the userscript manager or by
    // the extension store, and this button would have nothing it could do.
    if (!onDesktop()) return null;

    const run = async () => {
        // Once installed, the same button restarts into the new version.
        if (phase === "done") return relaunch();

        setPhase("checking");

        try {
            const { state } = await checkForUpdate();
            if (state !== "available") return setPhase(state);

            setPhase("installing");
            const { ok } = await installUpdate();
            setPhase(ok ? "done" : "failed");
        } catch {
            setPhase("failed");
        }
    };

    const busy = phase === "checking" || phase === "installing";

    const label = phase === "done" ? t("update.restart")
        : phase === "checking" ? t("update.checking")
            : phase === "installing" ? t("update.installing")
                : t("update.check");

    return (
        <section className={cl("updates")}>
            <Button className={cl("wide")} disabled={busy} onClick={run}>
                {label}
            </Button>
            {NOTE[phase] && (
                <Forms.FormText className={cl("hint", phase === "failed" || phase === "offline" ? "hint-bad" : "")}>
                    {t(NOTE[phase]!)}
                </Forms.FormText>
            )}
        </section>
    );
}
