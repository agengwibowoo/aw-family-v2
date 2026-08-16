"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/server/auth";
import { savePolicy } from "@/server/services/hospitals";

const text = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const number = (v: FormDataEntryValue | null): number | null => {
  const s = text(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function savePolicyAction(formData: FormData) {
  const user = await requireApproved();

  await savePolicy(
    {
      insurerName: text(formData.get("insurerName")),
      policyNumber: text(formData.get("policyNumber")),
      policyStartedOn: text(formData.get("policyStartedOn")),
      maternityWaitingPeriodMonths: number(
        formData.get("maternityWaitingPeriodMonths"),
      ),
      maternityLimitNormalIdr: text(formData.get("maternityLimitNormalIdr")),
      maternityLimitCaesarIdr: text(formData.get("maternityLimitCaesarIdr")),
      roomEntitlement: text(formData.get("roomEntitlement")),
      coversNewbornFromDay: number(formData.get("coversNewbornFromDay")),
      excludedConditions: text(formData.get("excludedConditions")),
    },
    user.id,
  );

  // Every hospital's sentence is computed from this row.
  revalidatePath("/insurance");
  revalidatePath("/hospitals");
  revalidatePath("/hospitals/[id]", "page");
  redirect("/insurance");
}
