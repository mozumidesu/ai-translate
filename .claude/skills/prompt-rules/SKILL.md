---
name: prompt-rules
description: How AI Translate's prompt rules are written, gated, pinned and measured, and what the request types are. Load before adding, changing, removing or measuring a rule in core/translate.ts, or before touching test/corpus or test/quality.mjs.
---

The full text behind the Prompt rules section of CLAUDE.md, moved here so it is read when a rule is being worked on rather than with every message.

## Prompt rules

Each rule is a constant in `core/translate.ts`, written as full English prose,
with
one comment line above it saying what went wrong without it. Each is pinned by
a check in `test/prompts.mjs` named after that same failure. Those two anchors
cannot drift from the code, so there is no third prose copy of them anywhere —
do not create one.

When changing a rule:

- Run `node test/prompts.mjs`. A rule that loses its wording fails its check by
  name; that is the system working, not a problem to route around. Update the
  pinned phrase only when the rule genuinely changed.
- **Examples inside rules must be ordinary, everyday situations.** They travel
  to the provider with every message and they sit in a public repository, so
  nothing personal, nothing crude, nothing that points at the author. Grammar
  demonstrates just as well on a mundane sentence.
- **Where a rule has to overcome a real ambiguity, name the fault rather than
  the answer.** A rule saying Japanese "ごはんを食べました" is "I ate rice", never
  "I ate" was obeyed into English and ignored into Russian. 「ごはん」 means both
  the rice and the meal, so the model had a defensible reading of its own to
  hold on to, and a finished English answer was not enough to move it; naming
  the fault, in whatever language is being written, was, though not every
  time: 3 runs out of 3 into English, 5 out of 10 into Russian, and two other
  wordings tried for Russian did no better. Seventeen of the forty rules hand
  over an English answer in the same way, and eight of them were then measured
  the other way round, `--group=reverse`: all eight held, 3 runs out of 3. So
  this is not a fault the whole rule set has. It appears where the rule is
  arguing against a reading the model can justify, not merely against a habit.
- Rules that apply to one language, or to something a message may not contain,
  are only sent when they can matter — see the gating in `core/translate.ts`. A
  rule
  added unconditionally costs every user tokens on every message.
- What the chat is called, and what it draws itself, is not a rule but a fact
  about the chat, and the host gives it: the app's name in the three opening
  sentences, and in the rule that keeps things as typed, the ids, spoilers and
  line markdown of the host's dialect (`core/dialect.ts`). The wording of the
  rule stays in `core/translate.ts`; the dialect supplies only the chat's own
  syntax, as a model will meet it. A host that says nothing is Discord, and
  Discord's prompts stay byte for byte what they were: `test/prompts.mjs` pins
  the three sentences and the whole of that rule. A chat with no markdown is
  not told to guard any, which would cost it tokens on every message.
- Everything that varies per message goes after the "Answer format" line, under
  "For this message in particular:". Everything above it must be identical from
  message to message, which a check enforces, because providers only cache a
  prompt prefix while it stays byte-identical.

Outgoing and incoming use separate prompts: outgoing must preserve the writer's
voice, incoming only has to be understood. A third request type, AI Explain,
names the language and explains what was meant. A fourth, AI Learn, asks how a
native speaker would have written what the person wrote themselves; it is a
tenth the size of the others, because none of the rules about carrying a
writer's voice through a translation apply when nothing is being translated.

AI Learn's answer has two parts: the corrected message, and one last line
beginning `why:` that says what was wrong. That line is written in the
language the person **reads**, not the one they are learning, because a
learner who could follow the explanation in it would not have made the
mistake. It is only ever read off the last line, since the message itself can
run to several, and there is no such line when nothing changed.

A correction nobody asked for stays silent when the message was already
right: unasked, only a mistake is worth interrupting for. Asked for by hand,
from the right-click menu, it always answers, "nothing to correct here"
included. That is what tells "there was nothing wrong" apart from "it never
ran", which otherwise look identical.
