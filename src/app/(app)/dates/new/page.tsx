import Link from "next/link";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, Select, TextArea, TextInput } from "@/components/field";
import { todayInHousehold } from "@/domain/dates";
import { requireApproved } from "@/server/auth";

import { addEventAction } from "../actions";

/**
 * Something new in the diary.
 *
 * A fixed time or a period, and the form makes you choose by which pair of
 * fields you fill in rather than by a toggle labelled with the two words she
 * would have to learn. Postgres holds the same rule as a check constraint.
 */
export default async function NewDate() {
  await requireApproved("/dates/new");
  const today = todayInHousehold();

  return (
    <form action={addEventAction}>
      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
          Something new
        </h1>
        <Link href="/dates" className="text-ink2 shrink-0 text-[13px] font-semibold">
          Close
        </Link>
      </header>

      <div className="px-[18px] pb-[20px]">
        <Card>
          <Field label="What is it?">
            <TextInput name="title" placeholder="Kontrol kandungan" />
          </Field>

          <Field label="What sort of thing is it?">
            <Select
              name="type"
              options={[
                { value: "antenatal", label: "A check-up" },
                { value: "lab", label: "A test" },
                { value: "class", label: "A class" },
                { value: "hospital", label: "Something at the hospital" },
                { value: "immunisation", label: "An immunisation" },
                { value: "paediatric", label: "The baby's doctor" },
                { value: "postpartum", label: "After the birth" },
                { value: "other", label: "Something else" },
              ]}
            />
          </Field>
        </Card>

        <Card className="mt-[13px]">
          <p className="text-[14px] font-semibold">
            If it is at a fixed time
          </p>
          <Field label="Which day?">
            <TextInput name="date" type="date" defaultValue={today} mono />
          </Field>
          <Field label="What time?">
            <input
              type="time"
              name="time"
              defaultValue="09:00"
              aria-label="What time"
              className="bg-sf border-ln2 text-ink tabular min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
            />
          </Field>
        </Card>

        <Card className="mt-[13px]">
          <p className="text-[14px] font-semibold">
            Or if any day in a period will do
          </p>
          <p className="text-ink2 mt-[4px] text-[13px]">
            Fill these two in instead, and the fixed day above is ignored.
            Immunisations work this way.
          </p>
          <Field label="From">
            <TextInput name="windowStart" type="date" mono />
          </Field>
          <Field label="To">
            <TextInput name="windowEnd" type="date" mono />
          </Field>
        </Card>

        <div className="border-ln2 mt-[13px] rounded-[14px] border border-dashed px-[16px] py-[15px]">
          <p className="text-[14px] font-semibold">
            Everything below is optional.
          </p>
          <Field label="Who are you seeing?">
            <TextInput name="practitioner" placeholder="dr. Sari" />
          </Field>
          <Field label="Where?">
            <TextInput name="locationText" placeholder="RS Bunda Menteng" />
          </Field>
          <Field label="Anything to do before you go?">
            <TextArea
              name="prepNotes"
              placeholder="Nothing to eat for 8 hours. Water is fine."
            />
          </Field>
          <Field label="Roughly what will it cost?" hint="Rupiah">
            <TextInput name="costIdr" mono />
          </Field>
        </div>
      </div>

      <BottomBar>
        <BarPrimary type="submit">Save it</BarPrimary>
      </BottomBar>
    </form>
  );
}
