# Setup — the parts only you can do

Everything here happens in the Supabase dashboard and in a file that never gets committed.
Nothing in this list can be done by an agent, which is why it is a list.

Work top to bottom. It takes about fifteen minutes.

---

## 1. Create the project

<https://supabase.com/dashboard> → **New project**.

| Field | Value |
|---|---|
| Name | `newborn` |
| Region | **Southeast Asia (Singapore)** |
| Database password | generate one, save it in your password manager |

Region matters more than it looks. Jakarta to Singapore is ~30ms; Jakarta to Virginia is
~250ms, and every screen she opens pays it twice.

**Do not reuse the legacy project.** This is a new database — see `docs/adr/0001`.

- [ ] Project created

---

## 2. Create the schema

**SQL Editor** → **New query**.

Paste the entire contents of `supabase/migrations/0000_lucky_starjammers.sql` and run it.

It creates 23 tables and 62 constraints. It should finish in a second or two with no output.

If it errors, stop and tell me the error rather than editing the SQL — the file is generated
from `src/server/schema.ts` and hand-edits get overwritten.

- [ ] Schema applied

### Sanity check

New query, run this:

```sql
select count(*) as tables from information_schema.tables
where table_schema = 'public';
```

Expect **23**.

- [ ] Returns 23

---

## 3. Load the reference data

New query. Paste the entire contents of `supabase/seed.sql` and run it.

This is age bands, priorities, categories, the documents hospitals ask for, and materials.
It is safe to run more than once.

### Sanity check

```sql
select name, age_from_months, age_to_months from age_bands order by sort_order;
```

Expect seven rows starting at `Before the birth` with `-9`, ending at `School age` with
`36` and a null upper bound.

- [ ] Seven age bands

---

## 4. Turn on Google sign-in

**Authentication** → **Sign In / Providers** → **Google** → enable.

You need a Google OAuth client. If you still have the one from the legacy app you can reuse
it — just add the new redirect URL to it. Otherwise:

1. <https://console.cloud.google.com/apis/credentials> → **Create credentials** → **OAuth
   client ID** → **Web application**.
2. Authorised redirect URI: copy the **callback URL** Supabase shows you on that provider
   page. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the client ID and client secret back into Supabase.

Then, still under **Authentication** → **URL Configuration**, set **Site URL** to
`http://localhost:3000` for now. We change it at deploy.

- [ ] Google sign-in enabled

Signing in does not grant access — an account lands as `pending` until approved. That is
built, not configured.

---

## 5. Create the storage bucket

**Storage** → **New bucket**.

| Field | Value |
|---|---|
| Name | `media` |
| Public bucket | **off** — leave it private |

Private is not optional. This bucket holds scans of KTP, Kartu Keluarga, the marriage book
and insurance cards. See `docs/adr/0007`.

Then paste `supabase/storage-policies.sql` into the SQL editor and run it. It sets the 10MB
size ceiling and the accepted image types, and denies the browser every kind of access —
the app reaches storage with the secret key from `src/server/services/scans.ts`, which is
the only module allowed to. It refuses to run if the bucket is missing or public, so
running it is also how you check you got the previous step right.

Until both are done the papers screen still works; it just shows an empty photo slot. The
words and the copy counts are the part that matters at 3am.

- [ ] Bucket `media` created, private
- [ ] `supabase/storage-policies.sql` applied

---

## 6. Fill in `.env.local`

In the project root, copy `.env.example` to `.env.local` and fill it in. `.env.local` is
gitignored and must stay that way.

**Where each value lives:**

| Variable | Where | Looks like |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → **Project URL** | `https://abc….supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → **Publishable key** | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | Same page → **Secret keys** → reveal, or create one | `sb_secret_…` |
| `DATABASE_URL` | Project Settings → Database → **Connection string** → **Transaction pooler** | `postgresql://postgres.abc…` |

Three things that catch people out:

- **The publishable key is the public one.** It goes in the browser and grants nothing on
  its own; RLS is what protects the data. The secret key never leaves the server.
- **If what you copied starts with `eyJ`, put it back.** That is a legacy JWT from further
  down the same page. Use the `sb_…` pair — those can be revoked one at a time.
- **The connection string ships with `[YOUR-PASSWORD]` in it.** Replace that, brackets
  included, with the database password from step 1. Take the **transaction pooler** string
  (port `6543`), not the direct connection.

Leave the `LEGACY_*` variables empty. They are only used by the import script at cutover.

- [ ] `.env.local` filled in

### Sanity check

```
pnpm dev
```

Open <http://localhost:3000>. You should get a page reading **Newborn**. It does not touch
the database yet, so this only proves the app builds — the database check was step 2.

- [ ] Dev server runs

---

## 7. Tell me you're done

Say so and I'll wire the connection up and start reading from it.

**Don't paste any key into the chat.** I read them from `.env.local` myself when I need
them, and a key in a transcript is a key you have to rotate.

---

## What I will never do

Recorded here so you can hold me to it, and in `CLAUDE.md` so I actually follow it:

- I will never run `pnpm db:migrate`, `drizzle-kit push`, or any `supabase` CLI command.
- I will never apply a migration. I generate the SQL and hand it to you.

If the schema changes, you get a new numbered file in `supabase/migrations/` and a note
saying so. Applying it is always your call.
