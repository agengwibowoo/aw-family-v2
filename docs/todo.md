# Everything left to do

**16 August 2026 · about 59 days to go.**

Read this top to bottom once. After that, work Part 0 first — most of the build is blocked
behind three of those items.

Deadlines that cannot move: a hospital picked by **~7 Sep**, the papers pack complete by
**~20 Sep** (week 36), no risky changes after **30 Sep**, due date **14 Oct**.

---

## Where things stand

**Built and working**

| | |
|---|---|
| Schema | 23 tables live in Supabase, with the invariants in Postgres. Migration 0001 applied |
| Reference data | 7 age bands, 9 categories, 3 priorities, 9 papers, 14 materials |
| Design system | Tokens in `globals.css`, all 16 components plus Select, Stepper, Sheet and the verdict card; `/gallery` renders them |
| Domain logic | age, dates, insurance, money, status, search, the antenatal pattern, Today's ranking — with tests |
| Auth | Google sign-in, approval gate, middleware, S14 with all three states |
| S1 | Today — the ranked cards, the appointment as a fact, `Later`, the derived empty sentence |
| S2 · S3 · S4 | Where to give birth; one hospital; compare, with the ranked insurance card |
| S5 | Papers, including the no-hospital state and the hospital-changed banner |
| S6 · S7 | Dates and one date, all three variants, plus the antenatal pattern in one tap |
| S8 · S9 · S10 | The list, one thing, add or change. Search with synonym substitution |
| S11 | Add what we got, with Undo in the confirmation card |
| S12 · S13 | Money and the registry. Money is the fourth tab; `who` picks the landing tab |
| S15 | `/who` — approve, block, ask again, let back in |
| Services | things, purchases and units, schedule, money, scans, links, materials |
| Scans | The service and the upload path. Needs the bucket (0.4) before photos appear |

Verified with `pnpm lint && typecheck && test && build`, plus `pnpm test:db` — 166 tests
against the cloud database — and `db:check` / `db:invariants`.

`pnpm demo:seed` puts eleven made-up things and two dates in so the screens can be looked
at; `pnpm demo:clear` takes them away. Everything it writes is named `Demo · …`.

**Not started**

Offline · the PWA · the app icon · `/api/mcp` · the legacy import · the week-36 hospital
bag · the IDAI generator · everything in Part 6.

---

## Part 0 — Only you can do these

Nothing here can be done by an agent. Three of them block everything else.

### 0.1 Put the household row in — **blocks Today, the list, every date, the insurance sentence**

Open `supabase/seed-household.sql`, change the due date if `2026-10-14` is wrong, paste it into
the Supabase SQL editor and run it. Today currently says *"Run supabase/seed-household.sql and
this screen fills in"* because it hasn't been run.

### 0.2 Turn on Google sign-in — **blocks every screen behind the gate**

Supabase → Authentication → Sign In / Providers → Google. Needs a Google OAuth client with the
Supabase callback URL as an authorised redirect URI. Then URL Configuration → Site URL →
`http://localhost:3000`. `docs/setup.md` §4 has the click path.

### 0.3 Let yourself in — **blocks everything, and nobody else can do it**

Nobody is an admin yet, so nobody can approve the first person. Sign in once, then in the SQL
editor:

```sql
update app_users set status = 'approved', is_admin = true
where email = 'agengwibowo2@gmail.com';
```

### 0.4 Create the `media` bucket — blocks scans, ultrasound photos, receipts, link thumbnails

Storage → New bucket → name `media` → **public off**. Private is not optional: this bucket holds
KTP, Kartu Keluarga, the marriage book and insurance cards. See ADR-0007.

### 0.5 Apply the storage policies

`supabase/storage-policies.sql` is written and waiting. Paste it into the SQL editor after
the bucket exists. It refuses to run if the bucket is missing or public, so it doubles as
the check on 0.4.

### 0.6 Apply every future migration by hand

Standing rule from `CLAUDE.md`. I edit `src/server/schema.ts`, run `pnpm db:generate`, and tell
you which numbered file in `supabase/migrations/` to paste in. I never apply one.

### 0.7 Gather the real data — this is most of your remaining calendar time

No amount of code substitutes for this, and the 7 Sep deadline is really this list's deadline:

- The hospital shortlist — name and address per place, then the ~30 fields
- Ring or DM each place for package prices by delivery type × room class, plus the deposit
- Your insurance policy: start date, waiting period, limits split normal vs caesar, room
  entitlement, whether the baby is covered from birth
- Photograph each paper and count the photocopies actually made

### 0.8 Legacy read-only credentials

Fill `LEGACY_DATABASE_URL`, `LEGACY_SUPABASE_URL`, `LEGACY_SUPABASE_SECRET_KEY` in `.env.local`
before the cutover import. Read-only credentials, please.

### 0.9 Freeze the old app

ADR-0001 makes this a real constraint, not a courtesy: anything written to the old app after the
dry run has to be re-imported. Pick a date and stop writing to it.

### 0.10 Deploy

Vercel project, environment variables, domain. Then go back to Supabase → URL Configuration and
change Site URL to the production host, and add the production redirect URI to the Google OAuth
client. Forgetting the second half is the classic way to break sign-in on launch day.

### 0.11 Check the IDAI immunisation schedule against a live source

When I build the generator, verify the current schedule yourself. A hardcoded list written today
may be wrong by the time it fires, and this is the one place in the app where being wrong is a
medical matter rather than a cosmetic one. The spec makes this an explicit accuracy requirement.

### 0.12 Test S11 one-handed on a real phone

The three-second claim is untested. The handoff names it as the most likely thing in the whole
document to be wrong. Nobody can do this from a laptop.

### 0.13 Set the birth date the day it happens

```sql
update children set birth_date = date '2026-10-XX';
```

Everything age-relative switches origin from the due date to that, and the immunisation schedule
generates off it.

---

## Part 1 — Wave 1, deadline-critical

Everything here should be done before ~7 Sep. It is what the two fixed dates need.

### 1.1 Today's action cards

The screen exists; it has no cards. Build the deterministic ranking — essential things unbought
in a band whose deadline is within 30 days, then essential in the current band, then recommended
in the current band. At most three, ties broken by band order then category order, so "why is
this here?" always has an answer.

Plus: the next appointment as a card that is a *fact, not a task* (no "Later", doesn't count
against the three); the band progress card; `Later` suppressing a card for 7 days; and the
**derived** empty-state sentence — it must consult the real counts, because "the hospital bag is
done" over a 38% bar is the one thing this screen cannot say.

### 1.2 S4 — Compare

New route. The "Compare" button on the hospital detail screen currently goes nowhere.

- The ranked insurance card, full width, **above** the table — one row per place with name,
  reason and status chip. It is lifted out of the table on purpose.
- The table: horizontally scrollable, `min-width: 544px`, label column `flex: 0 0 96px`
  `position: sticky; left: 0` **as the first cell of each row**, value columns `flex: 0 0 112px`,
  rows alternating `--sf` / `--bg`, `box-sizing: border-box` everywhere.
- Ten rows, then `6 more rows` as a chip. Picked place always first. Blanks are the
  `not filled in` chip and are tappable. Rows where every place is blank are dropped.
- `slide the table sideways ›` written out as a chip — it is the app's one gesture, so it gets
  words.
- Nothing below 13px, no value below 14px.
- Bottom bar: `Pick <name>` naming the leader, plus `Rule out`.
- Desktop at 880px: four columns, no horizontal scroll, identical row order and wording.

Reuses `CompareCell`, `assessCover`, `quoteAgeNote`, `listHospitals`, `setDecision`.

### 1.3 Scans

Needs 0.4 and 0.5.

A `src/server/services/scans.ts` that issues a short-lived signed upload URL, verifies the object
exists and is within size limits, and writes the path onto `document_status.image_paths`. Reading
uses short-lived signed URLs — never long-lived ones. Wire `PhotoSlot` into the papers rows at
104×132px.

### 1.4 S6 — Dates, and S7 — One date

A `src/server/services/schedule.ts` first: list, create, update, mark done.

**S6:** `N coming up` in mono in the header. Tomorrow's event promoted out of the list into a
card with what to bring. Then `Coming up`, then a single `Been and done` row that says what is
in it, then the line about the first-year immunisation list appearing after the birth. Windows
get the two-number `WindowBlock` **and** the words "Any day between 10 and 24 Sep" — a different
shape, never a different colour. Rows say what is still needed of you ("Nothing booked yet",
"Your paediatrician decides"). Recurring events say so in a 12px line. No money toggle.

**S7:** one screen, halves swapped **by the date, never by a tab**. Before: time as the largest
thing on screen at 32–34px, who, where, travel time, a tickable `Bring` checklist that reaches
into the papers pack rather than repeating it, a `Before you go` card in plain sentences, likely
cost, `It's done` + `Change it`. After: scan photos first at 104×132px, the doctor's note as one
paragraph in her words, cost, a `Next one` row, `Add a photo` + `Add a note`. Window variant: the
period as a 23–24px sentence, "There is no single right day", an empty progress bar between the
two dates that fills as the period passes, and two endings — `Set a day` and `It's done`.

### 1.5 The antenatal pattern

Every 4 weeks to 28 weeks, every 2 weeks to 36, then weekly. Proposed as a whole series in one
tap from the due date. Don't make anyone type fifteen appointments.

### 1.6 Finish S15 — Who can get in

Waiting requests at the top (the only rows that ever need action), then the household, then
turned-off accounts with a "let back in" affordance. `members.ts` has approve, block and
ask-again; it needs unblock. The "Manage" seam is where a future limited role would go — leave
the seam, don't build the role.

### 1.7 Papers — the hospital-changed banner

When the picked hospital changes, name what changed: *"RS Pondok also wants a referral letter"*.
Never a silent re-score.

---

## Part 2 — Wave 2, the daily loop

Target: done before the 30 Sep freeze.

### 2.1 The things service

`src/server/services/things.ts` — list by band, get one, create, update, archive. Counts come
from `count(units where retired_on is null)`, not from purchases (ADR-0003).

### 2.2 Purchases and units

A purchase of six spawns six unit rows in the same transaction. Deleting a purchase **retires**
its units rather than deleting them, so history survives. Units can exist with no purchase at all
— that is how gifts and hand-me-downs get expressed, and it matters from day one because of the
registry. A bug here corrupts the count on the most-used screen in the app.

### 2.3 S8 — The list

Opens on the band you are in — about eleven rows — so it never needs a filter bar. Header names
the band as context, not as a control: `Hospital bag · wanted by 15 Sep`. Band progress card,
then the rows, then a `Show the other 106 things` ghost button leading to a jump-to list (bands,
things family could give, everything, don't-need-any-more) — never a wall of 500 rows.

Three facts per row: name, `have of need` in mono, one status word. Gift-eligibility is a phrase
in the meta line, not a badge column. Bottom bar: `Find a thing` primary, `Narrow it` opening a
sheet. Desktop at 880px: the sheet becomes a persistent left column — the one place in the app a
permanent filter surface is allowed.

### 2.4 Search

Substring match on the name, case-insensitive, **after synonym substitution**, so `bottle` finds
*Botol susu*. Minimum map: bottle→botol, nappy/diaper→popok, wipe/washcloth→waslap, pad→pembalut,
swaddle→bedong, brush→sikat, corset→korset, clothes/shirt→baju. Photos appear in search results
but not in the list. An empty query shows a jump-to list, not a blank screen. No results always
offers the way onward: add it as a new thing.

### 2.5 S9 — One thing

Count card (`4` big, `of 6`, status chip, progress bar, band and category). Then **What we have**,
then **Ones we're looking at** — titled in her words, and she is never asked to classify anything.
**One `Add` button**; the branch is a question, not a concept. Nothing on screen is called an
option, a candidate or a purchase.

Then link cards, then material chips, then notes, then the spent / remaining summary with
`see the detail` — which opens his density, a comparison table with rough prices, **in place, at
the same URL**. His view is a layer, not a second app. Ruled-out candidates stay at 55% opacity
with an outline chip; his comparison work gets quieter, never deleted.

### 2.6 S10 — Add or change a thing

Four questions above the fold: what is it, how many do we need (stepper), what sort of thing,
what age is it for, could family give this. Everything else in a dashed card marked optional. A
thing can exist with a name and a number. "Don't need any more" lives on the edit version as an
ordinary action — not destructive, not behind a confirm.

### 2.7 S11 — Add what we got · *the most important screen in the app*

Three seconds, one hand, thumb never leaving the bottom third, usually arrived at cold from a
chat link.

- `Close`, not a back arrow — there is no history.
- Identity card: count block, name, a "not this?" escape hatch.
- `How many did you get?` — 68px −/+ stepper, 30px mono count, **starting at 1**.
- `What did it cost?` labelled *you can skip this*. **Price can never block the save.**
- One 56px `Save it`.
- **Both fields are pre-answered. Land, tap Save.**
- Money hidden does not change this screen: she can enter a price she will never be shown back.
- Where it lands after saving depends on how she arrived — from a chat link → Today; from inside
  the app → back to the thing. **Both show the confirmation card with Undo.**
- Item-not-known variant: the same screen opening on a short list of things still needed.
- The one-tap sheet (`1 / 2 / 3 / more`) is an optimisation. Build the full screen first.

### 2.8 Undo — ships with 2.7, not after

15-minute window, lives **in the confirmation card** where she is already looking, restores the
previous count exactly. It survives navigation. It is not a toast. There are no confirm dialogs
anywhere in the app, so this is the only safety mechanism there is — which is why it cannot slip
to a later release than the write path it protects.

### 2.9 Links

oEmbed for title and thumbnail at save time, thumbnail cached to `media`. Tracking parameters
stripped (`utm_*`, `gclid`, `srsltid`, the Shopee tail). Link cards, not embeds — tapping opens
the native app and falls back to the browser. YouTube is the one exception where inline playback
is allowed; don't build a generic embed system for it. Same URL twice on the same target does not
duplicate. A failed preview still saves, with the raw URL as the title.

### 2.10 Materials

Prompted only for clothing, feeding, toiletries and bath — nobody will fill this in for 120
things, and it must never block a save. `commonly_irritant` shows as a plain extra chip: no icon,
no colour, no alert. Typing a new material adds it to the lookup table.

### 2.11 S12 — Money, and the fourth tab

Band roll-up with spent and still-to-come, then by category with bars, then by importance, then
links out to hospitals, registry and access. Percentages scope to the current band by default,
with an explicit way out to all-time. The bars still work with money hidden, because they measure
things rather than rupiah. Adding the tab is additive — `tab-bar.tsx` is already written for it.

### 2.12 S13 — Things family could give

Read-only for guests, behind the same gate. **No prices at all — not even behind the toggle.**
Sorted by what is still needed.

### 2.13 Landing tab by account

`who` = her | him, and it chooses the landing tab only. Nothing else differs between the two
accounts.

---

## Part 3 — The shell

### 3.1 Offline

Per ADR-0005: one endpoint returns the household as a single JSON document, a service worker
caches it and re-renders from it, and writes go into an IndexedDB outbox that replays on
reconnect. No sync engine.

Scan **bytes** are cached keyed by object path, not signed URLs — a cached URL is worthless at
3am because it has expired (ADR-0007).

Offline is scoped deliberately: Today, the list, one thing, add what we got and the papers pack
work without signal; compare, money and the admin screens require it **and say so in words**.

### 3.2 The offline copy

Today gets a `.o` header chip: `Offline · showing what we had at 1am`. The save confirmation
sub-line becomes "Saved on your phone. It'll go up when you have signal." The papers screen says
"No signal — and this screen still works. Everything here is on your phone."

### 3.3 PWA and the install prompt

Manifest, home-screen label **one word: `Newborn`**. Install sheet with the icon, "Keep this on
your home screen", "So it's one tap, and it works with no signal." Two reasons, both hers — no
mention of PWAs, installing, or apps. Shown on the **second** visit, never the first, never again
if dismissed.

### 3.4 The app icon

A ring with one arc missing — a countdown that hasn't closed. Not a baby, a pram, or a footprint.
One shape and one gap so it survives at 40pt. White ring on `--ac`; dark variant `#7fa6d4` on
`#12161c`; mono variant `--ac` on white. Produce at 180 / 120 / 76 / 40pt plus a maskable variant.
I can draw it; you decide it's right.

---

## Part 4 — Cutover

### 4.1 The import script

`scripts/import-from-legacy.ts`, reading the legacy database read-only. It has to:

- map the legacy `phases` table across three destinations — age bands, the hospital-bag **pack**,
  and priority (ADR-0004)
- **flag** legacy `Optional`-phase rows for review rather than guessing, because mapping them
  mechanically loses their real priority
- backfill units: for each purchase, create `qty` units in `ready` with the purchase date as
  `acquired_on` (ADR-0003)
- copy `brand` → `name` verbatim and flag those rows for review. Do **not** try to split them
  automatically — guessing where the brand ends produces silent errors
- copy scans into the new private bucket

### 4.2 The count check — not optional

Every thing's count must match the legacy value exactly. ADR-0003 says so in those words, because
a unit-spawning bug corrupts the number on the screen used most.

### 4.3 Dry run, then the real run

Dry run early enough to find the mapping problems. Real run after the freeze (0.9), because
anything written to the old app afterwards has to be re-imported.

### 4.4 Retire the old app

---

## Part 5 — Freeze to birth

**30 Sep — freeze.** No risky changes from here.

**~20 Sep, week 36 — the hospital bag.** Papers and objects on one screen with one readiness
sentence, seeded from the hospital-bag pack plus the picked hospital's document requirements. A
line is blocked when the required number isn't available, and it says why. `packs` and
`pack_items` already exist in the schema.

**The day it happens — the birth date (0.13).** Setting it generates the first-year immunisation
schedule as `planned` events with date **windows**, each naming its source (IDAI schedule) and
deferring to the paediatrician. Editing one marks it `manual`. Regenerating never touches an event
already done or hand-edited. A scaffold, never medical instruction. Verify the schedule first
(0.11).

---

## Part 6 — After the birth · Wave 3

Deliberately not designed, and not to be invented during implementation. Greyscale sketches only,
in the wireframes file. Do not start any of this before the due date — the spec calls building
Track 3 early a risk worth weeks of wasted work.

- **Unit states and the counter screen (S16).** ready / in use / dirty / cleaning / stored / lost
  / broken / outgrown / given away. She never identifies a unit — she taps a number, the server
  picks which unit by the rotation rules. Category-specific wording: `ready` is *Sterilised* for
  feeding, *Clean* for clothing.
- **Consumable levels.** Four buckets, not percentages — full / half / low / empty. `Low` puts the
  thing on Today; it does not send its own notification.
- **Refill prediction.** `avg(retired_on − acquired_on)` over used-up units. Show ranges, never
  points; hide anything below three observations. A confident wrong prediction that makes you skip
  buying nappies is worse than no prediction.
- **Packing lists (S17).** `pack_items` is the intent, `pack_units` is what physically went in.
  Worth building only because it knows whether the things are available.
- **The skin record (S18).** It records and organises. It never concludes, diagnoses or
  recommends. No "likely allergen", no confidence score, no suggestion to stop using anything.
  Below three recorded reactions, the log only — no cross-tabulation at all. Every view carries
  one line: show this to your paediatrician.
- **Outgrow → buying loop.** The mechanic that makes buying and operations one product rather than
  two.

---

## Part 7 — `/api/mcp`

Note the spec's scope split assigns Part II to its author, so check whether this is yours at all
before starting. If it is, the build order is fixed:

1. `whoami`, `get_briefing`, `resolve_item` — read-only, and `resolve_item` gates everything after
2. Scopes and read-only tokens — blast radius before writes exist
3. Two-phase infrastructure: the proposal store, `confirm_change`, `cancel_change`
4. `propose_record_purchase` — the highest-frequency write
5. `undo_last_change` and the weekly digest — **same release as 4, not after**
6. The remaining propose tools
7. The eval fixture set — before Adinda touches it. 100% on the red-team set, no exceptions
8. The `instructions` block
9. `chat_logs` channel column and a 90-day retention policy

Hard rules: no write tool accepts a thing by name, ever. Summaries are generated server-side, not
paraphrased by the agent. Hospitals stay read-only over MCP. There is no delete. `show_prices`
defaults false and the server **omits** price fields rather than asking the agent to withhold them.

---

## Decisions you owe

**From the design handoff — still open**

1. **The status chip duplicates the count** on every list row (`4 of 12` *and* `Still need this`).
   The recommendation is to test without the chip; the count is the fact, and dropping it buys
   back a third of the row height.
2. **The Today progress bar is his metric, not hers.** It is the one element on Today that does
   not change what she does in the next 24 hours. If anything gets cut, cut this first — not a
   card.
3. **One-handed testing** (0.12).

**From the spec — still open**

4. **Nappies: level or count?** Count is exact and much more work. The recommendation is level,
   treating a pack as a unit.
5. **Is the steriliser cycle time fixed?** If so, `cleaning → ready` becomes a timer rather than a
   tap, removing an entire interaction per cycle.
6. **`show_prices` for your own MCP token.** Default false means asking Claude "how much have we
   spent" returns nothing. Suggested: default false everywhere, flip yours to true.

**Housekeeping**

7. **The whole rebuild is uncommitted** — one working tree on top of `f0a7b7d Initial commit from
   Create Next App`. Say the word and I'll commit it in sensible pieces.
8. **Adinda's account.** Which email, and confirm she lands on Today while you land on Money.

**Already resolved — recorded so nobody reopens them**

- "Hospital bag" as a band name → it is a **pack**, not a band (ADR-0004).
- Deleting a purchase → **retire** its units, don't delete them (ADR-0003).
- UI language → **English chrome, bilingual data.** Never translate a name someone typed.
- Where the spec and the design handoff disagree on wording → **the handoff wins** (ADR-0006).

---

## The order I'd actually work in

1. **0.1 → 0.2 → 0.3 → 0.4** — thirty minutes of your time, and it unblocks everything
2. **0.7**, continuously, in parallel with all of the below — it is the real critical path to 7 Sep
3. 1.2 compare, then 1.3 scans, then 1.7 — the hospital decision and the papers pack
4. 1.4 / 1.5 dates
5. 1.1 Today's cards, 1.6 access
6. 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 + 2.8 — the daily loop, in that order
7. 2.9 / 2.10 / 2.11 / 2.12 / 2.13
8. Part 3, the shell
9. Part 4, cutover — dry run well before the freeze
10. Freeze 30 Sep. Part 5 only.
11. Part 6 after the birth. Not before.

---

## Checking anything here is done

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all four, every time. `pnpm db:check`
reports what is actually in the cloud database; `pnpm db:invariants` checks the constraints hold.
