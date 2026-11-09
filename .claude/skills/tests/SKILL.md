---
name: tests
description: What each AI Translate test checks and why it exists, the paths outside the plugin, and how to run everything, including the Vencord import and type checks. Load before adding or changing a test, when a test fails and its purpose is unclear, or before running test/imports.mjs or test/types.mjs.
---

The full text behind the Everything else and Running things sections of CLAUDE.md.

### Everything else

| Path | Responsible for |
|---|---|
| `test/prompts.mjs` | 252 checks. Builds the real core, runs a real translation past a fake provider, reads the prompt that provider was handed. Also which chat the host says it is: for a host that says nothing, Discord's three opening sentences and the whole of the rule that keeps what Discord draws, word for word; for a host that names another chat with the plain dialect, its name in the prompts and none of Discord's syntax; for Telegram's dialect, its marks and @username in that rule, word for word |
| `test/corpus/cases.json`, `test/quality.mjs` | Whether a prompt rule actually works. Each case is a defect that came back from real use; the runner asks a real provider several times, because a model is not deterministic, and says how many runs each case survived. Each run is a request of its own: the plugin's cache of answers is emptied before every one. Until 7 November it was not, so a count older than that, in a comment or a commit message, is one answer counted several times. Costs tokens, so never part of the robot |
| `test/imports.mjs` | Whether every Vencord import the plugin makes still exists, resolved against a real Vencord checkout. The one test that cannot be fooled by esbuild's externals |
| `test/types.mjs` | The other half of that: whether the values handed to Vencord are still ones it accepts. esbuild strips types without reading them, so neither the robot nor the import check would ever notice. It found `tags: ["Translate"]` after Vencord made its tags a closed list. It reads `native.ts` as well, which nothing imports because Vencord finds it by name, and with it the type `core/bridge.ts` derives from it: a misspelt member of the bridge, a signature that drifts, a type error in `native.ts` or a path that stops resolving all fail it. A bare checkout has no `node_modules`, so `electron` is a declaration the test writes beside its tsconfig, holding only the event type `native.ts` takes; anything more is added there. The test installs the compiler itself, at the version Vencord builds with, and fails when it did not run: until 9 November it called `npx tsc`, which on a machine with no TypeScript, a CI runner among them, fetches an abandoned package of that name that checks nothing, and passed |
| `test/interface.mjs` | 178 checks on what a person sees, as far as Discord is not needed: every string present in all sixteen languages and no other, Logs and the two Vencord headings translated, the names a provider goes by, when the minus shows, the echo of what was typed against Discord's own escape rule, the two headings in a page shaped like Vencord's, a userscript asking whether it is the newest, built with the same two lines the robot rewrites in `core/bridge.ts`, and the build line of a support report, `<version> (<build>)`, from each kind of browser copy and from `native.ts` built for node with a `build.json` beside it |
| `test/bare.mjs` | 44 checks. Builds `core/` for no platform, takes the page away and runs a translation through a fake Net and a fake Host. Every file but `bridge.ts` is read for a use of `document`, `window` or `navigator` (esbuild's `define` finds a real use and nothing in a string, a comment or a property name, and the scan first checks that it can see what `bridge.ts` reaches for, so finding nothing means something). While the translations run those globals, `fetch` and the userscript manager's request are traps that write down being read, because a `catch` somewhere would swallow the throw. Also the app's language coming from the host, and the deadline where `AbortSignal.timeout` or `AbortController` is missing |
| `test/defaults.mjs` | 33 checks that `web/storage.ts` still agrees with `settings.ts`. The browser build writes its defaults out by hand, because importing the settings page would drag Vencord into the one build whose point is not having any, and nothing else notices when the two drift: a setting missing there is simply undefined, which reads as off. It caught AI Explain staying on in `web/` after it was switched off on the page. That build ships to nobody, but the check costs nothing and keeps it honest should it ever ship. A setting the browser does without has to be named in `DESKTOP_ONLY`, with the reason |
| `test/log.mjs` | 23 checks on what reaches the log and what must never: a key quoted back by a provider is masked, a failure never shows a toast with nothing in it, and a request's token cost is written down |
| `test/measure.mjs` | Tokens per request and the plugin's own time with the network taken out |
| `test/rules.mjs` | The assembled prompt line by line, heaviest first |
| `test/tokens.mjs` | Where the other two get their token counts: the `tools` binary, found in `tools/target/` or named by `TOKENS=` |
| `tools/` | The Rust side, a binary of its own. Not part of the plugin and not copied into Vencord |
| `install/install.ps1`, `install/install.sh` | The one-command install for Windows and for macOS/Linux. **Keep both**: the `.sh` is for users, not a leftover |
| `build/github.sh` | What the build robot does, publishing on `builds.zolatau.com` and making a GitHub release when the version has changed. **Keep**: it runs on Ubuntu inside Actions |
| `.github/workflows/build.yml` | When the robot runs: hourly at minute 17, plus a manual run. Also opens one issue when the build starts failing and closes it when it builds again, so an outage is noticed rather than sitting red |
| `.github/workflows/checks.yml` | The tests, on every push to `main` and on every pull request. `build.yml` builds what was released; this watches where the mistake was made |
| `CHANGELOG.md` | What changed in each version, under Added, Changed and Fixed. The robot puts the section whose heading matches the version into the release on GitHub; a version with no section falls back to the subjects of its commits, which is what the releases before the file have |
| `docs/` | The 15 translated READMEs and the banner |

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

If esbuild is not beside the project, point at it with `ESBUILD=...`, or at a
whole folder of modules with `TOOLS=...`.

The two that count tokens need the binary in `tools/`, which they look for in
`tools/target/`. Build it once with `cargo build --release` there, or say
where it is with `TOKENS=...`.

Building the plugin itself means a Vencord checkout: put this folder at
`src/userplugins/aiTranslate` there, which is what `tools sync --root . <vencord>`
does, and run `pnpm build`. That cannot be done from a cloud session, only on a
machine with Vencord and Discord.

**An import from Vencord can stop existing without anything here changing.**
The other tests mark `@webpack/*`, `@api/*`, `@utils/*` and `@components/*` as
external, so a name Vencord has since dropped builds cleanly under them and
fails on the robot with "No matching export". That is how `showToast`'s own
`Toasts` once went out on `release`, and how `Forms` and `Text` left the plugin
red for three days in October 2026 without a single commit of its own.

`node test/imports.mjs` is the answer to it: it resolves every Vencord import
the plugin makes against a real checkout, by Vencord's own `tsconfig` paths, and
fails exactly as the robot does. Point it at a checkout with `VENCORD=`, or let
it clone a shallow one. Run it before moving `release`, and whenever an import
is added or changed.

Two names it already caught: `Forms` and `Text` are gone from `@webpack/common`.
Vencord's own settings now use `Heading` from `@components/Heading` for a label
and `Paragraph` from `@components/Paragraph` for the text under it, and neither
carries a colour or a margin of its own, which is why `styles.css` names both
and doubles the class to outrank Vencord's.
