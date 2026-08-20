# Everything left to do

**17 August 2026 · about 58 days to go.**

Read the board first. Everything below it is detail.

Deadlines that cannot move: a hospital picked by **~7 Sep**, the papers pack complete by
**~20 Sep** (week 36), no risky changes after **30 Sep**, due date **14 Oct**.

---

## The board

| Blocked — can't start | Ready now | Shipped |
|---|---|---|
| Part 5 · the week-36 bag · needs 0.7 | 3.1 Offline | S1 · S2 · S3 · S4 · S5 |
| Part 5 · immunisations · needs 0.11 then 0.13 | 3.2 The offline wording | S6 · S7 · S8 · S9 · S10 |
| | 3.3 PWA and the install sheet | S11 · S12 · S13 · S14 · S15 |
| | 3.4 The app icon | Every service, with tests |
| | 4.1 The import script | The design system, all 16 |
| | 4.2 The count check | Auth and the approval gate |
| | 4.3 Dry run, then the real run | Scan photos — bucket and policies live |
| | 0.10 Deploy · setup.md §8 | 0.1 – 0.6 · 0.8 |
| | 2.14 The one-tap sheet | |

**Ask before starting:** Part 7, `/api/mcp`. The spec's scope split assigns Part II to its
author, so whether this is mine at all is an open question, not a green light.

**Not before the due date:** all of Part 6. Deliberately.

### What each of your remaining tasks releases

- **0.7 the real data** → the hospital pick, the papers pack, and Part 5's week-36 bag, which
  seeds from the picked hospital's document requirements. The only thing still gating work,
  and the only one on the 7 Sep deadline.
- **0.11 checking the IDAI schedule**, then **0.13 the birth date** → the immunisation
  generator, in that order.

0.1 through 0.6 and 0.8 are done: the household row is in, Google sign-in works, you are an
admin, the `media` bucket exists with its policies applied, and the legacy credentials are in
`.env.local`. 0.9 no longer applies — the old app is not being used, so there is nothing to
freeze and the import can run for real whenever 4.1 and the dry run are ready.

The rest of Part 0 is a standing rule or a single moment, and gates nothing.

---

## Where things stand

**Built and working**

| | |
|---|---|
| Schema | 23 tables live in Supabase, with the invariants in Postgres. Migrations 0001 and 0002 applied; **0003 waiting on you** |
| Reference data | 7 age bands, 9 categories, 3 priorities, 9 papers, 14 materials |
| Design system | Tokens in `globals.css`, all 16 components plus Select, Stepper, Sheet and the verdict card; `/gallery` renders them |
| Domain logic | age, dates, insurance, money, status, search, the antenatal pattern, Today's ranking — with tests |
| Auth | Google sign-in, approval gate, middleware, S14 with all three states |
| S1 | Today — the ranked cards, the appointment as a fact, `Later`, the derived empty sentence |
| S2 · S3 · S4 | Where to give birth; one hospital; compare, with the ranked insurance card |
| S5 | Papers, including the no-hospital state, the hospital-changed banner, an Undo card and "Haven't got it" on every ready paper, and where each one is kept |
| S6 · S7 | Dates and one date, all four variants, plus the antenatal pattern in one tap |
| Dates | Changing one, period or appointment, and taking one off the list with Undo — `/dates/off` is the path that does not expire. ADR-0009 |
| S8 · S9 · S10 | The list, one thing, add or change. Search with synonym substitution |
| S11 | Add what we got, with Undo in the confirmation card |
| S12 · S13 | Money and the registry. Money is the fourth tab; `who` picks the landing tab |
| S15 | `/who` — approve, block, ask again, let back in |
| Services | things, purchases and units, schedule, money, scans, links, materials |
| Scans | The service, the upload path, and the private `media` bucket with its policies |

Verified with `pnpm lint && typecheck && test && build`, plus `pnpm test:db` — 166 tests
against the cloud database — and `db:check` / `db:invariants`.

`pnpm demo:seed` puts eleven made-up things and two dates in so the screens can be looked
at; `pnpm demo:clear` takes them away. Everything it writes is named `Demo · …`.

**Not started**

Offline · the PWA · the app icon · S11's one-tap sheet · `/api/mcp` · the legacy import ·
the week-36 hospital bag · the IDAI generator · everything in Part 6.

---

## Part 0 — Only you can do these

**This whole part is the list of things no agent can do.** Not one of them leaves a trace in
the repo, so the state below is what you told me on 17 August, not something I checked.

### 0.1 – 0.5 — done

The household row is in, Google sign-in is on, you are an approved admin, and the private
`media` bucket exists with `supabase/storage-policies.sql` applied. Today reads from real data
and scan photos appear. Nothing downstream of these is blocked any more.

### 0.6 Apply every future migration by hand — standing rule, done as it arises

From `CLAUDE.md`. I edit `src/server/schema.ts`, run `pnpm db:generate`, and tell you which
numbered file in `supabase/migrations/` to paste in. I never apply one. 0001 and 0002 are in.

**Waiting on you now:** `supabase/migrations/0003_true_jazinda.sql` — one line, adding
`where_kept` to `document_status`. The papers screen's new "Where it's kept" box reads and
writes that column, so until it is pasted in, `/papers` will error.

### 0.7 Gather the real data — **blocks the hospital pick, the papers pack and Part 5** · open

This is most of your remaining calendar time. No amount of code substitutes for it, and the
7 Sep deadline is really this list's deadline:

- The hospital shortlist — name and address per place, then the ~30 fields
- Ring or DM each place for package prices by delivery type × room class, plus the deposit
- Your insurance policy: start date, waiting period, limits split normal vs caesar, room
  entitlement, whether the baby is covered from birth
- Photograph each paper and count the photocopies actually made

### 0.8 Legacy read-only credentials — done

`LEGACY_DATABASE_URL`, `LEGACY_SUPABASE_URL` and `LEGACY_SUPABASE_SECRET_KEY` are in
`.env.local`. 4.1 and the dry run are unblocked.

### 0.9 Freeze the old app — no longer applies

The old app is not being used, so there is nothing to freeze. ADR-0001's constraint was about
writes arriving after the dry run; with no writes happening, the dry run and the real run can
follow each other the same day. 4.4 becomes retiring a thing nobody is on rather than a cutover.

### 0.10 Deploy — unblocked, and now written down

Every step is `docs/setup.md` section 8: four environment variables on Vercel, then Site URL and
the redirect URLs in Supabase, then a look at the Google client. All of it is yours — I have no
access to either dashboard.

Nothing in the repo has to change first. `pnpm verify` passes as it stands, uploads go from the
browser straight to Supabase Storage so Vercel's request size ceiling never comes into it, and the
app reads its own host from the browser, so there is no site-URL variable to set.

The half that gets forgotten is the Supabase one. A deploy with the old localhost Site URL still
builds and still serves pages; it just cannot sign anyone in.

### 0.11 Check the IDAI immunisation schedule against a live source — **blocks the generator**

Before I build the generator, verify the current schedule yourself. A hardcoded list written
today may be wrong by the time it fires, and this is the one place in the app where being wrong
is a medical matter rather than a cosmetic one. The spec makes this an explicit accuracy
requirement.

### 0.12 Test S11 one-handed on a real phone

The three-second claim is untested. The handoff names it as the most likely thing in the whole
document to be wrong. Nobody can do this from a laptop.

### 0.13 Set the birth date the day it happens — **fires the generator**

```sql
update children set birth_date = date '2026-10-XX';
```

Everything age-relative switches origin from the due date to that, and the immunisation schedule
generates off it.

---

## Shipped

Parts 1 and 2 are done. They were twenty items of design detail; what follows is one line each,
with the commit that built it. The exact pixel values, row order and wording rules that used to
live here are in `design-handoff/Newborn Prep Hi-Fi.dc.html` and `docs/newborn-prep-v2-spec.md`,
which win over this file anyway under ADR-0006. This was never their home.

| | | |
|---|---|---|
| 1.1 | Today's action cards, ranked, with `Later` and the derived empty sentence | `a8044fb` |
| 1.2 | S4 Compare — the ranked insurance card above a table that slides sideways | `8b90fb4` |
| 1.3 | Scans — the service, signed upload and read URLs, `PhotoSlot` in the papers rows | `8bfa7b4` |
| 1.4 | S6 Dates and S7 one date, all three variants | `529aee9` |
| 1.5 | The antenatal pattern, proposed as a whole series in one tap | `529aee9` |
| 1.6 | S15 finished — waiting requests, the household, and letting someone back in | `ee7c270` |
| 1.7 | Papers — the banner that names what changed when the hospital changes | `ee7c270` |
| 2.1 | The things service, counting from units rather than purchases | `6fa437e` |
| 2.2 | Purchases and units, with deletion retiring units instead of removing them | `6fa437e` |
| 2.3 | S8 The list, opening on the band you are in | `87f3bfc` |
| 2.4 | Search, matching after synonym substitution so `bottle` finds *Botol susu* | `87f3bfc` |
| 2.5 | S9 One thing, with his comparison density as a layer at the same URL | `87f3bfc` |
| 2.6 | S10 Add or change a thing, four questions above the fold | `87f3bfc` |
| 2.7 | S11 Add what we got — both fields pre-answered, land and tap Save | `7e9bf86` |
| 2.8 | Undo, in the confirmation card, shipped in the same commit as the write path | `7e9bf86` |
| 2.9 | Links — oEmbed, tracking parameters stripped, cards rather than embeds | `8bfa7b4` |
| 2.10 | Materials, prompted for four categories only, never blocking a save | `8bfa7b4` |
| 2.11 | S12 Money, and the fourth tab | `c1237b9` |
| 2.12 | S13 Things family could give, with no prices at all | `c1237b9` |
| 2.13 | The landing tab by account | `c1237b9` |

Item numbers 3.1 through 7.9 keep the values they have always had, and the gap where 1 and 2
used to be is deliberate — other documents and commit messages cite these numbers, so nothing
gets renumbered.

### 2.14 The one-tap sheet — still open

The `1 / 2 / 3 / more` sheet on S11. It was always described as an optimisation to build after
the full screen, and the full screen is built. Small, unblocked, and worth doing only once 0.12
says the three-second claim is real.

---

## Part 3 — The shell

Nothing here is blocked. It is the only large block of work I can start today.

### 3.1 Offline

Per ADR-0005: one endpoint returns the household as a single JSON document, a service worker
caches it and re-renders from it, and writes go into an IndexedDB outbox that replays on
reconnect. No sync engine.

Scan **bytes** are cached keyed by object path, not signed URLs — a cached URL is worthless at
3am because it has expired (ADR-0007).

Offline is scoped deliberately: Today, the list, one thing, add what we got and the papers pack
work without signal; compare, money and the admin screens require it **and say so in words**.

### 3.2 The offline wording

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

### 4.1 The import script — unblocked, 0.8 is in

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

### 4.2 The count check — not optional, and not blocked

Every thing's count must match the legacy value exactly. ADR-0003 says so in those words, because
a unit-spawning bug corrupts the number on the screen used most. This can be written before the
credentials arrive, so it should be.

### 4.3 Dry run, then the real run

Both are unblocked. Dry run first, still — it is where the mapping problems show up, not a
scheduling constraint. Nothing waits between the two now that the old app is idle.

### 4.4 Retire the old app

---

## Part 5 — Freeze to birth

**30 Sep — freeze.** No risky changes from here.

**~20 Sep, week 36 — the hospital bag.** Needs 0.7. Papers and objects on one screen with one
readiness sentence, seeded from the hospital-bag pack plus the picked hospital's document
requirements. A line is blocked when the required number isn't available, and it says why.
`packs` and `pack_items` already exist in the schema.

**The day it happens — the birth date (0.13).** Setting it generates the first-year immunisation
schedule as `planned` events with date **windows**, each naming its source (IDAI schedule) and
deferring to the paediatrician. Editing one marks it `manual`. Regenerating never touches an event
already done or hand-edited. A scaffold, never medical instruction. Verify the schedule first
(0.11) — the `idai_schedule` source value exists in `schedule.ts`, but nothing emits the schedule
yet, and nothing should until you have checked it against a live source.

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

Nothing built. Note the spec's scope split assigns Part II to its author, so check whether this is
yours at all before I start. If it is, the build order is fixed:

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
paraphrased by the agent. Hospitals stay read-only over MCP — taking a place off the list is a
web-only action, and there is no delete anywhere, over MCP or otherwise. `show_prices`
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

7. **Adinda's account.** Which email, and confirm she lands on Today while you land on Money.

**Already resolved — recorded so nobody reopens them**

- "Hospital bag" as a band name → it is a **pack**, not a band (ADR-0004).
- Deleting a purchase → **retire** its units, don't delete them (ADR-0003).
- UI language → **English chrome, bilingual data.** Never translate a name someone typed.
- Where the spec and the design handoff disagree on wording → **the handoff wins** (ADR-0006).
- The rebuild being uncommitted → committed, in fifteen pieces, on `finish-the-handoff`.

---

## The order I'd actually work in

1. **0.7**, continuously, in parallel with everything below — the real critical path to 7 Sep,
   and now the only task of yours that gates anything
2. 4.2 the count check, then 4.1 the import, then 4.3's dry run and the real run, then 4.4.
   This moved up: 0.8 is in and nothing waits on a freeze any more, so the cutover can finish
   in one stretch instead of straddling a date
3. Part 3, the shell — 3.1 offline, then 3.2, then 3.3, then 3.4. Large, unblocked, and the
   thing that makes the app usable at 3am
4. 0.10 deploy, once Part 3 is worth putting on a phone
5. Part 5's week-36 bag from ~20 Sep, once 0.7 has given it something to seed from
6. Freeze 30 Sep. Part 5 only from there
7. Part 6 after the birth. Not before

2.14 and Part 7 slot in wherever you want them; neither is on the path to anything.

---

## Checking anything here is done

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all four, every time. `pnpm db:check`
reports what is actually in the cloud database; `pnpm db:invariants` checks the constraints hold.
