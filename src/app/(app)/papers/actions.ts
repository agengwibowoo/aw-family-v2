"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/server/auth";
import { setPaperStatus } from "@/server/services/papers";

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
