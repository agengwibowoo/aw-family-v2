# Removing a place is not ruling it out

Ruling a hospital out is a decision. It keeps its reason, it stays on a screen of its own, and
the database refuses to let it go without one. That is right, and it does not change.

But a duplicate typed twice, or a name misspelled, was never a decision. Filing it under
"Ruled out" would record a data-entry slip as a considered judgement and leave it sitting on
that screen forever pretending to be one. So there are two words, with two meanings, and they
are never offered as one control: **Ruled out** for a place we said no to, **Removed** for a
place that should not be on the list at all.

Removing is soft — a `removed_at` and a `removed_by` on the row, not a `delete`. Two reasons.
The first is that the app's only safety mechanism is the fifteen-minute Undo card; there are
no "are you sure" dialogs anywhere, which is what lets ordinary actions stay ordinary. A hard
delete cannot be undone, so it would have to grow a confirm dialog, and one confirm dialog is
how an app gets its second. The second is the cascades: `hospital_quotes`,
`hospital_insurers` and `hospital_documents` all cascade from `hospitals`, so a real delete
would take weeks of phone calls about prices and insurers with it. Nothing underneath is
touched, which is what makes putting a place back cost nothing.

The picked place is exempt, and Postgres enforces it rather than the service alone:

```sql
check (removed_at is null or decision <> 'picked')
```

`packs.hospital_id` is `on delete set null`, and `notePickedHospitalForPapers` uses that column
to remember which place the papers list was last scored against — which is the whole mechanism
behind "RS Pondok also wants a referral letter" instead of a silent re-score. Removing the
picked place would null it and re-score the list with nothing to compare against. Per ADR-0002,
an invariant that cheap in Postgres belongs in Postgres, where it holds against a hand-written
statement too. Pick somewhere else first.

The design handoff has no Removed screen. Until it does, `/hospitals/removed` takes its values
verbatim from `/hospitals/ruled-out` and invents nothing — ADR-0006 still stands.
