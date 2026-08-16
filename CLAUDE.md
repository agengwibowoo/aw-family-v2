# Newborn Prep

A private app for one household preparing for a child. Rebuild of `../family`, which is
frozen and gets retired at cutover.

Read `CONTEXT.md` before writing anything user-visible. Read `docs/adr/` before changing
architecture. `docs/newborn-prep-v2-spec.md` is the domain source; `design-handoff/` is the
design source and **wins on every user-visible string** (ADR-0006).

## The database is cloud-only

**There is no local database, and no local Supabase.** `DATABASE_URL` always points at the
hosted Supabase project.

- **Never run `pnpm db:migrate`, `drizzle-kit migrate`, `drizzle-kit push`, or any
  `supabase` CLI command.** Migrations are applied by a human in the Supabase dashboard.
- Do not run `supabase init`, `supabase start`, or `supabase db reset`.
- `pnpm db:generate` is fine — it only reads `src/server/schema.ts` and writes SQL to
  `supabase/migrations/`. It needs no connection.

To change the schema: edit `src/server/schema.ts`, run `pnpm db:generate`, then tell the
human which file to apply. Never apply it yourself.

## Stack

Single Next.js app (App Router). TypeScript, Tailwind v4, Supabase (Postgres + Auth +
Storage), Drizzle. No monorepo, no RPC layer, no protobuf.

## The one architectural rule

`src/server/services/` is the only code permitted to touch the database. Server Actions call
it; `/api/mcp` calls it. Nothing else imports `src/server/db`.

Invariants that are cheap in Postgres stay in Postgres — generated columns, partial unique
indexes, check constraints — because they hold even against a hand-written statement. See
ADR-0002.

## Language rules

These are enforced, not advisory.

- **Banned from every user-visible string**: Item, Entity, Record, Entry, Category, Filter,
  Query, Attribute, Phase, Complete, Mark complete, Quantity, Status, Deficit, Shortfall,
  Surplus, Overstocked. `CONTEXT.md` gives the word to use instead.
- Status is always a **word**, never a colour. The four are `Still need this`, `Got it`,
  `More than enough`, `Ruled out`.
- **No red, orange, amber or green anywhere.** Missing papers, an expiring card, a stale
  price are all stated in ink and words. If a design system offers semantic error colours,
  do not use them.
- **Blank data says "not filled in", written out.** Never a dash, never `—`, never `N/A`,
  never a `0` standing in for unknown.
- Numbers carry their frame: `4 of 12`, never `33%` alone. `about 61 days to go`, never
  `61`.
- **Data is bilingual, chrome is not.** Never translate a name someone typed —
  `Popok newborn` and `Kontrol kandungan` stay as they are. Labels and buttons are English.
- Every number that gets compared or counted is mono and tabular (`.tabular`), so hidden
  money `Rp••••••` and shown money `Rp180.000` occupy the same width.

## Design

Tokens live in `src/app/globals.css` as CSS variables with light, dark and explicit-theme
states. Use the Tailwind aliases (`bg-sf`, `text-ink2`, `border-ln`), never raw hex.

**Shadows: none.** Elevation is surface plus hairline border. Minimum body size 13px,
minimum touch target 52px.

Exact values for all 16 components are in `design-handoff/Newborn Prep Hi-Fi.dc.html`.
Behaviour is in `design-handoff/Newborn Prep Prototype.dc.html`. The wireframes file is
low-fidelity — take no visual value from it.

## Verify before claiming done

`pnpm lint && pnpm typecheck && pnpm build`. All three, every time.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
