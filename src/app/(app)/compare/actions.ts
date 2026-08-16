"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import { setDecision } from "@/server/services/hospitals";

/**
 * Deciding, from the screen where the comparison is in front of you.
 *
 * Picking demotes whatever was picked before, in one transaction, and the
 * papers pack follows the picked place — so both paths refresh it.
 */
function refresh(id: string) {
  revalidatePath("/compare");
  revalidatePath("/hospitals");
  revalidatePath(`/hospitals/${id}`);
  revalidatePath("/papers");
}

export async function pickAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  await setDecision(id, "picked", user.id);
  refresh(id);
  // The decision was the point of the screen; the pack is what happens next.
  redirect("/papers");
}

export async function ruleOutAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  // A place is kept, never deleted, and the reason is what makes it possible
  // to reopen the decision later without redoing the research.
  await setDecision(
    id,
    "ruled_out",
    user.id,
    text(formData.get("reason")) ?? "Ruled out while comparing",
  );
  refresh(id);
}
