# Phases split into age bands, packs and priority

The legacy `phases` table held seven rows doing four unrelated jobs: four were age bands
(Pre-birth, 0–3 months, 3–6 months, 6+ months), one was a packing list (Hospital bag), one
overlapped a band it sat beside (Post-birth is inside 0–3 months), and one was a deferral
bucket named `Optional` that collided with the existing `Optional` priority.

The spec's instruction to "make phases age-relative" cannot be carried out on that table —
a packing list has no `age_from_months`. So the concept splits: `age_bands` become purely
age-relative, ordered, non-overlapping and covering all of time; the hospital bag becomes a
**pack**; and the deferral bucket folds into the priority that already existed.

## Consequences

Packs are pulled forward out of the post-birth track, because week 36 needs a hospital bag and
the papers screen already merges documents and objects into one list.

New bands are inserts, not migrations — which is what lookups-as-tables was always for.

Legacy rows in the `Optional` phase cannot be mapped mechanically without losing their real
priority. The import flags them for review rather than guessing.
