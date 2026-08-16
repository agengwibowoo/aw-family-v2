-- Storage policies for the `media` bucket.
--
-- Apply this AFTER creating the bucket by hand:
--   Storage → New bucket → name `media` → **Public off**
--
-- Private is not optional. This bucket holds KTP, Kartu Keluarga, the marriage
-- book and insurance cards. See ADR-0007.
--
-- The app reaches storage with the secret key from `src/server/services/scans.ts`,
-- which bypasses RLS by design — it is the one module allowed to touch storage,
-- and it is only ever constructed on the server. These policies exist so that a
-- browser holding the *publishable* key can do nothing at all, which is what
-- makes a leaked publishable key uninteresting.

-- Belt and braces: refuse to run if the bucket was created public.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'media') then
    raise exception 'Create the private bucket `media` first (Storage → New bucket).';
  end if;

  if exists (select 1 from storage.buckets where id = 'media' and public) then
    raise exception 'The `media` bucket is public. Turn public off — it holds identity documents.';
  end if;
end $$;

-- Size ceiling and accepted types, held by storage rather than by the app, so a
-- hand-crafted upload obeys them too.
update storage.buckets
set
  file_size_limit = 10485760, -- 10MB: a phone photo. Larger is a mistake.
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'media';

-- No anon or authenticated access of any kind. Everything goes through the
-- service, which checks the approval gate first.
drop policy if exists "media is service only" on storage.objects;

create policy "media is service only"
on storage.objects
for all
to anon, authenticated
using (false)
with check (false);
