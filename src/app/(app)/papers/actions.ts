"use server";

import { revalidatePath } from "next/cache";

import { text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import {
  acknowledgePapersChange,
  setPaperStatus,
} from "@/server/services/papers";

export async function toggleHaveAction(formData: FormData) {
  const user = await requireApproved();
  const documentId = Number(formData.get("documentId"));
  const have = formData.get("have") === "true";
  await setPaperStatus(documentId, { haveOriginal: have }, user.id);
  revalidatePath("/papers");
}

export async function setCopiesAction(formData: FormData) {
  const user = await requireApproved();
  const documentId = Number(formData.get("documentId"));
  const copies = Math.max(0, Number(formData.get("copies")) || 0);
  await setPaperStatus(documentId, { copiesMade: copies }, user.id);
  revalidatePath("/papers");
}

/**
 * The change has been read.
 *
 * From here the pack is scored against this place, so the banner goes. It is
 * the only thing on this screen that can be dismissed, and it is dismissed by
 * reading it rather than by agreeing to anything.
 */
export async function seenChangeAction(formData: FormData) {
  const user = await requireApproved();
  const hospitalId = text(formData.get("hospitalId"));
  if (!hospitalId) return;
  await acknowledgePapersChange(hospitalId, user.id);
  revalidatePath("/papers");
}
