import Link from "next/link";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, Select, TextArea, TextInput } from "@/components/field";
import { Stepper } from "@/components/stepper";
import { requireApproved } from "@/server/auth";
import { listAgeBands } from "@/server/services/household";
import { listCategories, listPriorities } from "@/server/services/things";

import { addThingAction } from "../actions";

/**
 * S10 — A new thing we need.
 *
 * Four questions above the fold and everything else explicitly optional. A
 * thing can exist with a name and a number; nothing below the dashed line is
 * ever allowed to stop the save.
 *
 * The labels are questions in her words. "What age is it for?" rather than the
 * band, "What sort of thing?" rather than the category — she is describing a
 * need, not filling in a schema.
 */
export default async function NewThing({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  await requireApproved("/list/new");
  const { name } = await searchParams;

  const [categories, bands, priorities] = await Promise.all([
    listCategories(),
    listAgeBands(),
    listPriorities(),
  ]);

  return (
    <form action={addThingAction}>
      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
          A new thing we need
        </h1>
        <Link href="/list" className="text-ink2 shrink-0 text-[13px] font-semibold">
          Close
        </Link>
      </header>

      <div className="px-[18px] pb-[20px]">
        <Card>
          <Field label="What is it?">
            <TextInput
              name="name"
              defaultValue={name}
              placeholder="Bedong instan"
            />
          </Field>

          <Field label="How many do we need?">
            <Stepper name="targetQty" defaultValue={1} min={0} aria-label="How many we need" />
          </Field>

          <Field label="What sort of thing?">
            <Select
              name="categoryId"
              options={categories.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
          </Field>

          <Field label="What age is it for?">
            <Select
              name="ageBandId"
              options={bands.map((b) => ({
                value: String(b.id),
                label: b.name,
              }))}
            />
          </Field>

          <label className="flex min-h-[52px] items-center gap-[10px] py-[10px]">
            <input
              type="checkbox"
              name="giftable"
              className="h-[22px] w-[22px] shrink-0"
            />
            <span className="text-[14.5px]">
              Could family give this as a gift?
            </span>
          </label>
        </Card>

        <div className="border-ln2 mt-[13px] rounded-[14px] border border-dashed px-[16px] py-[15px]">
          <p className="text-[14px] font-semibold">
            Everything below is optional.
          </p>
          <p className="text-ink2 mt-[4px] text-[13px]">
            How important · brands and shops to try · notes
          </p>

          <Field label="How important is it?">
            <Select
              name="priorityId"
              options={priorities.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
            />
          </Field>
          <Field label="Brands worth trying">
            <TextInput name="brandSuggestions" />
          </Field>
          <Field label="Where to look">
            <TextInput name="storeSuggestions" />
          </Field>
          <Field label="Anything to remember">
            <TextArea
              name="notes"
              placeholder="Wide neck only — the narrow ones don't fit the steriliser."
            />
          </Field>
        </div>
      </div>

      <BottomBar>
        <BarPrimary type="submit">Save it</BarPrimary>
      </BottomBar>
    </form>
  );
}
