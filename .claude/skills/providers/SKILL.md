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

A red line under a key appears only when the provider has refused that key,
401 or 403, and only once the field has been left. Nothing is said about an
empty one, and nothing is said about a timeout, a rate limit or an outage,
because none of those is the key's fault. That check is the same request the
model list needs, so it costs one request, not two.

Settings from before the list are still read: `provider`, `fallbackProvider`
and the per-provider keys answer whenever no list has been written yet. That
is what a copy that has never opened the page uses, and it is what the
standalone `web/` build and every test hand over, so none of them had to change.
