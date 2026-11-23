# Changelog

What changed in each version, in the words a person would use. The build robot
takes the section whose heading matches the version being released and puts it
in the release on GitHub; with no section it falls back to the subjects of the
commits, which is what the releases before this file have. What is on `main`
and not yet released waits under Unreleased, which takes the version's name
when `release` moves.

## Unreleased

### Added

- **Translate all below, in a message's right-click menu.** Right after
  AI Translate, it translates that message and every one under it that
  someone else wrote, in one request for a screenful instead of one request
  each, and shows each translation under its own message as AI Translate
  does. It is offered only when at least two such messages are below the one
  clicked. Your own messages, ones already shown translated and ones already
  in the language you read are left out. Up to 15 messages and 1500
  characters go in one request and up to 45 messages in one click; more take
  another request. Ten short messages cost one request and about 3,400 tokens
  instead of ten requests and about 30,000. A message the answer leaves out
  or gets wrong is translated on its own, and each translation is remembered,
  so translating one of them again afterwards costs nothing.

### Changed

- **The conversation sent along with a message is smaller.** Up to three
  earlier messages go with one you send and up to four with one you read,
  and fewer when they cannot help: two for a message of a sentence or two,
  none for a long one that carries its own sense, and the whole allowance for
  a short reply such as "yes" or "same". Messages older than half an hour
  before it are left out, and all the lines share 480 characters, newest
  first. AI Explain still gets four.
- **A translation shown under a message stays until Discord restarts.** Past
  200 of them, the oldest is forgotten, one at a time, where before all of
  them went at once. Translations kept to be reused work the same way.
- **In a one-to-one chat, "you" in someone's message now agrees with your own
  gender.** When "My grammatical gender" is set, a direct message's "you" is
  you, so "you were right" reaches a reader set as female as "ты была права",
  where it used to come out masculine or as a guess. Group chats and server
  channels are unchanged, and so is your own message read back.

### Fixed

- **A word drawn out for feeling is translated, then drawn out.** "nooo!!"
  came in as "нууу!!", another word, or as "nooo" left in English; it is now
  "нееет!!", and "нееет" goes out as "nooo", "yesss" comes in as "дааа". A bare
  sound such as "Ооо" or "Ммм" keeps its sound as before.

- **The install command on macOS and Linux no longer deletes the old folder
  while a Discord still loads from it, when the home folder's name has `&`,
  `<`, `>`, `"` or `\` in it.** Vencord's installer writes such a character
  into a Discord's app.asar as an escape, `&` as `\u0026`, and the command
  looked for the folder's name as typed. So it never found a Discord still on
  the old folder, never offered to patch it, and deleted the folder that
  Discord loads from, after which it no longer started. It now looks for the
  name the way Vencord's installer writes it. Removing AI Translate was
  affected the same way. Version 0.2.5a has this fault; the fix reaches users
  with the next release.

## 0.2.5a

Released on 22 November 2026.

### Changed

- **The install command lists the Discords itself.** On macOS and Linux it no
  longer shows the menu of Vencord's installer, which drew itself wrong when a
  Discord's folder was wider than the terminal, as a Flatpak's is: every arrow
  press left the menu a row lower and pieces of it behind. Its own lines fit
  an 80-column terminal, with "Stable (Flatpak)" for a Flatpak and ~ for the
  home folder, and "Another folder" takes one typed by hand. On Windows a
  Discord is listed by its name alone, and only when Vencord's installer can
  patch it. Removing AI Translate uses the same list.
- **Moving out of the old folder asks only what it has to.** Instead of asking
  whether another Discord on the computer had AI Translate too, the install
  command looks for itself: it names each Discord that still loads AI
  Translate from the old folder and offers to patch it as well, and when there
  is none it asks nothing. Answering No keeps the old folder, as before.

### Fixed

- **Removing AI Translate keeps its files while another Discord still loads
  them.** Removing the patch from one Discord and deleting the downloaded
  files left a second Discord patched to files that were gone, and it no
  longer started. Now the files stay, that Discord is named, and running the
  command again removes the patch from it too.

- **On Windows, when no Discord is found, the install command's menu no
  longer starts with an empty line.** Asked which Discord to patch, it now
  offers only "Another folder" instead of a blank first choice.
- **On Windows too, the install command keeps the old folder while a Discord
  still loads from it.** Moving out of `%LOCALAPPDATA%\aiTranslate`, it asks
  whether another Discord on the computer had AI Translate too, and answering
  No while one still did deleted the folder that Discord loads from, so it no
  longer started. Now the command first looks at every Discord where Vencord's
  installer finds them, and while one still loads from the old folder it
  keeps the folder, says which Discord that is and stops. Run it again and it
  moves again, patching that Discord too.

## 0.2.4a

Released on 22 November 2026.

### Changed

- **An edited message goes out exactly as you typed it.** An edit used to be
  translated like a new message, so putting right one word of a translation
  sent the whole of it to the model again, and it could come back reworded.
  Now an edit is never translated, in a chat with auto-translation on as well,
  on the desktop and in a browser alike, and nothing in it is touched, not
  even the backslashes around a `\carpe diem\`. New messages are translated
  as before.
- **The install command's folder is called `ai-translate` now:**
  `~/.ai-translate` on macOS and Linux, `%LOCALAPPDATA%\ai-translate` on
  Windows. Running the command again moves a copy out of the folder of the old
  name: the files arrive in the new folder, Discord is patched again to load
  them from there, and the command asks whether another Discord on the same
  computer (PTB, Canary, a Flatpak beside a native one) had AI Translate too.
  Answer Yes and it patches that one as well, and asks again until the answer
  is No. The old folder is deleted only once every patch has worked, so no
  Discord is left pointing at a folder that is gone. On macOS and Linux the
  command also looks at every Discord where Vencord's installer finds them,
  and while one still loads from the old folder it keeps the folder, says
  which Discord that is and stops. If a patch fails or is cancelled, the old
  folder stays too, and the next run moves again. Your settings and keys are
  kept by Vencord in a folder of its own and stay as they are. Until you run
  the command, a copy in the old folder goes on updating itself there. If you
  build the plugin yourself, its folder in Vencord is
  `src/userplugins/ai-translate`, and `tools sync` moves a copy it made under
  the old name.
- **"Any OpenAI-compatible" is called Other.** It takes the address of any
  OpenAI-compatible API, as before, and the line under that address now says
  so, with two examples: `https://openrouter.ai/api/v1` and
  `https://api.openai.com/v1`. A message about it names the address it went to,
  "openrouter.ai did not accept this key", rather than "OpenAI-compatible".
  Nothing saved has to change: a provider set up before keeps its key, model
  and address. Anthropic Claude stays in the list with its own API.

### Fixed

- **Claude from 4.7 on translates, and so does any model like it.** Those
  models take no temperature but their own and refuse any other with an error,
  as Anthropic's documentation says, and the plugin always asked for 0.2, so
  with such a model no message was translated. A model that refuses it is now
  asked again without one, and without one from then on.
- **A message you write on one line goes out on one line.** Three sentences
  typed on one line could arrive as three lines, one a sentence, however the
  prompt asked: the plugin put line breaks right only in a message that had
  some of its own. The lines are now joined back at once, with no second
  request: with a space, or in Chinese and Japanese straight on after the
  sentence's own mark. A message read in your language is put back the same
  way. A message of several lines that comes back broken in more places is
  asked for once more, as one that came back run together always was.
- **The line under Backup provider describes the list as it is.** It still
  spoke of a single backup retried quietly. It now says that up to four can
  stand behind the main provider, each with its own key and model, and that a
  translation goes through the next one by itself.
- **The README says where your key really is.** It said that on the desktop
  the key never enters the part of Discord a web page could reach, and that in
  a browser the userscript manager keeps it. Neither was so: the key is saved
  with the rest of Vencord's settings, where code running in Discord's window,
  other plugins included, can read it, and in a browser that is discord.com's
  storage, which deleting the script leaves behind. In all sixteen languages
  the README also says now that AI Explain is off until you switch it on, that
  up to four backup providers can stand behind the first, that a translation
  goes straight from Discord to your provider with no server of the plugin's
  in between, and it names the menu item and the Check for updates button the
  way the plugin shows them.

## 0.2.3a

### Fixed

- **On the desktop, requests go the way Discord's own do.** They were made by
  Node inside Discord, which ignores the proxy Discord follows: the system proxy
  set in GNOME, KDE or Windows, a `*_proxy` variable, a PAC file or
  `--proxy-server`. Behind a VPN running as a system proxy, which is how most
  VPN clients on Linux run, Discord went through the VPN and the plugin did
  not, so Groq saw the real address and answered "Forbidden", or the request
  failed with "fetch failed". Translations, the key check, feedback and updates
  now go through Discord's own network stack, and take its proxy and route.
- **A network failure says why in the Logs.** "fetch failed" now comes with its
  reason, such as a name that did not resolve or a refused connection, and
  Chromium's own name for it, such as `net::ERR_PROXY_CONNECTION_FAILED`.
  A request that did not succeed also says which way it went, `DIRECT` or the
  proxy it took, so a refusal shows whether it came through the VPN or round it.
- **A key pasted with something invisible on it works now.** A space, a line
  break or a zero-width character copied along with a key went to the provider
  as part of it, and a good key came back "Groq did not accept this key". Keys
  are cleaned as they are pasted, and keys saved before are cleaned when they
  are used. The address of an OpenAI-compatible provider loses what a paste left
  at its ends the same way.
- **"Did not accept this key" means the key now.** Any 403 used to be called a
  bad key, though providers answer a network or a country they do not serve
  with a 403 as well. When the provider turns your network or region away, the
  settings say so under the key and under the model list, with no red line. A
  wrong Gemini key, which Gemini answers with a 400, is now called wrong, on the
  settings page and when a translation fails.
- **A translation says so when your network is the problem.** Groq answers a VPN
  or proxy it does not like with a bare "Forbidden", and a translation reported
  it as "refused the request, usually temporary", with nothing to say it would
  happen again. It now says the provider stopped the request before the model
  saw it and that another VPN server or a backup provider helps. Gemini's
  "location is not supported" no longer comes up as raw text.

### Added

- **The key check is in the Logs**: which provider was asked, what it answered
  and its own words, with the key taken out.
- **Z.ai says when what you pasted is not an API key.** Z.ai answers "token
  expired or incorrect" to a value it does not take for a key at all, such as
  another value copied from its page, and the plugin could only say the key was
  refused. The line under the key, the Logs and the notice of a translation now
  say so, and say to copy the whole Standard API Key from z.ai, under API Keys.
  A key Z.ai does not know is still "did not accept this key".

### Changed

- **The Logs say their times are UTC.** A line carried a time with nothing to
  say whose clock it was, and an event at 01:01 in your own time showed as
  22:01. Each line now ends its time with UTC, and the file Save .txt writes is
  named in UTC the same way.

## 0.2.2a

### Fixed

- **A name in another alphabet no longer passes for a message that was not
  translated.** A game, an app or a handle that stays as you wrote it, in Latin
  letters inside an answer in Japanese or Russian, made the plugin ask the model
  again and, for a short message, give up: "Genshin Impact или Honkai Star
  Rail?" into Japanese cost three requests and then failed with "The model
  returned the text untranslated", and "я сейчас в Discord" always cost two.
  Words that stand unchanged in your message are not counted now. For the same
  reason, a word the model leaves behind exactly as it was is no longer asked
  about again.
- **Hindi, Bengali, Urdu and Armenian keep their own full stop, and Greek its
  question mark.** "Я дома." into Hindi came out with a second full stop after
  the danda, "Как дела?" into Greek ended in ";?", and a Greek question read in
  English lost its question mark. A mark that only some alphabets have is no
  longer put into a text in another: a Japanese "。" read in English is a full
  stop.
- **A capital you typed no longer becomes a letter Georgian does not use**, and
  a Georgian message no longer makes the English answer start in lower case.
- **The English "I" no longer rewrites links.** An "i" in an address, as in
  "https://x.com/i/spaces/1abc" or "?i=42", became "I", and so did the one of
  "i.e.". It is put right in the words you wrote and nowhere else.
- **Brackets that are not an ending are left alone when your gender is set.**
  "sin(x)" in a Russian answer became "sin", and a Japanese word with its
  reading, "今日(きょう)", lost its brackets. An ending is settled only when the
  word and the ending are in the alphabet of the language you translate into.
- **A Chinese dash written as two characters is one dash.** "我想——是他" no
  longer comes out with a comma for each of them.
- **A slip of "знать" for "звать" before a name is read as the word you meant**
  in Russian: "все знали её Маша" goes out as what everyone called her, not as
  knowing someone of hers called Masha.
- **A message in a language that shares an alphabet with the one you translate
  into is not sent untranslated.** When the model labelled a translation with
  the language it was going into, the plugin took the message to be in that
  language already and sent it as you typed it: "Hola a todos" went out in
  Spanish to an English chat. Now it asks once more, and only a message given
  back exactly as you typed it goes out as typed.
- **A backup provider answers when your main one refuses the key, no longer has
  the model or has run out of credit.** Your message used to be held although
  the backup worked. What went wrong with the main provider is shown once, in
  its own words, instead of "Main provider unavailable" with every message.
- **A link at the start of a line keeps its words.** "[FAQ](link)" was taken
  for the plugin's own language label, so the words went missing, and an
  incoming message could say it was translated from "FAQ".
- **AI Learn's explanation follows a change of the language you read in.**
  After that language changed, a correction asked for again came back with its
  explanation in the old one.
- **With conversation context on, other people's messages and names reach the
  model as one line each**, and a name is cut at 64 characters. A line break in
  someone else's message could make what followed read like the plugin's own
  instructions.
- **A key quoted back by a provider never reaches the logs or an error
  message**, whatever its shape, and a masked key reads "***" rather than a
  number in front of it.
- **The speed measured for each provider is used for providers added on the
  settings page too**, so a slow backup no longer takes a message from a main
  provider that was about to answer it.

## 0.2.1a

### Added

- **A browser copy can say whether it is the newest.** Check for updates, at the
  foot of the settings, is there in the userscript too. Your userscript manager
  still updates it by itself, on its own schedule; the button asks at once, and
  when there is something newer it opens the new script in the manager, which
  offers to install it. Nothing is asked by itself: the plugin looks only when
  the button is pressed, so the manager has no new address to ask about at a
  moment nobody chose.
- **"Authors" and "Settings", at the top of the plugin's window, are in the
  plugin's language.** Vencord writes both in English for every plugin and has
  no way to translate them, so the plugin changes the two words after they are
  drawn, and only in its own window.

### Changed

- **The generic provider is "Any OpenAI-compatible"**, without "API", in all
  sixteen languages. Its key is headed "API key — any OpenAI-compatible" rather
  than repeating the name of the option, and an error message calls it
  "OpenAI-compatible", which reads in a sentence where a label that starts with
  "Any" did not.
- **Logs has a name in every language**: on the button, on the window it opens,
  and in the error that sends you there.
- **The one backup has no minus.** It is switched off by choosing None, as it
  always could be, whereas the minus took the whole block away and with it the
  place to ask for a backup. From a second backup on, the minus is there.

### Fixed

- **A hyphen inside a word is the one on your keyboard.** Some models wrote
  "какая-то" with a hyphen that looks the same and is another character, so
  searching a chat for "какая-то" missed it, and AI Learn took it for a
  correction of a word that was already right. A dash you typed yourself,
  long or short, stays as you typed it.
- **A letter from the other alphabet inside a word is put right.** A Russian
  word with one Latin letter that looks the same, or the other way round, is
  not found by searching for it. A Latin name with a Russian ending, as in
  "в Discordе", stays as it is.
- **AI Learn marks the right words in Turkish.** In a correction with "İ" in
  it, as in "İstanbul", every mark after it moved one word along and the last
  one read "undefined", and a capital İ alone showed as a correction.
- **AI Learn no longer takes typography for a correction.** A model giving
  back "i’ll" for your "i'll", or "мʼята" for your "м'ята", has given back the
  same word, and nothing is shown for it.
- **A short question between two sentences keeps its own case** in Russian,
  Ukrainian and Belarusian: "Who's depicted there? Some kind of queen?" comes
  out as "Какая-то королева?", not in the case a verb beside it would give.
- **What you wrote, under a sent message, kept every backslash.** Discord drops
  a backslash in front of a mark, or of a letter outside A to Z, so
  `\WoW\, todavía es temprano` was shown as `\WoW, todavía es temprano`, the
  closing backslash gone, though it had been sent right. Both are shown now, and
  so are the marks after them: an escaped star is not drawn as italics.

## 0.2.0a

### Added

- **AI Learn.** When you write in the language you translate into, the message
  goes out as you typed it and a native speaker's version appears underneath,
  with the words that changed marked and one line saying what was wrong. Only
  you see it. It is off until you switch it on in the settings.
- **The last fifty corrections are kept**, under a Corrections button beside
  the switch, so the mistake you keep making is visible over days rather than
  until the next restart.
- **AI Learn on demand**, from the right-click menu of your own messages: for
  one that went by, one too short to catch, or simply again.
- **Up to five providers**, in order. Each has its own key, its own model and
  its own rate limits, so the same provider may stand twice with two accounts
  and the two know nothing about each other. The backups are added and removed
  with the plus and minus under the model.
- **A button beside a key that shows it**, for checking what was pasted.

### Changed

- **A key is judged by the provider, not guessed at.** The red line appears
  only when the provider has refused that key, and only once the field has
  been left. Nothing is said about an empty key, and nothing about a timeout,
  a rate limit or an outage, because none of those is the key's fault.
- **The model list is fetched when the key is finished** rather than while it
  is being typed, so a key costs one request however it arrives.
- **The thinking level is gone.** It is low for everyone now, which was the
  recommended value and the right one for translation.
- **AI Explain is off by default.** It puts an item in the right-click menu of
  every message, which is a thing to choose rather than to arrive with.
- Two error messages no longer suggest lowering the thinking level, which can
  no longer be done: they say to split the text, or to shorten the message.

### Fixed

- **A long message cost two requests.** The room left for the answer was
  measured without the reasoning, which on a long message is most of it, so
  the answer was cut off and had to be asked for again.
- **A correction rewrote how people type.** Raising "i" to "I" or putting the
  apostrophe into "im" is not a correction, and a message typed in lower case
  is not a message with a mistake in it.
- The build robot stayed silent when it stopped building. It opens one issue
  when an outage starts and closes it when the build comes back.
