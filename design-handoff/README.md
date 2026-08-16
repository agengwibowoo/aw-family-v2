# Handoff: Newborn Prep — Wave 1 + Wave 2

## Overview

A private, two-person app for a couple preparing for a baby, used in Jakarta, in a mix of English and Indonesian. It replaces a spreadsheet and a chat thread. Two people use it very differently: one (referred to below as **she** / Adinda) needs to know what to do today and to record a purchase in three seconds with one hand, often at 3am; the other (**he**) does the research, the budget work, and the hospital comparison, often on a desktop.

The design covers two waves:

- **Wave 1 — deadline-critical.** Choosing a hospital, the document pack for admission, and the schedule. A hospital must be chosen by ~7 Sep; the document pack must be ready by week 36.
- **Wave 2 — the daily loop.** The Today screen, the item checklist, item detail, recording a purchase, the money view, the gift registry, and household access.

**Wave 3 is deliberately not designed.** Post-birth operations (bottle/consumable counters, packing, the skin record) exist only as greyscale sketches. See *Explicitly out of scope*.

---

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour. They are **not production code to copy**. There is no build step, no framework, no component library, and the CSS is deliberately flat and inline-heavy so the designs stream and render in a design tool.

The task is to **recreate these designs in the target codebase's existing environment** — React, Vue, SwiftUI, Flutter, native, whatever is already there — using its established patterns, component library, routing, and state management. Where this document specifies a hex value, a size, or a string, treat it as a requirement. Where it describes a card or a row, build it from the codebase's own primitives.

If no environment exists yet, note the constraints in *Platform and delivery* below before choosing one — the deep-linking and offline requirements are the deciding factors.

## Fidelity

**High-fidelity.** Colours, typography, spacing, and copy are final and should be reproduced precisely. Two exceptions:

- `Newborn Prep Wireframes.dc.html` is **low-fidelity by design** — it is included for the structural reasoning and the alternatives that were rejected, not for styling. Do not take any visual value from it.
- Photography is unresolved. Every image in the designs is a placeholder. See *Assets*.

---

## Platform and delivery

Three constraints drive the platform choice. Confirm all three before starting.

1. **Every screen must be reachable by URL, and must work when arrived at cold.** Links are shared in a chat thread. A person following one may not have the app open, may not be signed in, and has no back history. Every screen therefore needs a stable URL, a sensible header (a close affordance, not a back arrow), and an onward path after the task is done. This is the single most structurally important requirement in the design.
2. **Reading must work offline; writes must be accepted offline and queued.** The document pack in particular must be fully readable with no signal, photos included — it is used in a hospital car park at 3am.
3. **It is installed to the home screen, not distributed through an app store.** There is an install prompt design (see *S-ICON*).

The designs were built as a PWA-shaped web app. A native app would satisfy 2 and 3 but makes 1 substantially harder. If you choose native, deep linking is the thing to solve first, not last.

---

## Vocabulary — non-negotiable

The app's tone is plain, human, and specific. Nine words are **banned from every user-visible string**. They are database words; the product exists because the spreadsheet felt like a database.

| Never write | Write instead |
| --- | --- |
| Item | The thing's name, or "thing" |
| Entity | — (never needed) |
| Record | "Add what we got" |
| Entry | — (never needed) |
| Category | "What sort of thing" |
| Filter | "Narrow it" |
| Query | — |
| Attribute | "What it's made of", "How important" |
| Phase | "What age it's for" |
| Complete / Mark complete | "It's done", "Got it" |
| Quantity | "How many" |
| Status | The status word itself |
| Deficit / Shortfall | "Still need this" |
| Surplus / Overstocked | "More than enough" |

Additional rules:

- **Every status is a word, never a colour.** The four status words are `Still need this`, `Got it`, `More than enough`, `Ruled out`. Two decision words for hospitals: `Picked this one`, `Shortlisted`.
- **"More than enough" must read as calm, not as a problem.** Same visual weight as the others. Ten of six nappies is good news.
- **Blank data says "not filled in", written out.** Never a dash, never an empty cell, never `—`, never `N/A`, never a `0` standing in for unknown. A blank that could be misread as "no" is a bug.
- **Numbers get their units and their frame.** `4 of 12`, never `33%` alone. `about 61 days to go`, never `61`.
- **Dates that are estimates say so.** The due date is an estimate; the countdown reads *about* 61 days.
- **Data is bilingual, chrome is not.** Item and appointment names stay in whatever language they were typed in (`Popok newborn`, `Kontrol kandungan`, `Cek darah lengkap`). Labels, buttons and headings are English. Do not translate user data. Search must match across both plus English synonyms — see *Search*.

---

## Design tokens

### Colour

The palette is cool near-neutral with **one hue**. The accent means exactly one thing: *you can act here*. Nothing else in the app is blue.

**Light**

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#f6f7f9` | Page |
| `--sf` | `#ffffff` | Card surface |
| `--sf2` | `#f0f2f5` | Quiet fill — chips, date blocks, progress track |
| `--ink` | `#12161c` | Primary text |
| `--ink2` | `#5a6472` | Secondary text |
| `--ink3` | `#8b95a3` | Tertiary / placeholder |
| `--ln` | `#e2e6ec` | Hairline |
| `--ln2` | `#cdd4dd` | Stronger border, control outline |
| `--ac` | `#1f5fa8` | Accent — buttons, progress fill |
| `--acs` | `#e9f0f8` | Accent tint surface |
| `--acl` | `#1f5fa8` | Accent text/link |

**Dark** — a first-class surface, not an inversion. Designed for a 2am feed and a hospital car park. The accent is *dimmed*, not brightened: a bright blue on black at 2am is the one thing that would wake her up.

| Token | Value |
| --- | --- |
| `--bg` | `#0d1117` |
| `--sf` | `#161c24` |
| `--sf2` | `#1e2630` |
| `--ink` | `#eef1f5` |
| `--ink2` | `#9aa5b3` |
| `--ink3` | `#6d7887` |
| `--ln` | `#252e39` |
| `--ln2` | `#33404e` |
| `--ac` | `#3d6491` |
| `--acs` | `#16253a` |
| `--acl` | `#7fa6d4` |

**There is no red, orange, amber or green anywhere in the app.** Missing papers, an expiring insurance card, a stale price, "Not ready yet" — all are stated in ink and words. Nothing here is an error; it is all work remaining, and a red badge at 3am helps nobody. If your design system supplies semantic error colours, do not use them on these screens.

There is exactly **one saturated surface**: the accent-filled "All 8 ready" panel on the document pack. It exists so that one answer is legible from arm's length, half asleep, in a car. Do not add a second.

### Typography

Two families.

- **Instrument Sans** — everything.
- **IBM Plex Mono** — every number that gets compared or counted: money, counts (`4 of 12`), times (`55 min`), distances, dates in compact form. Tabular figures.

The mono choice is functional, not decorative: hidden money `Rp••••••` and shown money `Rp180.000` must occupy the **same width**, so revealing money never reflows a layout. Tabular figures also stop the compare table shifting column to column.

| Role | Size | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Countdown / hero number | 40–42px | 600 | −3.5% | Only on the big-number moments |
| Screen answer (`h1`) | 22px | 600 | −2% | e.g. "Nothing needs doing today." |
| Card title (`h2`) | 17.5px | 600 | −1.5% | |
| Row name | 15.5px | 500 | −0.5% | |
| Body / supporting | 13px | 400 | — | |
| Key-value row | 14.5px | 400 / 500 | — | Label 400 `--ink2`, value 500 `--ink` |
| Section label | 10.5px | 600 | +10%, uppercase | `--ink3` |
| Mono default | 13px | 400 | −2% | Tabular |

**Minimum body size is 13px. Minimum touch target is 52px** (48px absolute floor; the count steppers on the add screen are 68px).

### Spacing, radius, shadow

- Spacing scale: 2, 4, 6, 8, 9, 10, 12, 13, 14, 16, 18, 20, 26px. Screen gutter is **18px**. Card internal padding is **15px 16px**. Gap between stacked cards is **13px**.
- Radius: card `14px`, button `11px`, small button `9px`, chip `7px`, quiet fill / date block `9–10px`, phone frame `36px`.
- **Shadows: none.** The design is flat by decision. Elevation is expressed by surface (`--sf` on `--bg`) and by hairline borders. The only shadow in the files is the drop shadow on the device frame in the canvas, which is presentation chrome and not part of the app.

---

## Components

Sixteen shared components. Build these first; every screen is assembled from them.

1. **Item row** — name (15.5/500), meta line (13/400 mono count + optional " · could be a gift"), status word chip right-aligned. Long names wrap to two lines and the row grows; **the chip never shrinks, truncates or wraps.** 12px vertical padding, hairline bottom border, none on last child.
2. **Action card** — title (h2), one line of reason, then a row of two buttons: primary full-width-ish + "Later" at `flex: 0 0 84px`. Used only on Today.
3. **Progress bar** — 6px tall, radius 3, track `--sf2`, fill `--ac`. **Always accompanied by a count in words** (`4 of 11`), never a bare percentage. Works with money hidden because it measures things, not rupiah.
4. **Status word chip** — `--sf2` fill, `--ink2` text, 12/600, radius 7, padding 4/9. Variants: `.k` inverted (`--ink` fill, `--bg` text) for *Got it* / *Picked*; `.a` accent tint for *Looking at it*; `.o` transparent with a 1px inset outline for *not filled in* / *Ruled out* / secondary controls.
5. **Money value** — mono, tabular. Hidden state renders `Rp••••••`; shown renders `Rp180.000` (German-style thousands separators: `Rp32.000.000`). Same width in both states.
6. **Money toggle** — a 44px circle containing a mono `Rp`. Struck through with a −38° 1.5px rule and grey when hidden; the strike disappears and the circle fills `--acs` with an `--ac` outline when shown. **Not an eye icon** — an eye says "look at this", a struck currency mark says exactly *what* is being withheld. **Appears only on screens that actually contain amounts** (hospital list, hospital detail, compare, item detail, money, appointment detail). A toggle on a screen with nothing to reveal is a button you can only get wrong.
7. **Date block** — 44–46px wide, `--sf2` fill, radius 9. Fixed date: one number (17–19px mono, 500) over a 10px month. **Window: two numbers separated by a 1.5px vertical rule, month below.** A period must never look like a fixed appointment.
8. **Bottom action bar** — 52px minimum buttons, 12px gap, 16px side padding, 24–26px bottom padding for the home indicator, hairline top border. One or two actions, one line of copy each. **Buttons must never wrap to two lines** — use `flex` + `white-space: nowrap`, and give fixed-width secondaries enough room (126–140px for two-word labels).
9. **Tab bar** — four tabs: Today, List, Dates, Money. Active tab is 600 weight `--ink` with a 26×2px accent rule at the top edge; inactive is 500 `--ink3`.
10. **Key-value row** — label 400 `--ink2` left, value 500 right, 10px vertical padding, hairline bottom border, none on last child.
11. **Photo slot** — dashed `--ln2` border, `--sf2` fill, radius 8. **The only images in the app are ones she took herself**: documents, ultrasound scans, receipts. Sizes: 46–50px in rows, 104px on item detail, 104×132px for scans.
12. **Link card** — 100–106px wide, thumbnail 126–132px tall, title 12/400 below, 2 lines. Missing preview degrades to a solid-bordered card that still opens. No inline players.
13. **Comparison cell** — value 14/500. A blank renders the `.o` chip reading `not filled in`, and it is tappable — filling it in starts there.
14. **Empty state** — three distinct kinds with distinct copy: *nothing here yet* ("Nothing on this list yet. Add the first thing."), *nothing matches* ("Nothing matches 'botol'. Add it as a new thing?"), *all done* ("All 11 done. Next lot due 15 Sep."). Never one generic empty component.
15. **Confirmation card with Undo** — `--acs` fill, `--ac` border, title h2 in `--acl`, sub in `--acl`, then `Undo` (104px, `--sf` fill) + `Add another`. **Not a toast.** It survives navigation and stays for the full 15-minute undo window. This is the app's only safety mechanism for a mis-tap; there are no "are you sure" dialogs.
16. **Readiness banner** — the loudest component, and the only one allowed to be. Not-ready: `--ink` border, h1 at 26px, sub, progress bar. Ready: `--ac` fill, white text. Used on the document pack, the packing list, and (post-birth) the steriliser.

---

## Screens

Naming matches the source brief. Each entry gives purpose, layout, and the rules that are easy to get wrong.

### S1 — Today (her landing)

**Purpose.** Answer "what needs doing today" in one glance, and offer the two things she does most.

**Layout.** Header: a 13px supporting line reading `Tue 14 Aug · about 61 days to go` (the day count in mono at 12.5px), then `Today` as h3 at 19/600. Body: at most three action cards, then the next appointment as a card, then a band progress card. Bottom bar: `Add what we got` (primary) + `Find a thing` (134px).

**The countdown is deliberately small.** It was originally a 42px hero number and was demoted: the due date is an estimate, the birth will come sooner or later than the date, and a 42px number would have been the loudest and least reliable thing on screen. It is now a 12.5px line above the title. Post-birth it reads `6 weeks old` in the same slot — **the screen does not change shape on the due date, only its contents.**

**Rules.**
- **At most three things to *do*.** The appointment card is a fact, not a task: it has no "Later" and does not count against the three. (The original brief said "at most three cards"; this is the one place the design pushes back on it.)
- Each card is one sentence and one action. Ranking is deterministic so "why is this here?" is answerable.
- "Later" hides that card for 7 days and promotes the next candidate.
- Loading: the countdown is computed on device and is **never a skeleton**. Cards render from cache within 1s and update in place. No spinner.
- Offline: a `.o` chip in the header reading `Offline · showing what we had at 1am`. Reading works; writes are accepted and queued.
- Empty state: an h1 reading "Nothing needs doing today.", then a **derived** sentence — it must consult the real counts. If the band is genuinely complete, "The hospital bag is done. Next thing due 15 Sep."; otherwise "5 things still to get, none of them urgent yet. Next date 15 Aug." A "done" sentence over a 38% bar is the one thing this screen cannot do. Then a `Coming up` section. **No illustration, no celebration** — she sees this state most days.
- The two bottom actions never disappear, on any state.

### S2 — Where to give birth

**Purpose.** Answer "where are we up to", not "what are these places".

**Layout.** One card per hospital, in order: picked, shortlisted, ruled out. Card contents in this order: decision chip + completeness count (mono, right); name (h1); a row of fact chips (`55 min in traffic`, `Baby intensive care`); **the computed insurance sentence**; a key-value row with the price.

**Rules.**
- **Decision word first, name second.**
- The insurance sentence is on the list, not two taps down — it is the fact most likely to cause financial harm. Unknown reads as an explicit sentence in `--ink3`: "Nobody has checked the insurance for this one." Never an absence.
- Completeness is a count in words (`7 of 30 filled in`). Badly incomplete entries additionally get a progress bar and a "Fill in the rest" button — an action, not a scold.
- Ruled-out keeps its reason, loses its border and its price, sits at the bottom, and is **never deleted**. With more than ~8 places, collapse ruled-out to a single "3 ruled out ›" row.
- Nothing on the card depends on the price. With money hidden, the card still ranks itself on drive time, care and insurance.

### S3 — One hospital

**Purpose.** Hold ~30 fields without feeling like a form.

**Layout.** Header with hospital type as the supporting line. Then, in order: the computed insurance card (bordered `--ink`, 16.5px sentence + supporting detail); decision chips + completeness; three expanded groups (Getting there, Medical, Money) as key-value cards; four collapsed groups as tappable rows with a summary of what is inside (Insurance, Policies, Our visit, Papers they want, Why we picked it). Bottom bar: "Fill in the N blanks" + "Compare".

**Rules.**
- The computed insurance answer is the **first thing on the screen**, above even the decision chip. Three sentences of plain English computed from two dates and a waiting period. Never "policy started 3 Jun 2025 · wait 12 months".
- Groups are questions, not schema: *Open at 2am*, *Baby stays with you*, *Deposit on arrival*, *Why we picked it*.
- Three open, four collapsed, so arriving cold shows the whole shape of the decision without 30 fields of scroll.
- Each group header states its own completeness. The Money group carries `asked 12 days ago`; past 60 days it says so in words, on the group and on every value in compare.
- **No wizard, no steps, no progress gate.** Saves per field; can be abandoned mid-way.

### S4 — Compare

**Purpose.** Decide between up to four (realistically 3–5) hospitals on a phone.

This screen went through three explored alternatives before landing. The chosen shape is **four narrow columns scrolled sideways with a pinned label column**, with two specific mitigations.

**Layout.** Header + money toggle. Then:

1. **A ranked insurance card, full width, above the table.** One row per hospital: name, reason, status chip. This is lifted out of the table entirely because it is the fact that can cause financial harm and it must not compete with a row of numbers. *This is mitigation 1 — the four-column layout could only express insurance as a compressed one-liner, which was its worst failure.*
2. **The table.** A horizontally scrollable region, `min-width: 544px`. Label column `flex: 0 0 96px`, `position: sticky; left: 0`, with its own background so values slide under it. Value columns `flex: 0 0 112px`. Rows alternate `--sf` / `--bg`. Ten rows: In traffic, Normally, Baby intensive care, Open at 2am, Husband in the room, Baby stays with you, Normal birth, Caesar, Deposit on arrival, Filled in. Then `6 more rows` as a chip.
3. Bottom bar: `Pick <name>` naming the leading place + `Rule out`.

**Rules.**
- **Nothing below 13px, and no value below 14px.** *Mitigation 2 — the first attempt used 116px columns which forced 13.5px values and 9.5px chips.* Columns were narrowed to 112 and the table simply got wider; it was already scrolling, so width was the cheap thing to spend.
- The label column must be **part of each row** (a sticky first cell), not a parallel column, or labels and values drift out of alignment as you scroll. Set `box-sizing: border-box` on all table cells.
- Column order follows the shortlist: **the picked place is always first**; ruled-out is off to the right where you have to go looking.
- Blank cells are the `not filled in` chip. Rows where *every* place is blank are dropped entirely.
- Stale prices carry `asked 4 months ago` on the value itself. No legend, no colour.
- A `Filled in` row belongs in the table — how much you know about a place is part of comparing it.
- "slide the table sideways ›" is written out as a chip. It is the one gesture in the app, so it gets words rather than a shadow you have to notice.
- Column headers are tappable and open that hospital's detail.

### S5 — Papers for the hospital (the document pack)

**Purpose.** Answer "can we leave for the hospital right now?" at 3am, with no signal, half asleep.

**Layout.** Header with the picked hospital as the supporting line. Then the readiness banner, then **Missing** (only the incomplete ones), then **Ready · N**, then an offline reassurance line.

**Rules.**
- One unmistakable state at the top; **only the missing things above the fold.** The ones that are done are proof, not work.
- Copy counts are first-class and in the row: `Need 3 copies · none made`. This is the line that gets forgotten at 3am.
- Expiry is stated **relative to the due date**: "Runs out 30 Sep — before the due date". The screen does the arithmetic.
- Not-ready uses an `--ink` border, **not red**.
- Ready uses the accent-filled banner — the app's only saturated surface.
- **Must be fully readable offline, photos included.** The offline line changes to "No signal — and this screen still works. Everything here is on your phone."
- No hospital picked yet: show the papers every hospital asks for, plus a line saying the list may grow once one is picked. Hospital changed: a banner naming what changed ("RS Pondok also wants a referral letter"), never a silent re-score.
- At week 36 this merges with the packing list (S17): papers and objects, one list, one readiness sentence.

### S6 — Dates

**Purpose.** "What's next", and hold both fixed appointments and multi-week windows without confusing them.

**Layout.** Header with `N coming up` in mono. Tomorrow's event is promoted out of the list into a card with what to bring. Then a `Coming up` list, then a single `Been and done` row, then a note that the first-year immunisation list appears after the birth.

**Rules.**
- **Windows get a different shape, not a different colour** — the two-number date block plus the words "Any day between 10 and 24 Sep" in the row.
- Rows say what is still needed of you: "Nothing booked yet", "Your paediatrician decides". A window with no action reads as done when it isn't.
- Seeded immunisations name their source in the row (IDAI schedule) and defer to the paediatrician. Editable like anything else. **A scaffold, never medical instruction.**
- Past collapses to one row that says what is in it — an archive, not a truncation. It is where the scan photos live, which is the real reason she goes back.
- Recurring events say so in a 12px line ("every Thursday", "weekly from here to the birth").
- No money toggle: no amounts on this screen.
- **No notifications are designed here.** Reminders belong to the chat assistant.

### S7 — One date

**Purpose.** Before: what to bring. After: what happened. Same screen, halves swapped **by the date — never a tab she has to choose.**

**Before.** Time as the largest thing on screen (32–34px). Who, where, travel time. A `Bring` checklist — one row per thing, tickable one-handed, reaching into the papers pack rather than repeating it. A `Before you go` card in plain sentences ("Nothing to eat for 8 hours. Water is fine."), never "fasting required (8h)". Likely cost. Bottom: `It's done` + `Change it`.

**After.** Scan photos first at 104×132px — the thing she comes back for. Then the doctor's note as one paragraph in her words (no fields; structure here would be blank most of the time). Then cost and a `Next one` row that closes the loop. Bottom: `Add a photo` + `Add a note`.

**Window variant.** The period as a plain 23–24px sentence, then "There is no single right day — anywhere in this period is fine.", then an empty progress bar between the two dates that fills as the period passes. Two actions, because a window has two honest endings: `Set a day` and `It's done`.

### S8 — The list

**Purpose.** Find and update things across ~120 (eventually 500+) entries without ever presenting a filter bar.

**Layout.** Header names the band as *context*, not as a control: `Hospital bag · wanted by 15 Sep`. A band progress card, then the rows for that band only, then a `Show the other 106 things` ghost button. Bottom: `Find a thing` (primary) + `Narrow it`.

**Rules.**
- **The list never opens on 500 items, so it never needs a filter bar.** It opens on the band you are in — 11 rows. This is the entire answer to "filters before answers".
- Three facts per row and nothing else: name, `have of need` in mono, one status word. Gift-eligibility is a phrase in the meta line, not a badge column.
- Search is a **bottom-third primary action**, not a magnifier in a top corner she cannot reach. "Narrow it" opens a sheet — one entry point, never a permanent bar.
- Counts in mono so `4 of 12`, `10 of 6` and `0 of 2` align down the column and can be scanned without reading.
- The "other things" destination is a jump-to list (bands, things family could give, everything, don't-need-any-more), not a wall of 500 rows.

### S9 — One thing

**Purpose.** Collapse the underlying three-level data model (thing → candidate → purchase) into something she never has to understand.

**Layout.** A count card (`4` big, `of 6`, status chip, progress bar, band + category). Then **What we have**. Then **Ones we're looking at**. Then video/review link cards. Then materials chips. Then notes. Then a summary line with spent / remaining and a `see the detail` link.

**Rules.**
- The two lists are titled **in her words** and she is never asked to classify anything. **One `Add` button**; the branch is a question, not a concept.
- Nothing on screen is called an option, a candidate, or a purchase.
- Ruled-out candidates stay at 55% opacity with an outline chip. His comparison work is made *quieter*, never deleted.
- Materials are optional chips, prompted only for clothing, feeding, toiletries and bath. A "commonly irritating" material appears as a plain extra chip — **no icon, no colour, no alert.** It is information.
- **`see the detail` is the whole of the two-audience solution**: it opens his density (a comparison table with rough prices) in place, on the same screen, at the same URL. His view is a *layer*, not a second app.

### S10 — Add or change a thing

Four questions above the fold, everything else explicitly optional: *What is it?* / *How many do we need?* (stepper) / *What sort of thing?* / *What age is it for?* / *Could family give this as a gift?* Then a dashed card listing the optional extras (how important, photos, brands and shops, what it's made of, notes).

**A thing can exist with a name and a number.** "Don't need any more" lives on the edit version as an ordinary action, not a destructive one behind a confirm.

### S11 — Add what we got  ← the most important screen in the app

**Purpose.** Record a purchase in **three seconds, one hand, thumb never leaving the bottom third**, usually arrived at cold from a chat link.

**Layout (item known).** Header: `From your message` / `Add what we got`, with **`Close`, not a back arrow** — there is no history. Then an identity card (count block + name + "not this?" escape hatch). Then `How many did you get?` with a 68px −/+ stepper and a 30px mono count. Then `What did it cost?` labelled *you can skip this*. Then a dashed card deferring everything else. Bottom: a single 56px `Save it`.

**Rules.**
- **Both fields are pre-answered.** Land, tap Save. The count starts at 1 (or the number from the link), because the commonest answer is "I got one".
- **Price can never block the save.**
- Money hidden does not affect this screen: she can enter a price she will never be shown back.
- **Where it lands after saving depends on how she arrived.** From a chat link → Today, the one screen that makes sense with no history. From inside the app → back to the thing, with context to return to. **Both show the confirmation card with Undo** (component 15) — this is not optional on either path; Undo is the only safety mechanism.
- Offline: identical flow, and the confirmation sub-line reads "Saved on your phone. It'll go up when you have signal."
- **Item not known** (opened from the Today bottom bar rather than a link): the same screen opens on a short list of things still needed, and picking one drops into the flow above.
- There is a designed one-tap variant for in-app use — a sheet with `1 / 2 / 3 / more` buttons that saves and closes on tap. Same confirmation-with-Undo on close. Build the full screen first; the sheet is an optimisation.

### S12 — Money (his landing)

Same four tabs as her account; **only the landing tab differs by account.** Band roll-up with spent / still-to-come, then by category with bars, then by importance, then links out to hospitals, registry and access.

**Percentages scope to the current band by default**, with an explicit way out to all-time. Every amount obeys the hidden-by-default rule; the bars still work with money hidden because they measure things.

### S13 — Things family could give

Read-only for guests. **No prices at all — not even behind the toggle.** Sorted by what is still needed. Shared by him; no public link.

### S14 — Getting in

Three states, each with a way out. Signed out; signed in and waiting; no longer permitted.

- After signing in from a deep link, land on **the screen the link pointed at**, not on Today.
- The waiting state must say **who has to act, that they were told, and when**, plus two ways out ("Ask again", "Sign in as someone else").
- Removed access is stated as a fact with a date, never an accusation and never a bare error.
- **An access screen with no action is a dead end** — that was the original bug.

### S15 — Who can get in

Waiting requests at the top (the only rows that ever need action), then the household, then turned-off accounts with a "let back in" affordance. "Manage" is the seam where a future limited role (a grandparent or nanny who can only mark things clean or dirty) would go — not designed, not blocked.

### S-ICON — Home screen icon and install

**The mark:** a ring with one arc missing — a countdown that hasn't closed. It becomes an age tracker without redrawing anything. Not a baby, a pram, or a footprint. One shape and one gap, so it survives at 40pt. White ring on `--ac`; dark variant is `#7fa6d4` on `#12161c`; mono variant is `--ac` on white. Sizes 180 / 120 / 76 / 40pt.

**Home-screen label is one word: `Newborn`.** iOS truncates around 11 characters and she needs to recognise it, not read it.

**Install prompt:** a bottom sheet with the icon, "Keep this on your home screen", and "So it's one tap, and it works with no signal." Two reasons, both hers — no mention of PWAs, installing, or apps. Shown on the **second** visit, never the first, never again if dismissed. She arrives from chat links; a prompt in front of the thing she came to do is a bounce.

---

## Interactions and behaviour

### Search

Matching must cover **English and Indonesian names plus English synonyms**, because the data is mixed and the interface is not. `bottle` must find *Botol susu*. Minimum synonym map from the prototype:

```
bottle/bottles → botol      nappy/nappies/diaper/diapers → popok
wipe/wipes/washcloth → waslap   pad/pads → pembalut
swaddle → bedong            brush → sikat
corset → korset             clothes/shirt → baju
```

Substring match on the name, case-insensitive, after synonym substitution. Photos appear in search results but not in the list — **here she is identifying, there she is scanning.**

An empty query shows a jump-to list, not a blank screen. No results always offers the way onward: add it as a new thing.

### Undo

15-minute window. Lives **in the confirmation card**, where she is already looking. Restores the previous count exactly. There are no confirm dialogs anywhere in the app; the safety is in the undo.

### Offline

Reads work from cache. Writes are accepted, queued, and **said out loud** — never blocked, never silently lost. The document pack is cached whole, photos included. Today shows a header chip; the save confirmation changes its sub-line.

### Money visibility

Off by default **for both accounts**, per session. Hiding must not change any layout (this is why money is mono and both states are the same width). Every screen must remain rankable and usable with money hidden — check this on the hospital list and compare in particular.

### Animation

None is specified. Where the target platform has conventional transitions, use them; nothing in this design depends on motion.

### Responsive

Breakpoint at **880px**. Desktop applies to four screens only — S3, S4, S8, S12 — and it is deliberately the same information architecture, wider:

- **S4 compare:** four columns without horizontal scroll, identical row order, identical wording, six hidden rows still hidden.
- **S8 list:** the mobile "Narrow it" sheet becomes a persistent left column. This is the **one place a permanent filter surface is allowed**, because it is his screen and there is room without displacing the answer.
- **S3 hospital:** the seven groups become a left jump list; all seven open at once. Nothing renamed, nothing added.
- **S12 money:** the three roll-ups sit side by side instead of stacked.

Desktop hi-fi has not been drawn. The wireframes (option `1v`) carry the layout.

---

## State

Minimum state to reproduce the prototype's behaviour:

| State | Shape | Notes |
| --- | --- | --- |
| `items` | name, need, have, category, band, gift, importance, unit price | `have` may exceed `need` → "More than enough" |
| `docs` | name, copies required, copies made, has photo, expiry note | Drives the readiness banner |
| `events` | title, date or window {from, to}, time, who, bring, prep, cost, done, source | Window and fixed are the same type with an optional range |
| `hospitals` | ~30 fields, nullable; plus decision state and quote age | **Null must be distinguishable from "no"** everywhere |
| `picked` | hospital id | Drives the document pack's hospital name and requirements |
| `who` | `her` \| `him` | Chooses the landing tab only |
| `moneyShown` | boolean, per session, default false | |
| `theme` | light \| dark | |
| `offline` | boolean | Drives the header chip and the save copy |
| `dismissed` | ids + timestamps | "Later" for 7 days |
| `toast` | {title, sub} \| null | The confirmation card; cleared on navigation *except* the save that created it |

**Derived, never stored:** the insurance sentence per hospital; band completeness; the three Today cards and their order; the readiness sentence; "still to come, roughly"; the countdown/age line.

---

## Assets

**Everything is a placeholder. No production imagery exists.**

- **Photography:** the design deliberately contains no product photography. The only images are ones the user takes herself — documents, ultrasound scans, receipts. Build the photo slots; there are no assets to ship.
- **Fonts:** Instrument Sans and IBM Plex Mono, both Google Fonts (SIL Open Font License). Weights used: 400, 500, 600, 700 / 400, 500.
- **Icons:** there is no icon set. The design uses text (`‹`, `›`, `−`, `+`) and words. If the codebase has an icon library, the only genuine candidates are the back chevron and the row chevron. **Do not add icons to status chips, empty states, or alerts.**
- **App icon:** described above; needs producing at 180/120/76/40pt plus a maskable variant.

---

## Explicitly out of scope

Not designed, and **not to be invented during implementation**:

- Notifications and reminders of any kind (the chat assistant owns these)
- Onboarding
- Wave 3: bottle/consumable counters (S16), the packing list (S17), the skin record (S18) — greyscale sketches only, in the wireframes file
- Limited caregiver roles
- Any public sharing link
- Any "likely cause" or scoring logic on the skin record — it is a dated record for a paediatrician, and the app does not work out causes

---

## Open questions for the team

1. **The status chip duplicates the count** on every list row (`4 of 12` + `Still need this`). Recommend testing without the chip; the count is the fact and dropping it buys back a third of the row.
2. **"Hospital bag" as a band name will age badly** once the other bands are age-relative. One band is a bag and the rest are ages; that inconsistency will surface in every heading, bar and empty state. Worth naming the bands before screens hardcode the mixture.
3. **The Today progress bar is his metric, not hers.** It is the one element on Today that does not change what she does in the next 24 hours. If anything gets cut in testing, cut this first — not a card.
4. **Nothing has been tested one-handed on a real phone.** The three-second claim on S11 is the most likely thing in this document to be wrong.

---

## Files in this bundle

| File | What it is |
| --- | --- |
| `Newborn Prep Prototype.dc.html` | **Start here.** Working end-to-end prototype: navigation, search, real counts, the hospital decision, paper ticking, money toggle, light/dark, offline, both accounts. State is real — record a purchase and the list, Today and Money all change. The side panel drives cold landings and states. |
| `Newborn Prep Hi-Fi.dc.html` | Annotated hi-fi screens with the design rationale, the token/type/component system, the three rejected compare alternatives, and the icon. Each screen carries notes explaining *why*. |
| `Newborn Prep Wireframes.dc.html` | Greyscale structure and the rejected alternatives, including the navigation-shape decision (one app / two landings / two surfaces) and the Wave 3 sketches. **Low-fidelity — no visual values here are current.** |

All three open directly in a browser. The prototype is the best single reference for behaviour; the hi-fi file is the best reference for values and reasoning.
