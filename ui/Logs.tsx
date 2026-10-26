/*
 * AI Translate — the Logs panel.
 *
 * What the plugin has been doing, for the cases a toast cannot carry: an error
 * that says nothing, or a dozen of them in a row. Copy hands the lot to a
 * support report; Save writes the same text to a file. The log itself lives in
 * core/log.ts, which keeps secrets out of it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, useState } from "@webpack/common";

import { isRightToLeft, t } from "../core/locales";
import { asText, clear, howMany } from "../core/log";

const cl = classNameFactory("vc-aitrans-");

/** A file name nobody has to rename: the plugin, then when it was taken. */
const fileName = () => `ai-translate-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.txt`;

/** The clipboard, with the old way behind it for hosts that lack the new one. */
async function toClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fall through to the way that works without a permission.
    }

    try {
        const box = document.createElement("textarea");
        box.value = text;
        box.style.position = "fixed";
        box.style.opacity = "0";
        document.body.append(box);
        box.select();
        const ok = document.execCommand("copy");
        box.remove();
        return ok;
    } catch {
        return false;
    }
}

/** Hands the text to the browser as a file, which Discord saves like any other. */
function toFile(text: string) {
    try {
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName();
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return true;
    } catch {
        return false;
    }
}

function LogsModal({ rootProps }: { rootProps: RenderModalProps; }) {
    const [text, setText] = useState(asText);
    const [said, setSaid] = useState("");

    const report = (key: string) => {
        setSaid(t(key));
        setTimeout(() => setSaid(""), 2000);
    };

    return (
        <Modal {...rootProps} title={t("logs.title")}>
            <div dir={isRightToLeft() ? "rtl" : undefined}>
                <Forms.FormText className={cl("hint")}>{t("logs.desc")}</Forms.FormText>

                <pre className={cl("log")} dir="ltr">{text || t("logs.empty")}</pre>

                <div className={cl("log-actions")}>
                    <Button
                        size="small"
                        disabled={!text}
                        onClick={async () => report(await toClipboard(text) ? "logs.copied" : "logs.copyFailed")}
                    >
                        {t("logs.copy")}
                    </Button>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={!text}
                        onClick={() => report(toFile(text) ? "logs.saved" : "logs.saveFailed")}
                    >
                        {t("logs.save")}
                    </Button>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={!text}
                        onClick={() => {
                            clear();
                            setText("");
                        }}
                    >
                        {t("logs.clear")}
                    </Button>
                </div>

                {!!said && <Forms.FormText className={cl("hint")}>{said}</Forms.FormText>}
            </div>
        </Modal>
    );
}

export function openLogsModal() {
    openModal(props => <LogsModal rootProps={props} />);
}

/** The row on the settings page that opens it. */
export function LogsPanel() {
    const kept = howMany();

    return (
        <section>
            <Button className={cl("wide")} variant="secondary" onClick={openLogsModal}>
                {kept ? `${t("logs.open")} (${kept})` : t("logs.open")}
            </Button>
            <Forms.FormText className={cl("hint")}>{t("logs.desc")}</Forms.FormText>
        </section>
    );
}
