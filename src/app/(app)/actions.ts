"use server";

import { revalidatePath } from "next/cache";

import { text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import { dismissForNow } from "@/server/saved";

/**
 * "Later".
 *
 * Hides one card for seven days and promotes the next candidate. Later means
 * later, not never — a thing she still needs should ask again well before the
 * band it belongs to has gone past.
 */
export async function laterAction(formData: FormData) {
  await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  await dismissForNow(id);
  revalidatePath("/");
}
