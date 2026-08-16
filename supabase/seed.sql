-- Reference data. Safe to re-run: every insert is keyed on the unique name.
-- Apply after 0000_lucky_starjammers.sql.

-- =============================================================================
-- AGE BANDS
-- Months from birth, negative before it. Ordered, non-overlapping, covering all
-- of time. There is no timing label here: "Apr 2027 →" is derived from the
-- child's birth date, falling back to the due date.
--
-- The legacy `phases` table also held "Hospital bag" (a pack), "Post-birth" (an
-- overlap) and "Optional" (a priority). Those are not bands. See ADR-0004.
-- =============================================================================

insert into age_bands (name, sort_order, age_from_months, age_to_months, focus) values
  ('Before the birth', 1, -9,  0,    'Big things, the nursery, mum''s own needs, basic clothes and feeding gear. Washed and sterilised before the birth.'),
  ('0–3 months',       2,  0,  3,    'Newborn-only: pacifier, carrier, smallest nappies, sleep sack.'),
  ('3–6 months',       3,  3,  6,    'Teethers, bath seat, playmat — things that wait until the baby is bigger.'),
  ('6–12 months',      4,  6,  12,   'Solid food gear: high chair, food processor, utensils.'),
  ('1–2 years',        5,  12, 24,   'Walking, bigger clothes, shoes, toys.'),
  ('2–3 years',        6,  24, 36,   'Potty training, books, first outings.'),
  ('School age',       7,  36, null, 'School things, uniform, books.')
on conflict (name) do nothing;

-- =============================================================================
-- PRIORITIES
-- =============================================================================

insert into priorities (name, sort_order) values
  ('Essential',   1),
  ('Recommended', 2),
  ('Optional',    3)
on conflict (name) do nothing;

-- =============================================================================
-- CATEGORIES
-- The tracking flags default from here at creation and are overridable per
-- thing. Nobody recording day-to-day ever sets them.
--
-- prompts_materials is true only where materials plausibly matter. Nobody will
-- fill them in for a hundred things, so we ask in four categories and leave the
-- rest blank forever.
-- =============================================================================

insert into categories (name, sort_order, prompts_materials, default_tracks_cycle, default_tracks_consumption, default_tracks_size) values
  ('For Mom',           1, false, false, true,  false),
  ('Nursing & Feeding', 2, true,  true,  false, false),
  ('Bath & Potty',      3, true,  true,  false, false),
  ('Clothing',          4, true,  false, false, true),
  ('Toiletries',        5, true,  false, true,  false),
  ('Health & Safety',   6, false, false, true,  false),
  ('Nursery',           7, false, false, false, false),
  ('Travelling',        8, false, false, false, false),
  ('MPASI',             9, false, true,  false, false)
on conflict (name) do nothing;

-- Clothing cycles as well as sizes — it goes worn → wash basket → washing →
-- clean like anything else.
update categories set default_tracks_cycle = true where name = 'Clothing';

-- =============================================================================
-- DOCUMENTS
-- Names stay in the language the document is actually called by. Indonesian
-- hospitals ask for the same core set with different copy counts.
-- =============================================================================

insert into documents (name, issued_by, universally_needed, sort_order) values
  ('KTP suami',       'Dukcapil',        true,  1),
  ('KTP istri',       'Dukcapil',        true,  2),
  ('Kartu Keluarga',  'Dukcapil',        true,  3),
  ('Buku nikah',      'KUA',             true,  4),
  ('Kartu asuransi',  'Insurer',         true,  5),
  ('Buku KIA',        'Puskesmas / RS',  true,  6),
  ('Surat preauth',   'Insurer',         false, 7),
  ('Hasil USG',       'RS / klinik',     false, 8),
  ('Hasil lab',       'Lab',             false, 9)
on conflict (name) do nothing;

-- =============================================================================
-- MATERIALS
-- A lookup table, not free text — correlation over free text is impossible, and
-- this is consistent with categories and priorities being tables.
--
-- commonly_irritant pre-flags the usual suspects so the interface can surface
-- them with no correlation maths at all. It is information shown as a plain
-- chip: no icon, no colour, no warning. This app records; a paediatrician
-- concludes.
-- =============================================================================

insert into materials (name, kind, aka, commonly_irritant, notes) values
  ('Katun',      'fabric',   'cotton, 100% cotton, katun combed',      false, null),
  ('Bambu',      'fabric',   'bamboo, bamboo viscose, rayon bambu',    false, null),
  ('Poliester',  'fabric',   'polyester, poly, microfiber',            false, null),
  ('Wol',        'fabric',   'wool, merino',                           true,  'Irritating for some babies against bare skin.'),
  ('PP',         'plastic',  'polypropylene, polypropilena',           false, null),
  ('PPSU',       'plastic',  'polyphenylsulfone',                      false, null),
  ('Silikon',    'plastic',  'silicone, food grade silicone',          false, null),
  ('Kaca',       'glass',    'glass, borosilicate, kaca borosilikat',  false, null),
  ('Stainless',  'metal',    'stainless steel, baja antikarat, inox',  false, null),
  ('Lateks',     'other',    'latex, karet',                           true,  'A recognised allergen.'),
  ('SLS',        'chemical', 'sodium lauryl sulfate, sles',            true,  null),
  ('Paraben',    'chemical', 'methylparaben, propylparaben',           true,  null),
  ('Parfum',     'chemical', 'fragrance, perfume, pewangi, parfum',    true,  'Added fragrance is the commonest irritant in baby products.'),
  ('Alkohol',    'chemical', 'alcohol, ethanol, denatured alcohol',    true,  null)
on conflict (name) do nothing;
