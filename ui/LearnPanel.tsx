/*
 * AI Translate — the corrections AI Learn has made.
 *
 * A correction under a message is gone by the next restart, which is no use to
 * anyone learning a language: the point is the mistake you keep making, and
 * that only shows itself over days. The last fifty are kept in the settings
 * and read back here, newest first.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, useState } from "@webpack/common";

import { changedWords, Correction, forgetCorrections, keptCorrections } from "../core/learn";
import { currentLocale, isRightToLeft, t } from "../core/locales";

const cl = classNameFactory("vc-aitrans-");

/** The day it happened, written the way the reader's language writes days. */
function when(at: number) {
    try {
        return new Date(at).toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
    } catch {
        // An unusual locale name is not worth losing the entry over.
        return "";
    }
}

function Kept({ kept }: { kept: Correction; }) {
    return (
        <li className={cl("kept")}>
            <p className={cl("kept-typed")}>{kept.typed}</p>
            <p className={cl("kept-native")}>
                {changedWords(kept.typed, kept.native).map((part, at) => (
                    <span key={at} className={part.changed ? cl("fixed") : undefined}>
                        {at ? " " : ""}{part.text}
                    </span>
                ))}
            </p>
            {!!kept.why && <p className={cl("kept-why")}>{kept.why}</p>}
            <p className={cl("kept-when")}>{when(kept.at)}</p>
        </li>
    );
}

function LearnModal({ rootProps }: { rootProps: RenderModalProps; }) {
    const [kept, setKept] = useState(keptCorrections);

    return (
        <Modal {...rootProps} title={t("learn.title")}>
            <div dir={isRightToLeft() ? "rtl" : undefined}>
                <Paragraph className={cl("hint")} defaultColor={false}>{t("learn.panelDesc")}</Paragraph>

                {kept.length
                    ? <ul className={cl("kept-list")}>
                        {kept.map((one, at) => <Kept key={at} kept={one} />)}
                    </ul>
                    : <Paragraph className={cl("kept-empty")} defaultColor={false}>{t("learn.empty")}</Paragraph>}

                <div className={cl("log-actions")}>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={!kept.length}
                        onClick={() => {
                            forgetCorrections();
                            setKept([]);
                        }}
                    >
                        {t("learn.clear")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export const openLearnModal = () => openModal(props => <LearnModal rootProps={props} />);

/** The row on the settings page that opens it, under the AI Learn switch. */
export function LearnPanel() {
    const kept = keptCorrections();

    return (
        <section className={cl("logs")}>
            <Button className={cl("wide")} variant="secondary" onClick={openLearnModal}>
                {kept.length ? `${t("learn.open")} (${kept.length})` : t("learn.open")}
            </Button>
        </section>
    );
}
