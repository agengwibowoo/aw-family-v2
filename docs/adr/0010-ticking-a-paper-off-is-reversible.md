# Ticking a paper off is reversible, and a paper says where it is

Two changes to the papers screen, recorded together because they land in the same row and
the second is the reason the first needed a new shape.

## The tick was a one-way door

"We have it" lived only on the card for a missing paper. The moment a paper became ready it
moved to the Ready section, which rendered a name, a count and a `Got it` chip and no control
at all. So a mis-tap could not be taken back from the screen — the only paper the app would
let you un-tick was one that was still short of copies, which is the one case where the
mistake does not matter.

That made ticking a paper the last action in the app with no way back. ADR-0008 and ADR-0009
both turn on the same sentence: the fifteen-minute Undo card is the only safety mechanism
there is, which is what lets ordinary actions stay ordinary and keeps every "are you sure"
dialog out. An action with no card and no second path is not covered by that argument; it
just has no safety at all.

So there are two ways back now, the same two that places and dates have. Ticking a paper
leaves an Undo card naming it, for fifteen minutes, surviving navigation. And the paper's own
row in Ready carries "Haven't got it" for as long as the row exists — the path that does not
expire. Un-ticking leaves no card, deliberately: un-ticking *is* the way back, and a card
offering to undo the undo is a loop, not a safety net.

No new column. `document_status.have_original` was already a boolean anyone could write in
either direction; the gap was entirely in what the screen offered.

## A paper now says where it is kept

`document_status` could say we have the Kartu Keluarga and how many copies exist, but not
which drawer it is in. At 3am that is half an answer, and the half that is missing is the one
that gets you out of the house. So `where_kept` — free text, one line, household-level like
everything else on that table.

Free text rather than a managed list of places. The value is data, not chrome: `Laci lemari
kamar` and `Map biru, tas rumah sakit` stay in whatever language they were typed in, and a
list would need maintaining before it could hold the one-off that actually matters.

Blank is spelled out here rather than hidden. Every other free-text field in the app makes
its section disappear when empty, but for a paper we *have*, not knowing where it is, is
precisely the fact worth surfacing — so a ready paper reads `Kept · not filled in` rather
than saying nothing.

## This is the first invented string

ADR-0008 and ADR-0009 both close the same way: the handoff has no screen for this, so take
the values verbatim from the nearest existing screen and invent nothing. Here there is
nothing to take. The handoff has no where-it's-kept field anywhere, and the spec's
`document_status` has no such column either. The only trace in the whole design source is one
free-text meta line on the Buku KIA row of the all-ready hi-fi screen — `Original in the bag`
— which is evidence for how the value should *read* (a short fragment in the row's meta line,
not a `Location:` key-value row) but is not a label.

So this is the first string the implementation has invented rather than quoted, and it is
recorded as such. ADR-0006 still governs it: the canonical wording lives in `CONTEXT.md` as
**Where it's kept**, with its own `_Avoid_` line, so the handoff can overrule it later
without anyone having to go looking through components for where the words came from.

## Why Ready became a disclosure

The handoff's rule for S5 is that only the missing things go above the fold — "the ones that
are done are proof, not work". A ready paper now has two things it still needs to offer, and
putting a text box and a control on every finished row would turn the receipt back into a
to-do list, which is the one thing that section is not allowed to be.

A plain `details`/`summary` keeps the closed row as the three-line receipt it always was and
puts both controls one tap inside it. It is not a new pattern — the hospital detail screen
already collapses its quieter groups exactly this way — and it costs no JavaScript, so the
screen still works with no signal (ADR-0005).
