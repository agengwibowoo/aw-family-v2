# Newborn Prep

One household's preparation for a child, and the inventory that preparation turns into. It
covers what the household needs to buy, where the birth will happen and what to bring, and
the physical objects that end up in the house. Two people use it: one needs to know what to
do today, the other does the research and the money.

The catalog never stops growing — it follows the child from newborn to school, and later
covers siblings. Nothing here is scoped to a single pregnancy.

## Language

### The household

**Household**:
The people and possessions the app is about. Everything is owned by the household, not by a
child — a bottle outlives the child it was bought for.
_Avoid_: family, tenant, account, workspace

**Due date**:
An estimate of when the birth will happen. Always spoken of as approximate — "about 61 days
to go", never "61 days".
_Avoid_: delivery date, EDD, birth date

**Birth date**:
The day the child was actually born. Unknown until it happens; once set, it replaces the due
date as the origin of every age calculation.
_Avoid_: DOB, delivery date

### Buying

**Thing**:
A need the household has to meet — "Bottles", "Newborn nappies". A thing is not an object;
it is the reason objects get acquired.
_Avoid_: item, entity, product, SKU, record, entry

**Candidate**:
A specific product being considered to meet a thing — "Pigeon Wide Neck PPSU 240ml". A thing
may have several; exactly one can be picked.
_Avoid_: option, choice, alternative

**Purchase**:
A record of money spent acquiring one or more units. A receipt, and nothing more — it is not
what makes the count.
_Avoid_: owned, order, transaction, acquisition

**Unit**:
One physical object in the household. Units carry their own history, can arrive without a
purchase (a gift, a hand-me-down), and can outlive the child they were bought for. The count
of a thing is the count of its unretired units.
_Avoid_: instance, copy, asset, inventory item

**Age band**:
A window of the child's life, expressed in months from birth — negative before it. Bands are
ordered, non-overlapping, and cover all of time. What a thing is for, not when to buy it.
_Avoid_: phase, stage, period, timeframe

**Archived**:
A thing the household will never need again — outgrown, superseded, or not needed after all.
It leaves the counts and the lists but keeps its history. Archiving is not deletion, and it
is not a destructive act.
_Avoid_: deleted, disabled, hidden, inactive

**Registry**:
The things family could give. Read-only for the people who see it, and never priced.
_Avoid_: wishlist, gift list, wedding list

### The four status words

These are the only words used for where a thing stands. They are words, never colours, and
they carry the same visual weight as each other.

**Still need this**: fewer units than needed.
**Got it**: exactly as many as needed.
**More than enough**: more units than needed. Good news, and it must read that way.
**Ruled out**: decided against. Kept, never deleted.

### Where the birth happens

**Hospital**:
A candidate place to give birth. Compared on how long it takes to reach in traffic, whether
it can care for a sick newborn, what insurance will pay, and what it costs. Exactly one can
be picked.
_Avoid_: clinic, provider, facility, venue

**Removed**:
A place that should never have been on the list — a duplicate, a typo. Not the same as
**Ruled out**, and the two must never be offered as one control: ruling a place out is a
decision worth reading back six weeks later, removing one is tidying up a mistake. A removed
place leaves every screen that counts, compares or ranks, keeps its prices, its insurer
checks and its papers, and can be put back. The picked place cannot be removed — the papers
list follows it, and losing that link would re-score the list in silence.
_Avoid_: delete, archive, trash, hide

**Quote**:
A hospital's price for one delivery type and one room class, as told to us on a given day.
Quotes go stale — past sixty days the app says so in words.
_Avoid_: package, plan, tier, rate

**Papers**:
The documents a hospital requires on admission. Whether the household has each one, and how
many photocopies, is tracked once for the household — you either have your Kartu Keluarga or
you don't — and each hospital's requirements point at it.
_Avoid_: documents pack, paperwork, files, attachments

**Scan**:
A photograph of a paper, taken by the household. The only images in the app are ones someone
here took.
_Avoid_: upload, attachment, image, file

**Insurance sentence**:
The plain-English statement of whether this delivery is covered, worked out from the policy's
start date and its waiting period. It is stated as a sentence, never as two dates the reader
has to do arithmetic on. The single most consequential fact in the hospital decision.
_Avoid_: coverage status, eligibility, benefit check

### Dates

**Appointment**:
Something happening at a fixed time on a fixed day — a check-up, a scan, a class.
_Avoid_: event, booking, visit

**Window**:
A period during which something should happen, with no single right day inside it —
immunisations work this way. A window must never be shaped like an appointment.
_Avoid_: range, deadline, due window

**Taken off**:
A date that is not happening — the clinic rang, the class was called off, the row was typed
twice. It leaves every screen that lists or counts, keeps its cost, its prep notes and any
photos and notes on it, and can be put back. Not deletion, and not the same as **Been and
done**, which means it happened. The same idea as **Removed** is for a place.
_Avoid_: delete, cancel, remove, trash, archive

**Pack**:
A named list of things and papers assembled for one trip — the hospital bag, a day out. A
pack knows whether the things on it are actually available.
_Avoid_: bag, kit, checklist, bundle
