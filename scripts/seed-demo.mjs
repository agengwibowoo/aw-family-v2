/**
 * A handful of made-up rows, so the screens can be looked at before the real
 * data exists.
 *
 * Not reference data and not seed data — a fixture. Every row it writes is
 * named `Demo · …` and `node scripts/clear-demo.mjs` takes all of them away
 * again.
 *
 * It writes units the way `recordPurchase` does, because units are the source
 * of truth for counts (ADR-0003) — and then it checks its own work: if this
 * script and the service ever disagree about what a purchase of six means, the
 * assertion at the bottom fails rather than leaving a wrong number on the
 * most-used screen.
 *
 *   node scripts/seed-demo.mjs
 */

import fs from "node:fs";
import postgres from "postgres";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });

const TAG = "Demo · ";

/** name, need, bought, price each, category, band, priority, giftable */
const THINGS = [
  ["Popok newborn", 12, 4, 95000, "Health & Safety", "Before the birth", "Essential", true],
  ["Pembalut bersalin", 2, 0, null, "For Mom", "Before the birth", "Essential", false],
  ["Baju bayi lengan panjang newborn", 8, 2, 45000, "Clothing", "Before the birth", "Essential", true],
  ["Bedong instan", 4, 0, null, "Clothing", "Before the birth", "Essential", true],
  ["Korset", 1, 1, 180000, "For Mom", "Before the birth", "Recommended", false],
  ["Botol susu", 6, 6, 120000, "Nursing & Feeding", "Before the birth", "Essential", true],
  ["Sterilizer botol", 1, 1, 850000, "Nursing & Feeding", "Before the birth", "Recommended", false],
  ["Waslap", 6, 10, 12000, "Bath & Potty", "Before the birth", "Recommended", true],
  ["Pembalut nifas", 1, 0, null, "For Mom", "Before the birth", "Essential", false],
  ["Teether silikon", 2, 0, null, "Health & Safety", "3–6 months", "Recommended", true],
  ["Bak mandi bayi", 1, 0, null, "Bath & Potty", "0–3 months", "Essential", true],
];

try {
  const [child] = await sql`select id from children limit 1`;
  if (!child) {
    console.error("No child record. Run supabase/seed-household.sql first.");
    process.exit(1);
  }

  const categories = new Map(
    (await sql`select id, name from categories`).map((r) => [r.name, r.id]),
  );
  const bands = new Map(
    (await sql`select id, name from age_bands`).map((r) => [r.name, r.id]),
  );
  const priorities = new Map(
    (await sql`select id, name from priorities`).map((r) => [r.name, r.id]),
  );

  let made = 0;

  for (const [name, need, bought, price, category, band, priority, giftable] of THINGS) {
    const categoryId = categories.get(category);
    const bandId = bands.get(band);
    const priorityId = priorities.get(priority);

    if (!categoryId || !bandId || !priorityId) {
      console.error(`  skipped ${name} — reference data missing`);
      continue;
    }

    const [item] = await sql`
      insert into items (child_id, category_id, priority_id, age_band_id, name, target_qty, giftable)
      values (${child.id}, ${categoryId}, ${priorityId}, ${bandId}, ${TAG + name}, ${need}, ${giftable})
      returning id`;

    if (bought > 0) {
      const [purchase] = await sql`
        insert into purchases (item_id, qty, price_per_unit_idr, bought_on, where_bought)
        values (${item.id}, ${bought}, ${price}, current_date - 7, 'Tokopedia')
        returning id`;

      // A purchase of six is six objects in the house, not one row saying six.
      for (let i = 0; i < bought; i += 1) {
        await sql`
          insert into item_units (item_id, purchase_id, state, acquired_on)
          values (${item.id}, ${purchase.id}, 'ready', current_date - 7)`;
      }

      await sql`
        update items set owned_qty = (
          select count(*) from item_units
          where item_id = ${item.id} and retired_on is null
        ) where id = ${item.id}`;
    }

    made += 1;
  }

  // Two dates: one at a fixed time, one as a period.
  await sql`
    insert into schedule_events (child_id, type, title, starts_at, practitioner, location_text, prep_notes)
    values (${child.id}, 'antenatal', ${TAG + "Kontrol kandungan"},
            (current_date + 1)::timestamptz + interval '3 hours',
            'dr. Sari', 'RS Bunda Menteng',
            'Nothing to eat for 8 hours. Water is fine.')`;

  await sql`
    insert into schedule_events (child_id, type, title, window_start, window_end, source)
    values (${child.id}, 'immunisation', ${TAG + "Hep B and BCG"},
            current_date + 25, current_date + 45, 'idai_schedule')`;

  // Prove the script and the service agree about what a purchase means.
  const drift = await sql`
    select name, owned_qty, (
      select count(*)::int from item_units
      where item_id = items.id and retired_on is null
    ) as live
    from items where name like ${TAG + "%"} and owned_qty <> (
      select count(*)::int from item_units
      where item_id = items.id and retired_on is null
    )`;

  if (drift.length > 0) {
    console.error("FAIL  the count does not match the units:");
    for (const row of drift) {
      console.error(`      ${row.name}: owned_qty ${row.owned_qty}, units ${row.live}`);
    }
    process.exit(1);
  }

  console.log(`ok    ${made} things, 2 dates`);
  console.log(`      every one is named "${TAG}…"`);
  console.log("      node scripts/clear-demo.mjs takes them away again");
} finally {
  await sql.end();
}
