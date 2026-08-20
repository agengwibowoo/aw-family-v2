"use server";

import { revalidatePath } from "next/cache";

import { text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import {
  acknowledgePapersChange,
  paperName,
  setPaperStatus,
} from "@/server/services/papers";
import { attachScan, signUpload } from "@/server/services/scans";
import { forgetGotPaper, rememberGotPaper } from "@/server/saved";

/**
 * "We have it", and the way back from it.
 *
 * One tap either way, with no confirm in front of it — the card it leaves
 * behind is what takes it back, exactly as taking a place off the list does.
 * Only the ticking direction leaves a card: un-ticking *is* the way back, and a
 * card offering to undo the undo would be a loop.
 */
export async function toggleHaveAction(formData: FormData) {
  const user = await requireApproved();
  const documentId = Number(formData.get("documentId"));
  const have = formData.get("have") === "true";

  if (have) {
    // Read the name before the row leaves the missing list, so the card can say
    // which paper it was.
    const name = await paperName(documentId);
    await setPaperStatus(documentId, { haveOriginal: true }, user.id);
    if (name) await rememberGotPaper({ documentId, name });
  } else {
    await setPaperStatus(documentId, { haveOriginal: false }, user.id);
    await forgetGotPaper();
  }

  revalidatePath("/papers");
}

/**
 * Where the original actually lives.
 *
 * `text()` turns an emptied box into null rather than into an empty string, so
 * "nobody has said" stays distinguishable from "somebody said nothing".
 */
export async function setWhereKeptAction(formData: FormData) {
  const user = await requireApproved();
  const documentId = Number(formData.get("documentId"));
  await setPaperStatus(
    documentId,
    { whereKept: text(formData.get("whereKept")) },
    user.id,
  );
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

/**
 * Somewhere to put a photo of a paper.
 *
 * Returns null rather than throwing when storage is not set up yet: the papers
 * screen has to keep working without photos, because the words and the copy
 * counts are the part that matters at 3am.
 */
export async function signPaperScanAction(documentId: number, filename: string) {
  await requireApproved();
  try {
    const { path, url } = await signUpload({ kind: "paper", documentId }, filename);
    return { path, url };
  } catch {
    return null;
  }
}

export async function attachPaperScanAction(documentId: number, path: string) {
  const user = await requireApproved();
  await attachScan({ kind: "paper", documentId }, path, user.id);
  revalidatePath("/papers");
}
