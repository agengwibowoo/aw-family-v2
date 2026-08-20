# A date that is not happening is taken off, not deleted

ADR-0008 already made this argument about places. It applies unchanged to dates, and this
records that it now holds everywhere: **there is no hard delete left in the app.**

`deleteEvent` was a real `db.delete` on `schedule_events`. It was the last one, and it was
wrong for the reasons ADR-0008 sets out. The fifteen-minute Undo card is the only safety
mechanism there is, which is what lets ordinary actions stay ordinary and keeps every
"are you sure" dialog out of the app. A hard delete cannot be undone, so it would have had
to grow one. And a date carries the scan photos and what the doctor said — the two things
anybody ever goes back for — so a real delete would take them with it.

So "This is not happening" sets `status = 'cancelled'` and leaves an Undo card, exactly as
taking a place off the list does. `/dates/off` is the path that does not expire.

No migration. `cancelled` was already legal in `schedule_events_status_check`, having been
in the spec's status list from the start, so this needed no schema change and nothing
applied by hand in the Supabase dashboard.

Three buckets on the dates screen rather than two, because a date that is not happening
belongs in neither of the first ones. It is not coming up, and filing it under "Been and
done" would say it happened. `datesScreen` returns `coming`, `past` and `off`, and
`withPhotos` counts only the past — a date that did not happen has nothing to show from it.

There is no second word here, deliberately. Places need two — **Ruled out** for a decision,
**Removed** for a typo — because ruling a place out is a judgement worth reading back six
weeks later. A date has no such judgement in it: the clinic ringing to cancel and the row
being typed twice both end with the same sentence, "this is not happening", and inventing a
second control would be a distinction the household does not have.

The design handoff has no screen for any of this. Until it does, `/dates/off` takes its
values verbatim from `/hospitals/removed` and invents nothing — ADR-0006 still stands.
