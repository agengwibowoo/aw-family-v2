# The design handoff is authoritative for user-visible language

Two documents in this repo disagree. `docs/newborn-prep-v2-spec.md` Part IV §A.4 maps the
schema word `item` to the user-visible word "Item", and its user stories still carry
Indonesian chrome — `Nanti`, `Saring`, `(tanpa nama)` — left over from a revision written
before the English-only decision. The design handoff bans "Item" outright and fixes chrome as
English with data left bilingual.

The handoff wins. It is later, it is hi-fi, and its copy is final. Spec §A.4 is superseded and
its Indonesian chrome is struck.

## Consequences

The ban list — Item, Entity, Record, Entry, Category, Filter, Query, Attribute, Phase,
Complete, Quantity, Status, Deficit, Surplus — becomes a lint rule over user-visible strings,
not a style guide people are asked to remember.

The words carry the whole burden that translation would otherwise have carried, so this is not
a cosmetic decision and copy is not a thing to improvise during implementation. `CONTEXT.md`
holds the canonical terms.
