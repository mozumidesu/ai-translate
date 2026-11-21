---
name: providers
description: How AI Translate's provider slots work: order, per-slot keys and models, rate limits counted by slot, when a key is called refused, and settings from before the list. Load before touching core/slots.ts, core/providers.ts, ui/Providers.tsx or ui/ModelPicker.tsx.
---

The full text behind the Providers section of CLAUDE.md.

## Providers

One slot is asked and the rest stand behind it, in their order. A slot is a
provider, a key, a model and an address, and the key and model are kept per
provider **inside the slot**, so switching a slot from one provider to another
and back loses neither. The same provider may stand in two slots: two keys
from two accounts are two quotas, which is why the rate limits are counted by
the slot rather than by the provider's name. Counting them by name would call
the second account spent along with the first.

A key is cleaned of every space and invisible character, `\s` and `\p{Cf}`,
when it is saved, so the field shows it clean, and again where it is read, so a
key saved before the cleaning is clean too: no provider's key holds either, and
a paste once brought a no-break space along that Groq refused. An
OpenAI-compatible address is only trimmed at its ends.

A red line under a key appears only when the provider said the key is wrong,
and only once the field has been left. `keyVerdict` in `core/providers.ts`
decides, one rule for the Vencord page, `web/` and the Telegram panel: a 401 is
a bad key by its status, a 400 or a 403 only when the answer says so (Gemini
answers a wrong key with 400 API_KEY_INVALID). A 403 is just as often a network
or a country turned away: Groq's bare "Forbidden" or the "Access denied" page in
front of it, OpenAI's unsupported_country_region_territory, Gemini's 400 "User
location is not supported". Those are "blocked", which gets its own line under
the key and its own hint under the model list, not in red. Nothing is said about
an empty key, a timeout, a rate limit or an outage, because none of those is the
key's fault. `test/keys.mjs` holds each provider's real answer to a wrong key.

The check is the same request the model list needs, so it costs one request, not
two, and `checkKey` in `core/slots.ts` writes it to the log: the provider, the
status and its answer, with the key taken out.

Settings from before the list are still read: `provider`, `fallbackProvider`
and the per-provider keys answer whenever no list has been written yet. That
is what a copy that has never opened the page uses, and it is what the
standalone `web/` build and every test hand over, so none of them had to change.
