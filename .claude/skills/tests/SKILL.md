---
name: tests
description: What each AI Translate test checks and why it exists, the paths outside the plugin, and how to run everything, including the Vencord import and type checks. Load before adding or changing a test, when a test fails and its purpose is unclear, or before running test/imports.mjs or test/types.mjs.
---

The full text behind the Everything else and Running things sections of CLAUDE.md.

### Everything else

| Path | Responsible for |
|---|---|
| `test/prompts.mjs` | 377 checks. Builds the real core, runs a real translation past a fake provider, reads the prompt that provider was handed. Also who wrote the message being read: the line `collectContext` ends with, with context on or off, where Discord's `index.tsx` once added it itself. Also which chat the host says it is: for a host that says nothing, Discord's three opening sentences and the whole of the rule that keeps what Discord draws, word for word; for a host that names another chat with the plain dialect, its name in the prompts and none of Discord's syntax; for Telegram's dialect, its marks and @username in that rule, word for word. Also when a backup answers in the first slot's place, and that the first slot's own error is then said once. Also that a model refusing the temperature is asked again without one, and without one from then on. Also how each language is written, which is its record in `core/languages.ts`: every record complete, languages that share an alphabet agreeing on its capitals, each language's own name in the alphabet its record names (the mistake a new row is likely to make is leaving the alphabet out, and Latin is what it then says), and a second build of the core with one more row to show that a row is all a language takes. And what the answer is put right by: the closing marks and capitals of the language it is in, a message written on one line put back on one without asking (and one of several broken further asked for again), the English "I" in prose and not in an address, an ending only in its own alphabet, a run of dashes as one, names that stand unchanged. Every translation in these is cached by its kind, text and target, so two checks that share all three share an answer, and the second asks nothing |
| `test/corpus/cases.json`, `test/quality.mjs` | Whether a prompt rule actually works. Each case is a defect that came back from real use, or, in the group `manner`, an idea being weighed: whether a little of the chat's own way of talking reaches a translation, and none of the chat's slang or swearing does. A case lists what the answer must and must not contain, and in `anyOf` lists of which one is enough, such as the several Japanese words for "I". The runner asks a real provider several times, because a model is not deterministic, and says how many runs each case survived. Each run is a request of its own: the plugin's cache of answers is emptied before every one. Until 7 November it was not, so a count older than that, in a comment or a commit message, is one answer counted several times. Costs tokens, so never part of the robot |
| `test/imports.mjs` | Whether every Vencord import the plugin makes still exists, resolved against a real Vencord checkout. The one test that cannot be fooled by esbuild's externals |
| `test/types.mjs` | The other half of that: whether the values handed to Vencord are still ones it accepts. esbuild strips types without reading them, so neither the robot nor the import check would ever notice. It found `tags: ["Translate"]` after Vencord made its tags a closed list. It reads `native.ts` as well, which nothing imports because Vencord finds it by name, and with it the type `core/bridge.ts` derives from it: a misspelt member of the bridge, a signature that drifts, a type error in `native.ts` or a path that stops resolving all fail it. A bare checkout has no `node_modules`, so `electron` is a declaration the test writes beside its tsconfig, holding only what `native.ts` takes, the event type and `session`; anything more is added there. The test installs the compiler itself, at the version Vencord builds with, and fails when it did not run: until 9 November it called `npx tsc`, which on a machine with no TypeScript, a CI runner among them, fetches an abandoned package of that name that checks nothing, and passed |
| `test/interface.mjs` | 190 checks on what a person sees, as far as Discord is not needed: every string present in all sixteen languages and no other, Logs and the two Vencord headings translated, the names a provider goes by, when the minus shows, the echo of what was typed against Discord's own escape rule, an edit going out as typed on the desktop and in a browser, the two headings in a page shaped like Vencord's, a userscript asking whether it is the newest, built with the same two lines the robot rewrites in `core/bridge.ts`, and the build line of a support report, `<version> (<build>)`, from each kind of browser copy and from `native.ts` built for node with a `build.json` beside it. Also which build a desktop copy is: asked of its main process, or, when that main process is from before `whichBuild` had its name and Discord has not restarted since an update, read from the build stamped into the renderer, which is the same build |
| `test/bare.mjs` | 44 checks. Builds `core/` for no platform, takes the page away and runs a translation through a fake Net and a fake Host. Every file but `bridge.ts` is read for a use of `document`, `window` or `navigator` (esbuild's `define` finds a real use and nothing in a string, a comment or a property name, and the scan first checks that it can see what `bridge.ts` reaches for, so finding nothing means something). While the translations run those globals, `fetch` and the userscript manager's request are traps that write down being read, because a `catch` somewhere would swallow the throw. Also the app's language coming from the host, and the deadline where `AbortSignal.timeout` or `AbortController` is missing |
| `test/native.mjs` | 40 checks on the desktop's way out. `native.ts` is built for node beside a fake Electron: every request it makes, translations, the key check, feedback and the update download, goes through `session.fromPartition("ai-translate").fetch`, never Node's fetch, with no cookies and the request otherwise as it was; an HTTP error, a network failure and the deadline reach the core as before; an Electron with no `session.fetch`, or a session asked for before the app is ready, falls back to Node's fetch; and `failureOf` names a failure's cause, which Node keeps out of "fetch failed". A request that did not succeed says which way it went, Chromium's `resolveProxy` for its address or Node's fetch, and the key check's and a translation's lines in the Logs end with it; a proxy on this computer is named, one elsewhere is only called remote. It exists because Node's fetch ignores the system proxy, PAC and `--proxy-server` Discord follows, so behind a VPN in proxy mode Groq saw the real address and answered 403. Whether Chromium then takes the proxy needs Electron itself, and was measured by hand on Electron 37 and 45 |
| `test/defaults.mjs` | 33 checks that `web/storage.ts` still agrees with `settings.ts`. The browser build writes its defaults out by hand, because importing the settings page would drag Vencord into the one build whose point is not having any, and nothing else notices when the two drift: a setting missing there is simply undefined, which reads as off. It caught AI Explain staying on in `web/` after it was switched off on the page. That build ships to nobody, but the check costs nothing and keeps it honest should it ever ship. A setting the browser does without has to be named in `DESKTOP_ONLY`, with the reason |
| `test/log.mjs` | 36 checks on what reaches the log and what must never: a key quoted back by a provider is masked, and the one the request was sent with is taken out whatever its shape, from the notice and the error as well; a failure never shows a toast with nothing in it; and a request's token cost is written down. Also that each line's time is marked UTC, in a zone that is not UTC (the check says so when it is not, since it could not tell the two apart), with a detail line still under the level |
| `test/keys.mjs` | 100 checks on a key as it is pasted and what a provider says about it. A trailing space, a no-break space, a zero-width space, a byte order mark and a line break are cleaned when the key is saved, when a key saved before is read and in the header actually sent. Each provider's real answer to a wrong key is a bad key, Gemini's 400 included; the documented answers to a network or a country turned away are "blocked"; a rate limit, an outage or a permission that is not the key's say nothing. The check lands in the log with the key taken out, and a translation that meets the same answers says a wrong key, a refused network (never raw JSON) or the provider's own words. Z.ai's two 401s, as measured, are both a bad key, and the one that says "token expired or incorrect" is said further: a value that is no API key, in the line under the key, in the log and in a translation's notice, with a key that has no dot still sent as pasted. The Groq bodies in it were each measured on one evening and are held, none of them told apart by logic. Slots saved when Other was still "Any OpenAI-compatible", an Anthropic slot beside one, and the settings from before the list read as they were saved, Anthropic in its own API and Other at its address; Anthropic's OpenAI-compatible answers, as measured, are a bad key as well. It exists because a good Groq key was refused for one invisible character, and a 403 was called a bad key |
| `test/measure.mjs` | Tokens per request and the plugin's own time with the network taken out |
| `test/rules.mjs` | The assembled prompt line by line, heaviest first |
| `test/tokens.mjs` | Where the other two get their token counts: the `tools` binary, found in `tools/target/` or named by `TOKENS=` |
| `tools/` | The Rust side, a binary of its own. Not part of the plugin and not copied into Vencord |
| `install/install.ps1`, `install/install.sh` | The one-command install for Windows and for macOS/Linux. **Keep both**: the `.sh` is for users, not a leftover |
| `build/github.sh` | What the build robot does, publishing on `builds.zolatau.com` and making a GitHub release when the version has changed. **Keep**: it runs on Ubuntu inside Actions |
| `.github/workflows/build.yml` | When the robot runs: on every move of `release` or `main`, hourly at minute 17 for a new Vencord, plus a manual run, one run at a time. Also opens one issue when the build starts failing and closes it when it builds again, so an outage is noticed rather than sitting red |
| `.github/workflows/checks.yml` | The tests, on every push to `main` and on every pull request. `build.yml` builds what was released; this watches where the mistake was made |
| `CHANGELOG.md` | What changed in each version, under Added, Changed and Fixed. The robot puts the section whose heading matches the version into the release on GitHub; a version with no section falls back to the subjects of its commits, which is what the releases before the file have |
| `docs/` | The 15 translated READMEs and the banner |

## Running things

```
node test/prompts.mjs      # 377 checks; needs esbuild
node test/log.mjs          # 36 checks on the log and on error notices; needs esbuild
node test/keys.mjs         # 100 checks: a pasted key cleaned, each provider's answers judged, saved slots read, the check logged, a translation's notice for them; needs esbuild
node test/defaults.mjs     # does the browser build still agree with the settings page; needs esbuild
node test/interface.mjs    # 190 checks on strings, provider names, the echo, an edit left as typed, the headings, browser updating, the report's build line, which build a copy is; needs esbuild
node test/bare.mjs         # 44 checks: the core on a bare engine, a fake Net and Host, no DOM globals; needs esbuild
node test/native.mjs       # 40 checks: native.ts beside a fake Electron, every request through the plugin's own session, failures with their cause and route; needs esbuild
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
`src/userplugins/ai-translate` there, which is what `tools sync --root . <vencord>`
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
