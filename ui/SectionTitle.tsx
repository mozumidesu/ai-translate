/*
 * AI Translate — the quiet titles that divide the settings page into parts.
 *
 * Vencord renders a settings component without props of our own, so each
 * title is its own tiny component, made here from the string it shows.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

import { t } from "../core/locales";

const cl = classNameFactory("vc-aitrans-");

/** A title for one section, read on every draw so the language can change. */
export const sectionTitle = (key: string) => () =>
    <div className={cl("section-title")}>{t(key)}</div>;
