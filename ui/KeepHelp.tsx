/*
 * AI Translate — how to keep part of a message untranslated.
 *
 * Drawn the way Vencord draws any setting, a title over a description, only
 * with nothing to change: it is there to be read, as a short bulleted list.
 * The class names are Vencord's own, so it lines up with the settings around it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";

import { t } from "../core/locales";

/** "{example}" in a sentence becomes the example itself, set as code. */
function withExample(key: string, example: string) {
    const [before, after = ""] = t(key).split("{example}");

    return (
        <>
            {before}
            {/* "auto", so an Arabic example still starts at its own right-hand edge */}
            <code className="vc-aitrans-example" dir="auto">{example}</code>
            {after}
        </>
    );
}

export function KeepHelp() {
    return (
        <div className="vc-plugins-setting-section">
            <div className="vc-plugins-setting-content">
                <div className="vc-plugins-setting-label">
                    <Paragraph className="vc-plugins-setting-title" size="md" weight="medium">
                        {t("keep.name")}
                    </Paragraph>
                    <ul className="vc-aitrans-keep-list">
                        <li>
                            <Paragraph className="vc-plugins-setting-description">
                                {withExample("keep.pair", "\\carpe diem\\")}
                            </Paragraph>
                        </li>
                        <li>
                            <Paragraph className="vc-plugins-setting-description">
                                {withExample("keep.line", "\\" + t("keep.lineExample"))}
                            </Paragraph>
                        </li>
                        <li>
                            <Paragraph className="vc-plugins-setting-description">
                                {t("keep.code")}
                            </Paragraph>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
