/*
 * AI Translate — the "Check for updates" button at the foot of the settings.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { relaunch } from "@utils/native";
import { useState } from "@webpack/common";

import { onDesktop } from "../core/bridge";
import { t } from "../core/locales";
import { Channel, channel, checkForUpdate, installUpdate, setChannel, UpdateState } from "../updater";

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
    const [on, setOn] = useState<Channel>(channel());

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

    // Only where the next update comes from. The copy that is running is left
    // alone until the button above is pressed, or the next check comes round.
    const switchTo = (next: Channel) => {
        setChannel(next);
        setOn(next);
        setPhase("idle");
    };

    const busy = phase === "checking" || phase === "installing";

    const label = phase === "done" ? t("update.restart")
        : phase === "checking" ? t("update.checking")
            : phase === "installing" ? t("update.installing")
                : t("update.check");

    return (
        <section>
            <Button className={cl("wide")} disabled={busy} onClick={run}>
                {label}
            </Button>
            {NOTE[phase] && (
                <Paragraph className={cl("hint", phase === "failed" || phase === "offline" ? "hint-bad" : "")} defaultColor={false}>
                    {t(NOTE[phase]!)}
                </Paragraph>
            )}
            {/* Quiet on purpose: upkeep, not a feature. */}
            <Paragraph className={cl("hint")} defaultColor={false}>
                {t(on === "testing" ? "update.fromTesting" : "update.fromRelease")}{" "}
                <button className={cl("switch")} onClick={() => switchTo(on === "testing" ? "release" : "testing")}>
                    {t(on === "testing" ? "update.toRelease" : "update.toTesting")}
                </button>
            </Paragraph>
        </section>
    );
}
