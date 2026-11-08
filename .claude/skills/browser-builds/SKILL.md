---
name: browser-builds
description: The two browser builds of AI Translate: the userscript that ships, built by Vencord's buildWeb, and the standalone web/ build that nothing publishes, with how the userscript updates. Load before touching web/, core/bridge.ts, core/builds.ts, updater.ts, ui/UpdatePanel.tsx or anything about the userscript.
---

The full text behind the browser paragraph of CLAUDE.md.

### The browser: two builds, and only one of them ships

**What people run in a browser is not `web/`.** The robot builds the userscript
with Vencord's own `pnpm buildWeb` and publishes it as `ai-translate.user.js`:
that is Vencord with the whole plugin inside, `index.tsx`, the settings page and
AI Learn included, so a browser copy has everything a desktop one has, drawn by
Vencord's own settings page.

One thing does differ: it has no main process, so it cannot update itself. Its
userscript manager does, from the `@updateURL` and `@downloadURL` that
`build/github.sh` writes into the header, and the `@version` that Vencord makes
of its own version and the time of the build, which is what grows with every
build and makes a manager offer the update. The Check for updates button in a
userscript only asks `core/builds.ts` whether the build it runs is still the
newest and hands the new script to the manager, by opening its `.user.js`
address from the click. It asks nothing by itself: the manager would raise a
question about the new address at a moment nobody chose. The header carries no
`@connect`, on purpose: how a manager treats the addresses it does not list once
there is one cannot be tried from a cloud session, and every provider request
depends on the answer. The manager asks about each new address the first time,
as it always has.

`web/` is something else: a standalone build with no Vencord at all, which
nothing publishes. `build/github.sh` never runs `web/build.mjs`, and neither do
the installers. `intercept.ts` catches outgoing messages, `panel.ts` is its own
settings panel, provider slots and all, `storage.ts` its own store, `user.ts`
and `toast.ts` fill in for the host, `host.ts` wires them together, `build.mjs`
builds it. `meta.js` is its userscript header. `web/dist/` is build output and
is gitignored. It has no AI Learn, which nobody notices because nobody runs it.

Saying "the browser" without saying which of the two is how a whole day went
into a panel no user sees: the shipped userscript already had the provider list
from the moment the desktop did.
