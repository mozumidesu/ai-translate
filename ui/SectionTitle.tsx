/*
 * AI Translate — a quiet title between the settings everyone needs and the
 * ones that only fine-tune.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

import { t } from "../locales";

const cl = classNameFactory("vc-aitrans-");

export function SectionTitle() {
    return <div className={cl("section-title")}>{t("section.optional")}</div>;
}
