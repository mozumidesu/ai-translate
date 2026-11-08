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

import { isPublishedUserscript, onDesktop } from "../core/bridge";
import { t } from "../core/locales";
import { Channel, channel, checkForUpdate, installUpdate, setChannel, UpdateState } from "../updater";

const cl = classNameFactory("vc-aitrans-");

/**
 * "found" and "opened" belong to a userscript. Its userscript manager does the
 * installing, so all the button can do is say there is something new, and then
 * hand the new script over.
 */
type Phase = "idle" | "checking" | "installing" | "found" | "opened" | "done" | Exclude<UpdateState, "available">;

/** Nothing is said until there is an answer to report. */
const NOTE: Record<Phase, string | null> = {
    idle: null,
    checking: null,
    installing: null,
    found: "update.browserFound",
    opened: "update.browserOpened",
    done: "update.done",
    current: "update.current",
    dev: "update.dev",
    offline: "update.offline",
    failed: "update.failed"
};

export function UpdatePanel() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [on, setOn] = useState<Channel>(channel());

    // A copy that nothing publishes, or that a store keeps, has nothing to
    // ask. A userscript has: its userscript manager updates it on its own
    // schedule, and this says whether that has happened and hurries it.
    const desktop = onDesktop();
    if (!desktop && !isPublishedUserscript()) return null;

    const run = async () => {
        // Once installed, the same button restarts into the new version, or
        // reloads the page that the manager has put the new script under.
        if (phase === "done") return relaunch();
        if (phase === "opened") return window.location.reload();

        // Nothing is awaited before this: the new tab has to open from the
        // click itself, or a pop-up blocker takes it for an advertisement.
        if (phase === "found") {
            const { ok } = await installUpdate();
            return setPhase(ok ? "opened" : "failed");
        }

        setPhase("checking");

        try {
            const { state } = await checkForUpdate();
            if (state !== "available") return setPhase(state);
            if (!desktop) return setPhase("found");

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
        : phase === "opened" ? t("update.reload")
            : phase === "found" ? t("update.browserInstall")
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
