# AI Translate

A Vencord userplugin for Discord. It translates outgoing messages before they
are sent, chat by chat, and incoming messages on request from the right-click
menu, using an AI provider's API with the user's own key.

This folder is the plugin itself. In a working Vencord checkout it sits at
`src/userplugins/aiTranslate/`.

Details live in skills under `.claude/skills/`, each the full text this file
summarises. Load the one a task reaches before starting it:

| Skill | Load it before |
|---|---|
| `prompt-rules` | adding, changing or measuring a prompt rule, or touching the quality corpus |
| `release` | raising the version, moving `release`, or touching `build/github.sh`, the workflows or the installers |
| `browser-builds` | touching `web/`, `core/bridge.ts`, `core/builds.ts`, `updater.ts`, `ui/UpdatePanel.tsx` or the userscript |
| `providers` | touching `core/slots.ts`, `core/providers.ts`, `ui/Providers.tsx` or `ui/ModelPicker.tsx` |
| `tests` | adding or changing a test, or reading a failure whose point is unclear |
| `rust-tools` | using or changing `tools/`, or reconsidering the choice of TypeScript |
| `file-map` | working in a file whose line below does not say enough |

## Sessions

A session sends its whole history with every request, and that is what
spends the usage limits. A new task gets a new session, handed over in
English: the repository, the branch, the files, and what done looks like. The
effort level is set in `.claude/settings.json`.

## Hard constraints

- **The plugin is TypeScript and stays TypeScript.** It runs inside Discord's
  window, bundled by Vencord's esbuild and hooked into Discord's internals.
  Rust, WASM and a native sidecar were considered and rejected: the plugin's
  own work is under a millisecond against a second of network. Rust belongs in
  `tools/`, not here.
- **Never commit anything from `local/`.** One line in `.gitignore` covers the
  whole folder: personal scripts, the feedback relay's source, publishing
  addresses. A cloud session cannot see it at all, which is intended.
- **Every user-visible string exists in 16 languages** in `core/locales.ts`. Adding
  or changing one means changing all 16, not only English. `test/interface.mjs`
  fails when a language lacks a string English has, or has one English does not.
- **The README exists in 16 languages too**: `README.md` plus
  `docs/README.<code>.md`. Same rule.

## What each file does

### `core/` — runs anywhere, knows nothing about Vencord

| File | Responsible for |
|---|---|
| `core/translate.ts` | The prompts, the translation itself, post-processing, the glossary, conversation context and pacing. The biggest file and the one that matters most |
| `core/host.ts` | What the core cannot know by itself: settings, recent messages, the current user, notices, and optionally the chat's name, its dialect and the app's language. Answers empty, not throwing, until a host is installed |
| `core/dialect.ts` | How a chat writes text: what Discord draws out of it (raw ids, line markdown, escapes), what Telegram draws (marks around text, @username), and a plain dialect with none of that. The host chooses; Discord when it does not |
| `core/bridge.ts` | Where a request goes: Electron's main process, or straight from here in a browser. The robot writes the build's name and channel into two constants here |
| `core/builds.ts` | Where the build robot publishes, and what each channel hands out now |
| `core/net.ts` | How to make one HTTP request: `fetch`, `GM_xmlhttpRequest` or the host's own (`useNet`); and a deadline that works without `AbortSignal.timeout` |
| `core/providers.ts` | Each provider's address and request shape, rate limits read from responses, and every retry rule |
| `core/keep.ts` | What must not be translated, `\fragments\`, code, slash emoticons and never-translate words, held as placeholders; also `literalBackslashes` for the echo |
| `core/languages.ts` | The language list for the dropdowns |
| `core/locales.ts` | Interface text in 16 languages |
| `core/chats.ts` | Which chats have auto-translation on |
| `core/slots.ts` | Which providers this copy asks, in what order, and what each is called |
| `core/version.ts` | The version people see, and the only place it is written down |
| `core/learn.ts` | AI Learn without Discord: whether it is the writer's own attempt, what a correction changed, the `why:` line, the last fifty corrections |
| `core/log.ts` | The last 200 things that happened, for the Logs panel, with key-shaped runs masked |

Nothing in `core/` imports anything above it, and esbuild refuses any import
from outside the folder: that is what makes the browser build possible and lets
the tests run the real core without Discord. Keep it true. Nor does anything in
`core/` but `bridge.ts` touch `document`, `window` or `navigator`: what a page
knows reaches the core through the host, which is what lets it run in an app,
and `test/bare.mjs` fails on a use. Inside `web/`, a bare
`./host` is `web/`'s own host and the core's is `../core/host`.

The one reach upwards is a type: `bridge.ts` derives the desktop bridge's
signatures from `native.ts` with `import("../native")`, so the two cannot drift
apart. esbuild erases it, but `tsc` follows it: a program that type-checks
`core/` type-checks `native.ts` too, and needs Node's types and an `electron`
declaration to do it, as `test/types.mjs` gives its own.

`core/` is also the Telegram Web userscript's, mozumidesu/ai-translate-telegram,
which has it as a submodule pinned to a commit, uses it unchanged and speaks the
`telegram` dialect. A change here reaches it only when that pin moves.

### The Vencord side

| File | Responsible for |
|---|---|
| `index.tsx` | The plugin as Vencord sees it: the chat-bar button, the block under a message, the right-click menu, `definePlugin` |
| `vencord-host.ts` | Answers `core/host.ts` with Vencord's settings, message store, user and toasts, reading `Settings.plugins["AI Translate"]` directly |
| `native.ts` | Electron's main process: provider requests, which CORS blocks in the renderer, and installing updates |
| `settings.ts` | The settings page and its migrations |
| `updater.ts` | When a copy on a disk looks for an update, and which channel it follows |
| `ui/modal.tsx` | The panel behind a left click on the button |
| `ui/Feedback.tsx` | The feedback form at the top of the settings page |
| `ui/Providers.tsx`, `ui/ModelPicker.tsx` | The provider blocks, and each slot's model dropdown |
| `ui/Logs.tsx` | The Logs button and its panel: Copy, Save .txt, Clear |
| `ui/LearnPanel.tsx` | The Corrections button and panel, hidden while AI Learn is off |
| `ui/KeepHelp.tsx`, `ui/SectionTitle.tsx`, `ui/UpdatePanel.tsx` | Smaller settings-page pieces; `UpdatePanel` is Check for updates |
| `ui/ModalHeadings.ts` | Puts Vencord's "Authors" and "Settings" into the plugin's language, in this plugin's window only |
| `styles.css` | Styling. Discord resets list styles, so bullets are set on `li` here |

Vencord finds only `index.tsx` and `native.ts` by name; `ui/` is an ordinary
folder reached by relative import. The plugin's name in `definePlugin` is
**AI Translate**, with a space: Vencord stores settings and builds the bridge to
`native.ts` under it, `VencordNative.pluginHelpers["AI Translate"]`, so renaming
it resets saved settings. `migrateSettings` in `settings.ts` carries them over
from the older name `AiTranslate`.

### Everything else

| Path | Responsible for |
|---|---|
| `test/` | The checks. `prompts.mjs`, `bare.mjs`, `interface.mjs`, `log.mjs` and `defaults.mjs` run in CI; `imports.mjs` and `types.mjs` need a Vencord checkout; `measure.mjs` and `rules.mjs` count tokens |
| `test/corpus/cases.json`, `test/quality.mjs` | Whether a prompt rule works, asked of a real provider several times a case. Costs tokens, so never part of the robot. A count from before 7 November is one answer counted several times |
| `install/install.ps1`, `install/install.sh` | The one-command install for Windows and for macOS/Linux. **Keep both**: the `.sh` is for users, not a leftover |
| `build/github.sh` | What the build robot does. **Keep**: it runs on Ubuntu inside Actions |
| `.github/workflows/build.yml` | When the robot runs: hourly at minute 17, plus a manual run, with one issue open while the build fails |
| `.github/workflows/checks.yml` | The tests, on every push to `main` and on every pull request |
| `CHANGELOG.md` | What changed in each version, under Added, Changed and Fixed; the robot puts the matching section into the release on GitHub |
| `docs/` | The 15 translated READMEs and the banner |
| `web/` | A standalone browser build with no Vencord, which nothing publishes. What people run in a browser is the userscript the robot builds with Vencord's own `pnpm buildWeb`: the whole plugin, AI Learn included, updated by its userscript manager. Say which of the two you mean |
| `tools/` | A Rust binary of its own, `ai-translate-tools`: `css`, `header`, `tokens`, `preview` and `sync`, upkeep for this repository and the website's. Nothing here imports it, and `tools sync` leaves it out of the copy into Vencord |
| `.claude/` | `settings.json`, which sets the effort level, and the skills this file points to |

## Providers

One slot is asked and up to four stand behind it, in order; each keeps its own
key and model per provider. The same provider may stand in two slots, so rate
limits are counted by the slot, never by the provider's name. A red line under
a key appears only when the provider refused it, 401 or 403, once the field has
been left. Settings from before the list are still read when no list exists,
which is what `web/` and every test hand over.

## Prompt rules

Each rule is a constant in `core/translate.ts` in full English prose, with one
comment line above it saying what went wrong without it, and pinned by a check
in `test/prompts.mjs` named after that failure. There is no third prose copy of
a rule anywhere: do not create one.

- Run `node test/prompts.mjs`. A rule that loses its wording fails its check by
  name; update the pinned phrase only when the rule genuinely changed.
- Examples inside rules are ordinary, everyday situations: they travel with
  every message and sit in a public repository. Nothing personal, nothing crude,
  nothing that points at the author.
- Where a rule has to overcome a real ambiguity, name the fault, not the answer.
- A rule for one language, or for something a message may not contain, is sent
  only when it can matter: unconditional, it costs every user on every message.
- What the chat is called and what it draws itself (mentions, spoilers, line
  markdown) come from the host's dialect, `core/dialect.ts`; the wording of the
  rule stays here. A host that says nothing is Discord, and Discord's prompts
  stay byte for byte what they were, which `test/prompts.mjs` pins.
- What varies per message goes after the "Answer format" line, under "For this
  message in particular:". Everything above it stays byte-identical from message
  to message, which a check enforces, so providers can cache it.

Outgoing preserves the writer's voice; incoming only has to be understood. AI
Explain names the language and explains what was meant. AI Learn asks how a
native speaker would have written the person's own message, in a prompt a tenth
the size; it answers with the corrected message and, only when something
changed, a last line beginning `why:` in the language the person reads.
Unasked, it stays silent when the message was right; asked from the right-click
menu, it always answers, "nothing to correct here" included.

## Running things

```
node test/prompts.mjs      # 252 checks; needs esbuild
node test/log.mjs          # 23 checks on the log and on error notices; needs esbuild
node test/defaults.mjs     # does the browser build still agree with the settings page; needs esbuild
node test/interface.mjs    # 178 checks on strings, provider names, the echo, the headings, browser updating, the report's build line; needs esbuild
node test/bare.mjs         # 44 checks: the core on a bare engine, a fake Net and Host, no DOM globals; needs esbuild
node test/imports.mjs      # are the Vencord imports still real; needs esbuild and a Vencord checkout
node test/types.mjs        # do the types still agree with Vencord; needs npm and that same checkout
node test/quality.mjs      # do the rules work; needs esbuild and a provider key in the environment
node test/measure.mjs      # tokens and timing; also needs tools/ built
node test/rules.mjs        # prompt lines by weight; the same
```

Point at esbuild with `ESBUILD=...`, or a folder of modules with `TOOLS=...`;
the token counters want `tools/` built, or `TOKENS=...`. Building the plugin
needs a Vencord checkout, never possible from a cloud session.

A Vencord import can vanish without a commit here, and only `test/imports.mjs`
sees it: run it before moving `release` and whenever an import changes.
`Forms` and `Text` are gone from `@webpack/common`; use `Heading` from
`@components/Heading` and `Paragraph` from `@components/Paragraph`, which carry
no colour or margin, so `styles.css` names both and doubles the class.

## How a change reaches users

- The version lives in `core/version.ts` and nowhere else, `0.2.1a` today. The
  third number counts fixes, the second anything new and puts the third back to
  zero, nine is the ceiling for both, and `1.0.0` drops the letter. Raising it
  is part of moving `release`, never of a commit; builds made because Vencord
  moved are not versions.
- `main` is the working branch, where work is committed and pushed, in a cloud
  session too: no `claude/...` branch. `release` is what users get, and moving
  it is a deliberate act, never a side effect of a commit.
- `main` is also the testing channel: every push to it reaches whoever follows
  that channel within the hour. Nothing advertises it.
- The robot takes `build/github.sh` from `release` and makes a GitHub release
  only when the version changed. If it cannot carry over the channel it did not
  rebuild, nothing is published at all.
- `@namespace` in the userscript header still points at GitLab. Do not tidy it:
  that would orphan every installed copy.

## Style

- Comments are short. One line above a rule or a non-obvious decision, not a
  paragraph restating the code.
- No em dashes in interface text; they make it read as machine-written.
- Interface strings are reviewed word by word. Keep agreed wording exactly as
  it is unless asked to change it.
