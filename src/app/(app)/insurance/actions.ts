"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { number, text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import { savePolicy } from "@/server/services/hospitals";

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
