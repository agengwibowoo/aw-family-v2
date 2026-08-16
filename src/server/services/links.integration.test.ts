import assert from "node:assert/strict";
import { asc, eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, it } from "vitest";

import { db } from "../db";
import {
  ageBands,
  categories,
  itemMaterials,
  items,
  links,
  materials,
} from "../schema";
import { addLink, setThingMaterials } from "./links";
import { createThing, getThing } from "./things";

/**
 * Links and materials, against the real database.
 *
 * The rule worth proving is the dedupe: the same product shared twice from a
 * chat arrives as two different URLs, and a thing that collects four identical
 * "reviews" is a thing nobody scrolls. It is a partial unique index rather than
 * a check in the service, so a paste arriving over MCP obeys it too.
 */

const PREFIX = "ztest-";
const ACTOR = "00000000-0000-0000-0000-000000000000";
const created: string[] = [];

let categoryId = 0;
let bandId = 0;

beforeAll(async () => {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .orderBy(asc(categories.sortOrder))
    .limit(1);
  const [band] = await db
    .select({ id: ageBands.id })
    .from(ageBands)
    .orderBy(asc(ageBands.sortOrder))
    .limit(1);
  categoryId = cat.id;
  bandId = band.id;
});

afterAll(async () => {
  if (created.length > 0) {
    await db.delete(itemMaterials).where(inArray(itemMaterials.itemId, created));
    await db.delete(links).where(inArray(links.itemId, created));
    await db.delete(items).where(inArray(items.id, created));
  }

  // Recording an unknown material adds it to the lookup, which is reference
  // data the household shares. Leaving one behind makes `pnpm db:check` fail
  // on the materials count — which is exactly what it is there to catch.
  await db.delete(materials).where(like(materials.name, `${PREFIX}%`));

  const strays = await db
    .select({ name: materials.name })
    .from(materials)
    .where(like(materials.name, `${PREFIX}%`));
  assert.equal(strays.length, 0, "test materials were left in the lookup");
});

async function makeThing(name: string): Promise<string> {
  const id = await createThing(
    { name: `${PREFIX}${name}`, targetQty: 1, categoryId, ageBandId: bandId },
    ACTOR,
  );
  created.push(id);
  return id;
}

describe("links", () => {
  it("keeps one link when the same thing is shared twice", async () => {
    const id = await makeThing("links");

    // The same product, shared from two different chats.
    await addLink({ itemId: id }, "https://example.com/bottle?utm_source=wa", ACTOR);
    await addLink({ itemId: id }, "https://example.com/bottle?gclid=xyz", ACTOR);

    const rows = await db.select().from(links).where(eq(links.itemId, id));
    assert.equal(rows.length, 1, "one link, not two");
    assert.equal(rows[0].url, "https://example.com/bottle", "and it is clean");
  });

  it("saves a link even when no preview can be fetched", async () => {
    const id = await makeThing("no-preview");
    await addLink({ itemId: id }, "https://example.invalid/thing/wide-neck", ACTOR);

    const [row] = await db.select().from(links).where(eq(links.itemId, id));
    assert.ok(row, "losing the link would be worse than losing the preview");
    assert.equal(row.title, "wide neck", "with something readable on it");
  });

  it("keeps two genuinely different links", async () => {
    const id = await makeThing("two-links");
    await addLink({ itemId: id }, "https://example.com/a", ACTOR);
    await addLink({ itemId: id }, "https://example.com/b", ACTOR);

    const rows = await db.select().from(links).where(eq(links.itemId, id));
    assert.equal(rows.length, 2);
  });
});

describe("what it's made of", () => {
  it("records materials and replaces them wholesale", async () => {
    const id = await makeThing("materials");

    await setThingMaterials(id, ["Katun", "Silikon"]);
    let thing = await getThing(id);
    assert.deepEqual(
      thing!.materials.map((m) => m.name).sort(),
      ["Katun", "Silikon"],
    );

    await setThingMaterials(id, ["Katun"]);
    thing = await getThing(id);
    assert.deepEqual(thing!.materials.map((m) => m.name), ["Katun"]);
  });

  it("carries the irritant note without an alert of any kind", async () => {
    // A plain extra chip. This app records; a paediatrician concludes.
    const id = await makeThing("irritant");
    await setThingMaterials(id, ["Lateks"]);

    const thing = await getThing(id);
    const latex = thing!.materials.find((m) => m.name === "Lateks");
    assert.ok(latex);
    assert.equal(latex.commonlyIrritant, true);
  });

  it("accepts a material nobody has recorded before", async () => {
    const id = await makeThing("new-material");
    const invented = `${PREFIX}bahan`;

    await setThingMaterials(id, [invented]);
    const thing = await getThing(id);
    assert.ok(
      thing!.materials.some((m) => m.name === invented),
      "the vocabulary grows with the household",
    );
  });

  it("clears them without complaint", async () => {
    const id = await makeThing("no-materials");
    await setThingMaterials(id, ["Katun"]);
    await setThingMaterials(id, []);

    const thing = await getThing(id);
    assert.deepEqual(thing!.materials, []);
  });
});
