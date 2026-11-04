# Changelog

What changed in each version, in the words a person would use. The build robot
takes the section whose heading matches the version being released and puts it
in the release on GitHub; with no section it falls back to the subjects of the
commits, which is what the releases before this file have.

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
