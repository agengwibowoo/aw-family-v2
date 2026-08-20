# Taken off is not a status

Supersedes the mechanism in ADR-0009. Its conclusions about words all stand.

ADR-0009 made "this is not happening" a status: `status = 'cancelled'`. That was cheap —
the value was already legal in the check constraint, so it needed no migration — and it was
wrong, because it folded two independent facts into one column. Whether a date is on the
list and whether it happened are not the same question, and a single column can only answer
one of them.

The cost showed up as a gate. Taking a date off overwrote `done`, and `putEventBack` had
nothing to restore to, so it wrote `planned`. A date with three scan photos and what the
doctor said would come back reading "Nothing booked yet". Rather than lose that, 0009 hid
the control on any date marked done — which left the household with no way at all to take a
duplicate off the list once it had been marked done.

So taking off moves to `taken_off_at` / `taken_off_by`, exactly as places already do
(ADR-0008), and `status` is left alone throughout. Putting a date back nulls two columns
and touches nothing else, so a date that had been and gone comes back still saying so.
`cancelled` leaves the check constraint entirely: a status nothing reads any more is a trap,
because such a row would silently reappear under "Coming up". Migration 0004 backfills the
existing rows before the constraint comes back, and is generated, not applied.

There is still no second word, and 0009's argument for that is the reason the control is
reworded rather than doubled. The clinic ringing, the row being typed twice, and a date that
happened and was written down twice all end with the same sentence — the date should not be
on the list — so every date, done or not, gets one control reading **Take it off the list**.
The copy that said "this is not happening" is gone from the button, the Undo card and the
detail screen: it was a claim about what happened, and taking off no longer makes one.

The card is the last thing on a date's own screen, not on the edit screen where the control
first lived. A date marked done reached edit only through "Add a photo" and "Add a note", so
the sole route to taking one off the list was a button promising to add something. An action
nobody can find is the same as one that is not there. Places have always put it on the
detail screen; dates now match. (Those two buttons have since been made honest — "Add a
photo" opens the camera without leaving, and the secondary says "Change it" — which changes
nothing here: the card stays on the date's own screen.)

No partial index, unlike `hospitals_live_idx`. `listEvents` has no `WHERE` — it reads every
row and buckets them in TypeScript — so there is nothing for an index to help.
