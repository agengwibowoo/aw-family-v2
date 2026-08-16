import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, Select, TextArea, TextInput } from "@/components/field";
import { Stepper } from "@/components/stepper";
import { requireApproved } from "@/server/auth";
import { listAgeBands } from "@/server/services/household";
import {
  getThing,
  listCategories,
  listPriorities,
} from "@/server/services/things";

import {
  archiveThingAction,
  saveThingAction,
  unarchiveThingAction,
} from "../../actions";

/**
 * Changing a thing.
 *
 * The same four questions as adding one. "Don't need any more" lives here as
 * an ordinary action — it is not destructive and it is not behind a confirm,
 * because archiving keeps everything and there are no confirm dialogs anywhere
 * in this app.
 */
export default async function EditThing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/list/${id}/edit`);

  const [data, categories, bands, priorities] = await Promise.all([
    getThing(id),
    listCategories(),
    listAgeBands(),
    listPriorities(),
  ]);
  if (!data) notFound();

  const { thing, detail } = data;

  return (
    <>
      <form action={saveThingAction}>
        <input type="hidden" name="id" value={id} />

        <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
          <div className="min-w-0">
            <p className="text-ink2 text-[13px]">{thing.name}</p>
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              Change this
            </h1>
          </div>
          <Link
            href={`/list/${id}`}
            className="text-ink2 shrink-0 text-[13px] font-semibold"
          >
            Close
          </Link>
        </header>

        <div className="px-[18px] pb-[20px]">
          <Card>
            <Field label="What is it?">
              <TextInput name="name" defaultValue={thing.name} />
            </Field>

            <Field label="How many do we need?">
              <Stepper
                name="targetQty"
                defaultValue={thing.need}
                min={0}
                aria-label="How many we need"
              />
            </Field>

            <Field label="What sort of thing?">
              <Select
                name="categoryId"
                defaultValue={String(detail.categoryId)}
                options={categories.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
            </Field>

            <Field label="What age is it for?">
              <Select
                name="ageBandId"
                defaultValue={String(thing.bandId)}
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
                defaultChecked={thing.giftable}
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

            <Field label="How important is it?">
              <Select
                name="priorityId"
                defaultValue={String(detail.priorityId)}
                options={priorities.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                }))}
              />
            </Field>
            <Field label="Brands worth trying">
              <TextInput
                name="brandSuggestions"
                defaultValue={detail.brandSuggestions}
              />
            </Field>
            <Field label="Where to look">
              <TextInput
                name="storeSuggestions"
                defaultValue={detail.storeSuggestions}
              />
            </Field>
            <Field label="Anything to remember">
              <TextArea name="notes" defaultValue={detail.notes} />
            </Field>
          </div>
        </div>

        <BottomBar>
          <BarPrimary type="submit">Save it</BarPrimary>
          <BarSecondary href={`/list/${id}`} width={126}>
            Cancel
          </BarSecondary>
        </BottomBar>
      </form>

      {/* An ordinary action. Not destructive, and not behind a confirm. */}
      <div className="px-[18px] pb-[20px]">
        {detail.archivedAt ? (
          <form action={unarchiveThingAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="text-acl text-[14.5px] font-medium underline underline-offset-2"
            >
              We need these again
            </button>
          </form>
        ) : (
          <form action={archiveThingAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="reason" value="not_needed" />
            <button
              type="submit"
              className="text-ink2 text-[14.5px] font-medium underline underline-offset-2"
            >
              We don&rsquo;t need any more of these
            </button>
            <p className="text-ink3 mt-[4px] text-[13px]">
              It leaves the list and the counts. Nothing is deleted.
            </p>
          </form>
        )}
      </div>
    </>
  );
}
