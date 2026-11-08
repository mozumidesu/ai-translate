---
name: file-map
description: The full description of every file in AI Translate's core/ and Vencord side, of which CLAUDE.md keeps one line each. Load when a file's line in CLAUDE.md does not say enough to work in it.
---

The full text behind the two file tables of CLAUDE.md.

### `core/` — runs anywhere, knows nothing about Vencord

| File | Responsible for |
|---|---|
| `core/translate.ts` | The prompts, the translation itself, post-processing, the glossary, conversation context, and pacing against the provider's rate limits. The biggest file and the one that matters most |
| `core/host.ts` | The handful of things the core cannot know by itself: settings and writing them, recent messages, who the current user is, how to show a notice. A host is installed once at load; until then these answer empty rather than throwing. Three more may be left unsaid: what the chat is called in the prompts, its dialect, and the language the app is shown in; unsaid, they are Discord's, and English for the language |
| `core/dialect.ts` | How a chat writes text. One record for Discord, which draws raw ids out of what is typed (`<@123>` mentions, custom emoji, timestamps), headings, quotes and lists at the start of a line, spoilers and backslash escapes, and one for `plain`, which draws none of it. What differs between them is data: the patterns, and the words the prompts use to name what the chat draws. The wording of the rule stays in `core/translate.ts`. Links, `:shortcodes:`, code in backticks, faces and `\fragments\` are the same in every chat and stay where they are, and so do the heuristics that treat anything in angle brackets as markup. A host that says nothing is Discord |
| `core/bridge.ts` | Decides where a request goes: to Electron's main process over Vencord's bridge, or straight from here when there is no bridge (browser). In a browser it also answers whether the userscript is the newest, and hands the new one to the userscript manager. The build robot writes the build's name and its channel into two constants here, which is the only way a browser copy can know what it is |
| `core/builds.ts` | Where the build robot publishes: the address, the two channels, the link to a channel's userscript, and what a channel is handing out now. `native.ts` fetches a desktop copy's files from it, and a browser copy asks it whether it is the newest |
| `core/net.ts` | The one thing that differs between hosts: how to make a single HTTP request (`fetch`, `GM_xmlhttpRequest`, or one the host hands over with `useNet`, which is how a shell with an HTTP client of its own, and the tests, give the core a way out). Also `timeoutSignal`, a deadline that falls back to an `AbortController` and a timer where `AbortSignal.timeout` is missing, and to none where there is no `AbortController` either |
| `core/providers.ts` | Each provider's address and request shape, reading rate limits out of responses, and every retry rule |
| `core/keep.ts` | The parts of a message that must not be translated: `\fragments\`, code in backticks, emoticons containing slashes, and the user's own never-translate words. Replaces them with placeholders and puts them back afterwards. Also `literalBackslashes`, which keeps Discord's markdown from eating the backslashes in the echo of what was typed. What counts as an escape, and what markdown may stand in front of a line-long marker, is the dialect's |
| `core/languages.ts` | The language list used by the dropdowns |
| `core/locales.ts` | Interface text in 16 languages. Large, mostly data. Set to follow the app, it asks the host which language that is |
| `core/chats.ts` | Which chats have auto-translation on. One rule for every host |
| `core/slots.ts` | Which providers this copy talks to and in what order: one to ask and up to four behind it, each with its own key, model and rate limits. The same provider may stand in two slots with two keys. Also what a provider is called: in the list, in a sentence and over its key, which for the generic one are three different things. Settings written before the list existed are still read, which is what the standalone `web/` build and the tests hand over |
| `core/version.ts` | The version people see, and the only place it is written down |
| `core/learn.ts` | AI Learn's half that needs no Discord: whether a message is the writer's own attempt at the language they are learning, what a correction changed word by word, splitting the model's answer from the "why:" line it ends with, and the last fifty corrections |
| `core/log.ts` | The last 200 things that happened, for the Logs panel. Written to be pasted in public, so a key-shaped run in a provider's answer is masked before it is kept |

These fifteen (`translate`, `host`, `dialect`, `bridge`, `builds`, `net`,
`providers`, `keep`, `languages`, `locales`, `chats`, `log`, `version`, `learn`,
`slots`) build on their own, with esbuild forbidding any import from outside
this folder. That is what makes the browser version possible, and it is also
what lets the tests run the real core without Discord.

The folder is the boundary made visible: nothing in `core/` imports anything
above it, and that is worth keeping true. So is the other half: apart from
`bridge.ts`, nothing in it touches `document`, `window` or `navigator`. What a
page knows reaches the core through the host, and `test/bare.mjs` fails on a
use. `web/` has a `host.ts` of its own, so inside `web/` a bare `./host` is that
one and the core's is `../core/host`.

### The Vencord side

| File | Responsible for |
|---|---|
| `index.tsx` | The plugin as Vencord sees it: the chat-bar button, the block under a message, the right-click menu, the `definePlugin` call |
| `vencord-host.ts` | Answers `core/host.ts` using Vencord: its settings store, its message store, the current user, toasts, and the language Discord is shown in. Reads settings directly from `Settings.plugins["AI Translate"]` rather than through `settings.ts`, because the host has to be ready before the settings page loads |
| `native.ts` | The desktop end, in Electron's main process: provider requests (renderer requests are blocked by CORS) and installing updates |
| `settings.ts` | The settings page and its migrations |
| `updater.ts` | When to look for an update: two days, first check a minute after Discord starts, re-examined every six hours. Only a copy on a disk looks by itself; a userscript is updated by its manager and asks only when the button is pressed. Also which channel a copy follows, and adopting the installed build's own channel when nothing has been chosen |
| `ui/modal.tsx` | The panel that opens on left-clicking the button |
| `ui/Feedback.tsx` | The feedback form at the top of the settings page |
| `ui/Providers.tsx` | The provider blocks: one to ask and up to four behind it, each with its provider, key, model and, for an OpenAI-compatible one, address. Drawn whole rather than as settings rows, because a row is named once for the whole plugin and that is why there could only ever be one key per provider. The one backup the page always shows has no minus: it is switched off with None, and `canRemove` in `core/slots.ts` is the rule |
| `ui/ModelPicker.tsx` | The model dropdown, one per slot. Asks the provider when the key is finished rather than while it is typed, and the same answer says both which models the key can reach and whether the key was taken at all |
| `ui/Logs.tsx` | The Logs button and the panel behind it: the log as text, with Copy, Save .txt and Clear |
| `ui/LearnPanel.tsx` | The Corrections button under the AI Learn switch, and the panel behind it: what was written, what a native speaker would have written, and why. Hidden while AI Learn is off |
| `ui/KeepHelp.tsx`, `ui/SectionTitle.tsx`, `ui/UpdatePanel.tsx` | Smaller settings-page pieces. `SectionTitle` is a factory: one title per settings section, named by its string. `UpdatePanel` is the Check for updates button, and in a userscript it hands the new script to the userscript manager instead of installing anything |
| `ui/ModalHeadings.ts` | Vencord draws "Authors" and "Settings" over every plugin's settings in English and cannot translate them. This puts the two words into the plugin's language after they are drawn, only inside this plugin's window and only where a heading holds nothing else. Called from the row of links in `ui/Feedback.tsx`, the one part of that window that is the plugin's own and is drawn again when the language changes |
| `styles.css` | Styling. Discord resets list styles, so bullets are set on `li` here |

Everything the settings page and the panel are built from sits in `ui/`. It is
an ordinary folder, not something Vencord knows about: only `index.tsx` and
`native.ts` are found by name, and the rest is reached by relative import.

The plugin's name in `definePlugin` is **AI Translate**, with a space. Vencord
stores settings under that name and builds the bridge to `native.ts` from it,
so it is reached as `VencordNative.pluginHelpers["AI Translate"]`. Renaming the
plugin resets saved settings; `migrateSettings` in `settings.ts` carries them
over from the older name `AiTranslate`.
