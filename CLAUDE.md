# AI Translate

A Vencord userplugin for Discord. It translates outgoing messages before they
are sent, chat by chat, and incoming messages on request from the right-click
menu, using an AI provider's API with the user's own key.

This folder is the plugin itself. In a working Vencord checkout it sits at
`src/userplugins/aiTranslate/`.

## Hard constraints

- **The plugin is TypeScript and stays TypeScript.** It runs inside Discord's
  window and is bundled by Vencord's own esbuild, and it hooks into Discord
  internals: webpack module patches, React components, Flux stores, Vencord's
  settings API. Rust, WASM or a native sidecar have all been considered and
  rejected; the plugin's own work is 0.3–0.7 ms per translation against
  700–1500 ms of network, so there is nothing to win and the one-command
  install would be lost. Rust belongs in `tools/`, not here.
- **Never commit anything from `local/`.** One line in `.gitignore` covers the
  whole folder: personal scripts, the feedback relay's source, publishing
  addresses. A cloud session cannot see it at all, which is intended.
- **Every user-visible string exists in 16 languages** in `locales.ts`. Adding
  or changing one means changing all 16, not only English.
- **The README exists in 16 languages too**: `README.md` plus
  `docs/README.<code>.md`. Same rule.

## What each file does

### The core — runs anywhere, knows nothing about Vencord

| File | Responsible for |
|---|---|
| `translate.ts` | The prompts, the translation itself, post-processing, the glossary, conversation context, and pacing against the provider's rate limits. The biggest file and the one that matters most |
| `host.ts` | The handful of things the core cannot know by itself: settings and writing them, recent messages, who the current user is, how to show a notice. A host is installed once at load; until then these answer empty rather than throwing |
| `bridge.ts` | Decides where a request goes: to Electron's main process over Vencord's bridge, or straight from here when there is no bridge (browser) |
| `net.ts` | The one thing that differs between hosts: how to make a single HTTP request (`fetch` or `GM_xmlhttpRequest`) |
| `providers.ts` | Each provider's address and request shape, reading rate limits out of responses, and every retry rule |
| `keep.ts` | The parts of a message that must not be translated: `\fragments\`, code in backticks, emoticons containing slashes, and the user's own never-translate words. Replaces them with placeholders and puts them back afterwards |
| `languages.ts` | The language list used by the dropdowns |
| `locales.ts` | Interface text in 16 languages. Large, mostly data |
| `chats.ts` | Which chats have auto-translation on. One rule for every host |

These eight (`translate`, `host`, `bridge`, `net`, `providers`, `keep`,
`languages`, `locales`) build on their own, with esbuild forbidding any import
from outside this folder. That is what makes the browser version possible, and
it is also what lets the tests run the real core without Discord.

### The Vencord side

| File | Responsible for |
|---|---|
| `index.tsx` | The plugin as Vencord sees it: the chat-bar button, the block under a message, the right-click menu, the `definePlugin` call |
| `vencord-host.ts` | Answers `host.ts` using Vencord: its settings store, its message store, the current user, toasts. Reads settings directly from `Settings.plugins["AI Translate"]` rather than through `settings.ts`, because the host has to be ready before the settings page loads |
| `native.ts` | The desktop end, in Electron's main process: provider requests (renderer requests are blocked by CORS) and installing updates |
| `settings.ts` | The settings page and its migrations |
| `updater.ts` | When to look for an update: two days, first check a minute after Discord starts, re-examined every six hours |
| `modal.tsx` | The panel that opens on left-clicking the button |
| `Feedback.tsx` | The feedback form at the top of the settings page |
| `ModelPicker.tsx` | The model dropdown. Subscribes to the provider and to every key, because the list belongs to a provider-and-key pair |
| `FallbackNotice.tsx`, `KeepHelp.tsx`, `SectionTitle.tsx`, `UpdatePanel.tsx` | Smaller settings-page pieces |
| `styles.css` | Styling. Discord resets list styles, so bullets are set on `li` here |

The plugin's name in `definePlugin` is **AI Translate**, with a space. Vencord
stores settings under that name and builds the bridge to `native.ts` from it,
so it is reached as `VencordNative.pluginHelpers["AI Translate"]`. Renaming the
plugin resets saved settings; `migrateSettings` in `settings.ts` carries them
over from the older name `AiTranslate`.

### The browser version — no Vencord at all

`web/` holds a standalone build: `intercept.ts` catches outgoing messages,
`panel.ts` is its own settings panel, `storage.ts` its own store, `user.ts` and
`toast.ts` fill in for the host, `host.ts` wires them together, `build.mjs`
builds it. `meta.js` is the userscript header. `web/dist/` is build output and
is gitignored. See `web-support-plan.md` if it is in the session.

### Everything else

| Path | Responsible for |
|---|---|
| `test/prompts.mjs` | 103 checks. Builds the real core, runs a real translation past a fake provider, reads the prompt that provider was handed |
| `test/measure.mjs` | Tokens per request and the plugin's own time with the network taken out |
| `test/rules.mjs` | The assembled prompt line by line, heaviest first |
| `install/install.ps1`, `install/install.sh` | The one-command install for Windows and for macOS/Linux. **Keep both**: the `.sh` is for users, not a leftover |
| `build/github.sh` | What the build robot does. **Keep**: it runs on Ubuntu inside Actions |
| `.github/workflows/build.yml` | When the robot runs: hourly at minute 17, plus a manual run |
| `docs/` | The 15 translated READMEs and the banner |

## Prompt rules

Each rule is a constant in `translate.ts`, written as full English prose, with
one comment line above it saying what went wrong without it. Each is pinned by
a check in `test/prompts.mjs` named after that same failure. Those two anchors
cannot drift from the code, so there is no third prose copy of them anywhere —
do not create one.

When changing a rule:

- Run `node test/prompts.mjs`. A rule that loses its wording fails its check by
  name; that is the system working, not a problem to route around. Update the
  pinned phrase only when the rule genuinely changed.
- **Examples inside rules must be ordinary, everyday situations.** They travel
  to the provider with every message and they sit in a public repository, so
  nothing personal, nothing crude, nothing that points at the author. Grammar
  demonstrates just as well on a mundane sentence.
- Rules that apply to one language, or to something a message may not contain,
  are only sent when they can matter — see the gating in `translate.ts`. A rule
  added unconditionally costs every user tokens on every message.
- Everything that varies per message goes after the "Answer format" line, under
  "For this message in particular:". Everything above it must be identical from
  message to message, which a check enforces, because providers only cache a
  prompt prefix while it stays byte-identical.

Outgoing and incoming use separate prompts: outgoing must preserve the writer's
voice, incoming only has to be understood. A third request type, AI Explain,
names the language and explains what was meant.

## Running things

```
node test/prompts.mjs      # 103 checks; needs esbuild
node test/measure.mjs      # tokens and timing; also needs gpt-tokenizer
node test/rules.mjs        # prompt lines by weight
```

If esbuild or gpt-tokenizer are not beside the project, point at them with
`ESBUILD=...` and `TOOLS=...`.

Building the plugin itself means a Vencord checkout: copy this folder to
`src/userplugins/aiTranslate` there and run `pnpm build`. That cannot be done
from a cloud session, only on a machine with Vencord and Discord.

## How a change reaches users

`main` is the working branch. `release` is what users get. The robot in
`.github/workflows/build.yml` fetches `build/github.sh` **from `release`** every
hour, builds Vencord with the plugin inside, and publishes the result on
`builds.zolatau.com`; installed copies pick it up on their next check. Moving
`release` is a deliberate act, never a side effect of a commit.

One thing not to tidy: `@namespace` in the userscript header still points at a
GitLab address. Userscript managers identify a script by name and namespace
together, so changing it would orphan every installed copy.

## Style

- Comments are short. One line above a rule or a non-obvious decision, not a
  paragraph restating the code.
- No em dashes in interface text; they make it read as machine-written.
- Interface strings are reviewed word by word. Keep agreed wording exactly as
  it is unless asked to change it.
