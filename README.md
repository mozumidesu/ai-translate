<p align="center">
  <img src="docs/banner.png" alt="AI Translate" width="760">
</p>

<p align="center">
  <a href="docs/README.de.md">🇩🇪&nbsp;Deutsch</a> ·
  <b>🇬🇧&nbsp;English</b> ·
  <a href="docs/README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="docs/README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="docs/README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <a href="docs/README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="docs/README.ro.md">🇷🇴&nbsp;Română</a> ·
  <a href="docs/README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="docs/README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <a href="docs/README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <a href="docs/README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="docs/README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="docs/README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="docs/README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="docs/README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="docs/README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate

A plugin for Discord that translates your messages with an AI model of your
choice, and does it without flattening the way you write.

Messages you send are translated before they go out, chat by chat. Messages you
receive are translated when you ask for them, from the right-click menu.

## Why another translator

Machine translation is built for prose. Chat is not prose. It is lower case and
unfinished, it runs on kaomoji, and a missing full stop is doing work. Most
translators quietly tidy all of that away, and what arrives on the other side
reads like a form letter written by someone else.

This one is built around leaving it alone. It will not add punctuation you did
not write, it will not capitalise what you left in lower case, it keeps your
line breaks where you put them, and it knows an emoticon is a face rather than
a word to be rendered.

## What it can do

Auto-translation is set per chat, so the conversations you actually need it in
are the only ones it touches. Left-click the translate button in the chat bar
to open the panel; right-click it to switch the current chat on or off.

Anything you receive can be translated from the right-click menu on the
message. When even a translation leaves you none the wiser, because of chat
shorthand, a word only used in one country or a joke between two people,
**AI Explain** in the same menu names the language, spells the abbreviations
out and says what was meant.

The last few messages of the conversation travel with each request, so a bare
"yes", or "it won't paste", lands the way it was meant. You can pin your own
vocabulary too: words that must never be translated, terms tied to one fixed
translation, the grammatical gender to use for yourself, and whether people are
addressed formally or not.

A single message can keep part of itself as well. Put a word or phrase between
two backslashes, `\carpe diem\`, and it goes out exactly as you typed it, with
the backslashes taken off; a backslash at the start of a line keeps that whole
line. Code in backticks is never translated.

Your own sent messages can keep the original underneath them, visible only to
you, so you can see what actually went out; that one is off until you switch it
on. The interface speaks 16 languages and follows Discord's own unless you tell
it otherwise.

## Providers

You bring your own API key, and it stays yours. The plugin has no server of
its own and never sees anyone else's key.

| Provider | Free tier |
|---|---|
| Groq | yes |
| Google Gemini | yes |
| Z.ai GLM | yes, and reachable where the other two are blocked |
| Anthropic Claude | no |
| Any OpenAI-compatible API | depends on the provider |

A second provider can be named as a backup. When the first one is overloaded,
out of quota or refuses the request, the translation goes through the other one
without bothering you about it.

Requests are made from Discord's background process, so your key never enters
the part of Discord that a web page could reach.

## Install

AI Translate runs inside Vencord, a well-known mod for the Discord desktop app.
One command downloads Vencord with AI Translate already inside, about a
megabyte, and patches Discord. Nothing is built on your computer and nothing
else needs installing. It works with the regular Discord, PTB and Canary on
Windows, macOS and Linux.

**Windows.** Open PowerShell (Start menu, type "PowerShell") and paste:

```
irm https://builds.zolatau.com/install.ps1 | iex
```

**macOS and Linux.** Open Terminal and paste:

```
sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
```

Pick **Install or update** with the arrow keys and press Enter. When it asks
which Discord to patch, pick the one you use the same way. On Windows the
command closes Discord before patching it. On Linux it may ask for your
password, because Discord usually sits where only an administrator can write.
Then quit Discord completely, from the tray icon too, and start it again.

On atomic Linux systems, such as Bazzite, Silverblue, Kinoite or SteamOS, the
same command works: it installs nothing into the system, everything lands in
`~/.aiTranslate`. Discord itself should be the Flatpak one, and the installer
then grants that Flatpak access to those files on its own. A Discord layered
into the system image with `rpm-ostree` usually cannot be patched, because the
system folders are read-only there; install the Flatpak instead.

AI Translate is already switched on. Open **Settings → Vencord → Plugins →
AI Translate**, choose a provider and paste your key.

Everything the command downloads lives in one folder of its own:
`%LOCALAPPDATA%\aiTranslate` on Windows and `~/.aiTranslate` on macOS and
Linux. Patching Discord means swapping its startup file for a small one that
loads Vencord first and then Discord exactly as before; your Discord account,
settings and messages are not touched.

## In a browser

Discord in a browser tab needs none of the above: no Vencord to install, nothing
patched. The same plugin, with Vencord built in, also comes as a userscript.

Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript
manager, then open
[ai-translate.user.js](https://builds.zolatau.com/ai-translate.user.js). Your
userscript manager offers to install it, and keeps it up to date from there
afterwards. Open discord.com and reload the page. If the Vencord Web extension
is installed, switch it off: this script has Vencord inside it, and two of them
in one tab do not get along.

Then open **Settings → Vencord → Plugins → AI Translate**, choose a provider and
paste your key, the same as in the app. Your key is kept by the userscript
manager, not by the page, and requests go out through the manager as well. To
remove it, delete the script in your userscript manager.

## Updates

You do not need to do anything. AI Translate looks for a new version by itself
every 2 days, downloads it in the background and shows a notification; click
it and Discord restarts into the new version. If you ignore it, the update
simply applies the next time you start Discord. **Check for updates**, at the
bottom of the plugin's settings, does the same at once.

Every new version carries the latest Vencord too, so Vencord's own fixes
arrive the same way. On Windows and Linux the patch also survives Discord's
own updates. If AI Translate ever disappears after Discord updated itself, run
the install command again: it repairs the installation without losing your
settings.

## How the builds are made

Vencord only runs plugins that were built into it, so what you download is
Vencord with AI Translate inside. Nobody builds it by hand: a robot on GitHub
checks every hour, and whenever Vencord or AI Translate has a new version it
builds the two together from their own source and publishes the result on
[builds.zolatau.com](https://builds.zolatau.com/), which names the exact source
every build was made from.

## Uninstall

Run the same command as for installing and pick **Remove**. It takes the
patch off Discord, so Discord goes back to exactly how it was, and then asks
whether to delete the downloaded files as well. Quit Discord completely and
start it again.

Your API keys and settings are stored with Vencord's settings, not in the
downloaded files, so they are still there if you ever install again.

## Already building Vencord yourself

From your Vencord folder, clone this repository in as a userplugin and rebuild:

```
git clone https://github.com/mozumidesu/ai-translate src/userplugins/aiTranslate
pnpm build
```

Both lines are the same on Windows, macOS and Linux, and `git clone` creates
`src/userplugins` if it is not there yet. Restart Discord afterwards. The same
works for Equicord. A copy built this way does not update itself from GitHub;
`git pull` and build again.

## Reporting something

The envelope at the top of the plugin's settings page opens a window for bug
reports and requests, screenshots included. The support server is linked in the
same window.

## Licence

GPL-3.0-or-later.
