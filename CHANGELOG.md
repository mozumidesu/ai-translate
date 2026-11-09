# Changelog

What changed in each version, in the words a person would use. The build robot
takes the section whose heading matches the version being released and puts it
in the release on GitHub; with no section it falls back to the subjects of the
commits, which is what the releases before this file have. What is on `main`
and not yet released waits under Unreleased, which takes the version's name
when `release` moves.

## Unreleased

### Fixed

- **A slip of "знать" for "звать" before a name is read as the word you meant**
  in Russian: "все знали её Маша" goes out as what everyone called her, not as
  knowing someone of hers called Masha.

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
