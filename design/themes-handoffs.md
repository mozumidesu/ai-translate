# Handoffs: themes, the settings layout and right-to-left

Three sessions, in this order, each started only once the one before it is
pushed. Each is self-contained; paste it as a new session's first message.

## 1. Core and the theme catalog

Repository: mozumidesu/ai-translate. Commit and push to `main` directly (no
`claude/...` branch, no pull request); pull before editing and before pushing,
merge a rejected push, never force.

Read `CLAUDE.md`, then `design/themes-and-settings.md` in full, which is the
agreed design, and `design/prototype/` (its source; `node
design/prototype/build.mjs > /tmp/themes.html` renders it). Load the `tests`,
`release` and `browser-builds` skills before touching tests, `build/github.sh`
or anything the userscript reads.

Build step 1 of the spec, with nothing visible yet:

- `core/themes.ts`: reading `index.json` (format 1) from
  `https://builds.zolatau.com/themes/` through the host's `Net`, caching the
  index and art through a new optional host member `themeStore` (async
  `read(key)` / `write(key, value)`; empty answers until a host gives one),
  the refresh schedule (20 s after start, then at most every six hours, the
  cache replaced only when everything arrived and parsed), keeping the art of
  the theme in use and of Recent, Recent itself (newest first, at most 12, No
  theme never in it), and the search exactly as the spec describes it
  (`design/prototype/app.js` has a working version). Nothing in `core/`
  touches the DOM; `test/bare.mjs` must stay green.
- Two hidden settings in `settings.ts`, `theme` and `recentThemes`, as the
  spec lists them, and the same defaults in `web/` so `test/defaults.mjs`
  agrees.
- `themes/`: `catalog.json` (the fifteen themes, palettes and names from the
  spec and `design/prototype/art.js`), `words.json` (every concept with
  synonyms in all 16 languages, enough that each language's `themes.search`
  example finds a forest theme), `draw.mjs` (the drawing functions moved from
  the prototype) and `build.mjs` (draws both modes, runs every check in the
  spec, writes `index.json` and hash-named `art/*.svg`).
- `test/themes.mjs`, added to `.github/workflows/checks.yml`: the catalog
  checks, and the search on cases from the spec ("зимний лес", "calm blue",
  "forset", "غابة", "вино" finding the hidden theme, a typo never finding it).
- `build/github.sh`: run `node themes/build.mjs` from `main` on every run and
  publish its output at `/themes/` whichever channel is built. A failed check
  fails the run.
- The strings in `core/locales.ts`: the renamed `gender.name` and every new
  key, in all 16 languages, from the spec. **Before committing them, show the
  owner the list for word-by-word review** and apply their changes, in the
  spec too. `test/interface.mjs` must pass.
- `CLAUDE.md`: the new files in the tables, and the new test in Running
  things.

Done: everything above pushed to `main`, every check in `CLAUDE.md`'s
Running things that can run in a cloud session passing (point `ESBUILD` at an
npm-installed esbuild), and the robot's next run publishing
`builds.zolatau.com/themes/index.json`, checked with a request. Reply to the
owner in Russian; commit messages in English.

## 2. Discord

Repository: mozumidesu/ai-translate, `main` as above. Starts after handoff 1
is pushed.

Read `CLAUDE.md`, `design/themes-and-settings.md` and `design/prototype/`.
Load the `providers` skill before touching `ui/Providers.tsx` or
`ui/ModelPicker.tsx`, `browser-builds` before `ui/UpdatePanel.tsx`, and
`tests` before any test.

Build step 2 of the spec:

- `ui/SettingsPage.tsx`: the whole settings page as one
  `OptionType.COMPONENT`, in the spec's order and row layout, with the sticky
  section bar, collapsed backup slots and the foot; every setting it draws
  becomes `hidden: true` in `settings.ts` with its key and default unchanged.
  Reuse the existing pieces (`Providers`, `ModelPicker`, `UpdatePanel`, Logs,
  Corrections) rather than rewriting their logic.
- `ui/Themes.tsx` (1156px), the delete confirmation, the palette button in
  `SettingsHeader`, and the Theme row.
- `ui/themeLayers.ts`: the art layer in each plugin window's
  `[role="dialog"]`, the circle across all open plugin windows, fast
  switching, reduced motion (including Discord's own setting), the accent
  property, and the performance rules in the spec. Measure a reveal as the
  spec says before calling it done.
- `ui/direction.ts` and every plugin window moved onto it, the settings page
  included; the inner `dir` divs go. Support and feedback at 560px.
- The README line in all 16 languages, shown to the owner first.
- `test/imports.mjs` and `test/types.mjs` cannot run here; list every new
  Vencord import in the reply so the owner runs them locally.

Done: pushed to `main` (the testing channel builds it at once), every check
that can run here passing, and a short Russian list for the owner of what to
try in Discord: themes in light and dark, fast switching, Recent and delete,
Arabic in every window, reduced motion.

## 3. Telegram

Repository: mozumidesu/ai-translate-telegram (it has `ai-translate/` as a
submodule). Commit and push to its `main` the same way. Starts after
handoff 2 is pushed.

Read its `CLAUDE.md`, then `ai-translate/design/themes-and-settings.md`.
Move the submodule pin to the commit that has handoffs 1 and 2, and raise the
counter as that `CLAUDE.md` says.

Build step 3 of the spec in the shadow root: the settings page in the same
structure (`src/settings.ts`), the Themes window and the delete confirmation
as `src/sheet.ts` windows with Discord's widths and the client's own timings,
the art layer on each `.panel`, the circle across open windows (with
`windows.motion()` deciding reduced motion), `themeStore` through the
userscript manager under `ai-translate-themes`, the catalog fetched with
`GM_xmlhttpRequest` (add `builds.zolatau.com` to `@connect` if it is not
there), and the README line in 16 languages. No strings of its own. Keep
Escape and Tab as `src/ui.ts` has them: Escape clears a search before it
closes Themes.

Done: `npm test` and the `tsc` line passing, `npm run build` committed, the
counter raised, `docs/test-plan.md` extended with the themes, and a short
Russian list for the owner of what to try in Web A and Web K.
