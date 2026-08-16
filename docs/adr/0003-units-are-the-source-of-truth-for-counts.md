# Units are the source of truth for counts

How many of a thing the household has is `count(units where retired_on is null)`, not the sum
of what was purchased. A purchase of six spawns six unit rows in the same transaction, and
deleting that purchase retires those units rather than deleting them.

Nothing before the birth needs this — units are created and then sit still, and every screen
shows a count. It is built now because the alternative is a migration against a year of live
purchase history later, and because units are what make gifts and hand-me-downs expressible:
a unit can exist with no purchase behind it, which the count-from-purchases model cannot say
at all.

## Consequences

A bug in unit spawning corrupts the count on the most-used screen in the app, so the import
check that every thing's count matches the legacy value exactly is not optional.

Nobody ever identifies a unit. Units are assigned by the system; what a person sees and taps
is a number.
