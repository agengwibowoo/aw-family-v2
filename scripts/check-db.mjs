/**
 * Reads the cloud database and reports what is actually there.
 *
 * Read-only by construction — it runs selects and nothing else. Migrations and
 * seeds are applied by a human in the dashboard; see CLAUDE.md.
 *
 *   node scripts/check-db.mjs
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

const EXPECTED_TABLES = 23;
const EXPECTED_BANDS = 7;

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
};

try {
  const [{ n: tables }] = await sql`
    select count(*)::int as n from information_schema.tables
    where table_schema = 'public'`;
  check("tables", tables, EXPECTED_TABLES);

  const bands = await sql`
    select name, age_from_months, age_to_months
    from age_bands order by sort_order`;
  check("age bands", bands.length, EXPECTED_BANDS);
  for (const b of bands) {
    console.log(
      `        ${b.name.padEnd(18)} [${b.age_from_months}, ${b.age_to_months ?? "∞"})`,
    );
  }

  for (const [table, expected] of [
    ["categories", 9],
    ["priorities", 3],
    ["documents", 9],
    ["materials", 14],
  ]) {
    const [{ n }] = await sql.unsafe(`select count(*)::int as n from ${table}`);
    check(table, n, expected);
  }

  // The generated column and the partial unique indexes are the invariants
  // that hold no matter who writes. Confirm they survived the paste.
  const [{ n: generated }] = await sql`
    select count(*)::int as n from information_schema.columns
    where table_name = 'items' and column_name = 'status'
      and is_generated = 'ALWAYS'`;
  check("items.status is generated", generated, 1);

  const [{ n: partial }] = await sql`
    select count(*)::int as n from pg_indexes
    where schemaname = 'public'
      and indexname in ('one_picked_per_item', 'one_picked_hospital')`;
  check("partial unique indexes", partial, 2);

  const [{ confdeltype }] = await sql`
    select confdeltype from pg_constraint
    where conname = 'item_units_item_id_items_id_fk'`;
  check("item_units.item_id on delete restrict", confdeltype, "r");
} finally {
  await sql.end();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
