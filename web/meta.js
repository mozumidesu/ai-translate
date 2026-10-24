// ==UserScript==
// @name            AI Translate
// @description     Translate Discord messages with an AI model of your choice
// @version         %version%
// @author          mozumidesu
// @namespace       https://gitlab.com/mozumidesu/ai-translate
// @homepageURL     https://github.com/mozumidesu/ai-translate
// @supportURL      https://github.com/mozumidesu/ai-translate/issues
// @icon            https://builds.zolatau.com/favicon.svg
// @updateURL       https://builds.zolatau.com/ai-translate.meta.js
// @downloadURL     https://builds.zolatau.com/ai-translate.user.js
// @license         GPL-3.0-or-later
// @match           *://*.discord.com/*
// @grant           GM_xmlhttpRequest
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-start
// @compatible      chrome Chrome + Tampermonkey or Violentmonkey
// @compatible      firefox Firefox + Tampermonkey
// @compatible      edge Edge + Tampermonkey or Violentmonkey
// @compatible      opera Opera + Tampermonkey or Violentmonkey
// ==/UserScript==

// AI Translate for Discord in a browser tab. The plugin's own code, with none
// of Vencord: it lives beside a Vencord install rather than replacing it.
//
// Source, in full, and the licence: https://github.com/mozumidesu/ai-translate
