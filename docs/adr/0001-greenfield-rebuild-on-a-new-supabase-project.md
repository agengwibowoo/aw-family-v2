# Greenfield rebuild on a new Supabase project

The previous app works but is a faithful translation of a procurement spreadsheet, and the
schema decisions that would make it survive a growing catalog — counts derived from physical
units, inventory scoped to the household rather than to one child, age-relative bands — are
all migrations "with teeth" against live data. Rebuilding on a new Supabase project makes
every one of them free at table-creation time, which is the only moment they are free.

The old app stays live and frozen, bugfixes only, until a single cutover at parity. Nobody
runs two apps.

## Consequences

The legacy data is imported once, by script, at cutover — not synced. Anything written to the
old app after the dry run has to be re-imported, so the freeze is a real constraint and not a
courtesy.
