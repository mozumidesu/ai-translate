/*
 * AI Translate — which version this is.
 *
 * The number people see, and the only place it is written down. It is raised
 * by hand, as the same deliberate act that moves `release`, and never by a
 * build: the robot publishes a new build whenever Vencord changes too, and
 * those are not new versions of the plugin.
 *
 * Shape: three numbers and a letter for the stage. The third counts fixes,
 * the second counts anything new, nine is the ceiling for both, and the
 * letter is "a" while this is early, "b" once it is a beta and nothing at
 * all from 1.0.0 on, which means the same thing as having no letter.
 *
 * The userscript's own @version is a separate, machine-facing number that has
 * to grow with every build or no userscript manager offers the update. It
 * never sees this one.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const VERSION = "0.2.0a";
