/**
 * Takes the demo fixture away again.
 *
 * Only ever touches rows named `Demo · …`, so it cannot reach real data even
 * if it is run by accident after the catalog has been imported.
 *
 *   node scripts/clear-demo.mjs
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
const TAG = "Demo · %";

try {
  const doomed = await sql`select id from items where name like ${TAG}`;
  const ids = doomed.map((r) => r.id);

  if (ids.length > 0) {
    // item_units restricts deletion of the thing it is a unit of, so the
    // objects go before the need they were bought for.
    await sql`delete from item_units where item_id = any(${ids})`;
    await sql`delete from purchases where item_id = any(${ids})`;
    await sql`delete from items where id = any(${ids})`;
  }

  const dates = await sql`delete from schedule_events where title like ${TAG} returning id`;

  const left = await sql`select count(*)::int as n from items where name like ${TAG}`;
  if (left[0].n > 0) {
    console.error(`FAIL  ${left[0].n} demo things are still there`);
    process.exit(1);
  }

  console.log(`ok    removed ${ids.length} things and ${dates.length} dates`);
} finally {
  await sql.end();
}
