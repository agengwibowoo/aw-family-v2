/**
 * Proves the database refuses the things it is supposed to refuse.
 *
 * Everything runs inside one transaction that is always rolled back, so this is
 * safe against the real database and leaves nothing behind.
 *
 *   node scripts/verify-invariants.mjs
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

let failures = 0;

function ok(label, condition, detail = "") {
  if (!condition) failures += 1;
  console.log(`${condition ? "ok  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Asserts a statement is rejected by the database. */
async function rejects(tx, label, run) {
  try {
    await tx.savepoint(run);
    ok(label, false, "it was allowed");
  } catch (e) {
    ok(label, true, String(e.message).split("\n")[0].slice(0, 70));
  }
}

const ROLLBACK = Symbol("rollback");

try {
  await sql
    .begin(async (tx) => {
      const [child] = await tx`
        insert into children (due_date) values (date '2026-10-14') returning id`;
      const [cat] = await tx`select id from categories order by sort_order limit 1`;
      const [pri] = await tx`select id from priorities order by sort_order limit 1`;
      const [band] = await tx`select id from age_bands order by sort_order limit 1`;

      /* --- the generated status column, and the bug it replaces ----------- */

      const [partial] = await tx`
        insert into items (child_id, category_id, priority_id, age_band_id, name, target_qty, owned_qty)
        values (${child.id}, ${cat.id}, ${pri.id}, ${band.id}, 'Test partial', 5, 2)
        returning status`;
      ok(
        "2 of 5 is not reported as done",
        partial.status === "still_need",
        partial.status,
      );

      const [exact] = await tx`
        insert into items (child_id, category_id, priority_id, age_band_id, name, target_qty, owned_qty)
        values (${child.id}, ${cat.id}, ${pri.id}, ${band.id}, 'Test exact', 5, 5)
        returning status, id`;
      ok("5 of 5 is got_it", exact.status === "got_it", exact.status);

      const [over] = await tx`
        insert into items (child_id, category_id, priority_id, age_band_id, name, target_qty, owned_qty)
        values (${child.id}, ${cat.id}, ${pri.id}, ${band.id}, 'Test over', 6, 10)
        returning status`;
      ok(
        "10 of 6 is more_than_enough",
        over.status === "more_than_enough",
        over.status,
      );

      /* --- one picked candidate per thing --------------------------------- */

      await tx`insert into item_candidates (item_id, name, decision)
               values (${exact.id}, 'First', 'picked')`;
      await rejects(
        tx,
        "a second picked candidate is refused",
        (t) =>
          t`insert into item_candidates (item_id, name, decision)
             values (${exact.id}, 'Second', 'picked')`,
      );
      // Two candidates merely under consideration are fine.
      await tx`insert into item_candidates (item_id, name, decision)
               values (${exact.id}, 'Third', 'considering')`;
      await tx`insert into item_candidates (item_id, name, decision)
               values (${exact.id}, 'Fourth', 'considering')`;
      ok("several candidates may be under consideration", true);

      /* --- units are the count, and they outlive the thing ---------------- */

      const [unit] = await tx`
        insert into item_units (item_id, state) values (${exact.id}, 'ready')
        returning id`;
      await rejects(
        tx,
        "a thing with units cannot be deleted out from under them",
        (t) => t`delete from items where id = ${exact.id}`,
      );
      // A unit with no purchase behind it — a gift, a hand-me-down.
      ok("a unit can exist with no purchase", unit.id != null);

      /* --- one picked hospital, and ruling out needs a reason -------------- */

      await tx`insert into hospitals (name, decision) values ('Test A', 'picked')`;
      await rejects(
        tx,
        "a second picked hospital is refused",
        (t) => t`insert into hospitals (name, decision) values ('Test B', 'picked')`,
      );
      await rejects(
        tx,
        "ruling a hospital out without a reason is refused",
        (t) =>
          t`insert into hospitals (name, decision) values ('Test C', 'ruled_out')`,
      );
      // The papers pack follows the picked place and remembers which one it
      // was scored against. Taking that place off the list would re-score the
      // pack in silence, so Postgres refuses it and not just the service.
      await rejects(
        tx,
        "taking the picked hospital off the list is refused",
        (t) => t`update hospitals set removed_at = now() where decision = 'picked'`,
      );

      /* --- polymorphic parents: exactly one -------------------------------- */

      await rejects(
        tx,
        "a link with two parents is refused",
        (t) =>
          t`insert into links (item_id, candidate_id, url)
             values (${exact.id}, ${exact.id}, 'https://example.com')`,
      );
      await rejects(
        tx,
        "a link with no parent is refused",
        (t) => t`insert into links (url) values ('https://example.com')`,
      );

      /* --- an appointment or a window, never both --------------------------- */

      await rejects(
        tx,
        "an event that is both a time and a period is refused",
        (t) =>
          t`insert into schedule_events (type, title, starts_at, window_start, window_end)
             values ('antenatal', 'Both', now(), date '2026-09-10', date '2026-09-24')`,
      );
      await rejects(
        tx,
        "an event with neither a time nor a period is refused",
        (t) =>
          t`insert into schedule_events (type, title) values ('antenatal', 'Neither')`,
      );

      /* --- archiving is a pair -------------------------------------------- */

      await rejects(
        tx,
        "archiving without a reason is refused",
        (t) => t`update items set archived_at = now() where id = ${exact.id}`,
      );

      throw ROLLBACK;
    })
    .catch((e) => {
      if (e !== ROLLBACK) throw e;
    });
} finally {
  await sql.end();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll invariants hold. Nothing was written.");
