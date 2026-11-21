# Changelog

What changed in each version, in the words a person would use. The build robot
takes the section whose heading matches the version being released and puts it
in the release on GitHub; with no section it falls back to the subjects of the
commits, which is what the releases before this file have. What is on `main`
and not yet released waits under Unreleased, which takes the version's name
when `release` moves.

## Unreleased

### Fixed

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

### Added

- **The key check is in the Logs**: which provider was asked, what it answered
  and its own words, with the key taken out.

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
