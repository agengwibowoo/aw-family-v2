# A snapshot and an outbox, instead of a sync engine

Reading has to work with no signal and writes have to be accepted and queued — the papers
screen is used in a hospital car park at 3am, and a purchase gets recorded one-handed while
holding a baby. That is normally an argument for a local-first sync engine.

It isn't here. The whole household is a few hundred rows. So one endpoint returns it as a
single JSON document, a service worker caches that document and re-renders from it, and writes
go into an IndexedDB outbox that replays on reconnect. No sync engine, no lock-in, no
unfamiliar runtime with sixty days on the clock.

## Consequences

Offline is scoped deliberately: the daily screens and the papers pack work without signal;
compare, money and the admin screens require it and say so in words. A screen that silently
half-works offline is worse than one that states its terms.

This does not generalise. If the catalog ever outgrows a single JSON document, this decision
is the thing to revisit — not the thing to work around.
