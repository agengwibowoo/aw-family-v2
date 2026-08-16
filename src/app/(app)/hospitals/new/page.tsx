import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, TextInput } from "@/components/field";
import { requireApproved } from "@/server/auth";

import { addHospitalAction } from "../actions";

/**
 * A place can exist with a name. Everything else gets filled in over the
 * following week, from the detail screen, in any order.
 */
export default async function NewHospital() {
  await requireApproved("/hospitals/new");

  return (
    <form action={addHospitalAction}>
      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 text-[13px]">Where to give birth</p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Add a place
        </h1>
      </header>

      <div className="px-[18px]">
        <Card>
          <Field label="What's it called?">
            <TextInput name="name" placeholder="RS Pondok Indah" />
          </Field>
          <Field label="Where is it?" hint="You can leave this for now">
            <TextInput name="address" />
          </Field>
        </Card>
      </div>

      <BottomBar>
        <BarPrimary type="submit">Add it</BarPrimary>
        <BarSecondary href="/hospitals" width={126}>
          Cancel
        </BarSecondary>
      </BottomBar>
    </form>
  );
}
