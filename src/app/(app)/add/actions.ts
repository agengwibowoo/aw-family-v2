"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { count, number, text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import { recordPurchase, undoPurchase } from "@/server/services/purchases";
import { forgetSaved, rememberSaved } from "@/server/saved";

/**
 * The save behind "Add what we got".
 *
 * Three seconds, one hand. Both fields arrive pre-answered, so the only
 * required act is the tap on Save — and the price can never block it, which is
 * why nothing here validates the price beyond ignoring what it cannot read.
 */
export async function recordPurchaseAction(formData: FormData) {
  const user = await requireApproved();

  const itemId = text(formData.get("itemId"));
  if (!itemId) return;

  const qty = count(formData.get("qty"), { min: 1, fallback: 1 }) ?? 1;

  const saved = await recordPurchase(
    {
      itemId,
      qty,
      // Unreadable is the same as skipped. It is labelled "you can skip this".
      pricePerUnitIdr: number(formData.get("pricePerUnitIdr")),
      whereBought: text(formData.get("whereBought")),
      brand: text(formData.get("brand")),
    },
    user.id,
  );

  // The confirmation is not optional on either path, so it is remembered
  // before either redirect rather than by whichever screen we land on.
  await rememberSaved({
    purchaseId: saved.purchaseId,
    itemId: saved.itemId,
    name: saved.name,
    qty: saved.qty,
    have: saved.have,
    need: saved.need,
  });

  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath(`/list/${itemId}`);
  revalidatePath("/registry");

  // Where it lands depends on how she arrived. From a chat link there is no
  // history to go back to, so Today is the only screen that makes sense.
  const from = text(formData.get("from"));
  redirect(from === "link" ? "/" : `/list/${itemId}`);
}

/**
 * Undo, from inside the confirmation card where she is already looking.
 *
 * The service re-checks the fifteen-minute window against the row's own
 * timestamp; the cookie only says which row.
 */
export async function undoAction(formData: FormData) {
  const user = await requireApproved();
  const purchaseId = text(formData.get("purchaseId"));
  const itemId = text(formData.get("itemId"));

  if (purchaseId) await undoPurchase(purchaseId, user.id);
  await forgetSaved();

  revalidatePath("/");
  revalidatePath("/list");
  if (itemId) revalidatePath(`/list/${itemId}`);
  revalidatePath("/registry");
}

/** Read and done with. Dismissing the card does not undo anything. */
export async function clearSavedAction() {
  await requireApproved();
  await forgetSaved();
  revalidatePath("/");
}
