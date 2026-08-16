"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkbox, count, number, oneOf, text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import {
  archiveThing,
  createCandidate,
  createThing,
  setCandidateDecision,
  unarchiveThing,
  updateThing,
} from "@/server/services/things";

function refresh(id?: string) {
  revalidatePath("/list");
  revalidatePath("/find");
  revalidatePath("/registry");
  revalidatePath("/");
  if (id) revalidatePath(`/list/${id}`);
}

/**
 * A thing can exist with a name and a number.
 *
 * Everything else on the form is explicitly optional, so nothing else is
 * allowed to stop the save.
 */
export async function addThingAction(formData: FormData) {
  const user = await requireApproved();

  const name = text(formData.get("name"));
  const categoryId = number(formData.get("categoryId"));
  const ageBandId = number(formData.get("ageBandId"));
  if (!name || categoryId === null || ageBandId === null) return;

  const id = await createThing(
    {
      name,
      targetQty: count(formData.get("targetQty"), { min: 0, fallback: 1 }) ?? 1,
      categoryId,
      ageBandId,
      priorityId: number(formData.get("priorityId")) ?? undefined,
      giftable: checkbox(formData.get("giftable")),
      notes: text(formData.get("notes")),
      brandSuggestions: text(formData.get("brandSuggestions")),
      storeSuggestions: text(formData.get("storeSuggestions")),
    },
    user.id,
  );

  refresh(id);
  redirect(`/list/${id}`);
}

export async function saveThingAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  const name = text(formData.get("name"));
  await updateThing(
    id,
    {
      ...(name ? { name } : {}),
      targetQty: count(formData.get("targetQty"), { min: 0, fallback: 1 }) ?? 1,
      categoryId: number(formData.get("categoryId")) ?? undefined,
      ageBandId: number(formData.get("ageBandId")) ?? undefined,
      priorityId: number(formData.get("priorityId")) ?? undefined,
      giftable: checkbox(formData.get("giftable")),
      notes: text(formData.get("notes")),
      brandSuggestions: text(formData.get("brandSuggestions")),
      storeSuggestions: text(formData.get("storeSuggestions")),
    },
    user.id,
  );

  refresh(id);
  redirect(`/list/${id}`);
}

/**
 * "Don't need any more."
 *
 * An ordinary action, not a destructive one behind a confirm. It leaves the
 * counts and the default list and keeps everything it ever knew.
 */
export async function archiveThingAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  const reason =
    oneOf(formData.get("reason"), [
      "outgrown",
      "superseded",
      "not_needed",
    ] as const) ?? "not_needed";

  await archiveThing(id, reason, user.id);
  refresh(id);
  redirect(`/list/${id}`);
}

export async function unarchiveThingAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;
  await unarchiveThing(id, user.id);
  refresh(id);
  redirect(`/list/${id}`);
}

/** One of the ones we're looking at. */
export async function addCandidateAction(formData: FormData) {
  const user = await requireApproved();
  const itemId = text(formData.get("itemId"));
  if (!itemId) return;

  await createCandidate(
    {
      itemId,
      brand: text(formData.get("brand")),
      name: text(formData.get("name")),
      whereToBuy: text(formData.get("whereToBuy")),
      link: text(formData.get("link")),
      estPriceIdr: number(formData.get("estPriceIdr")),
      notes: text(formData.get("notes")),
    },
    user.id,
  );

  refresh(itemId);
  redirect(`/list/${itemId}`);
}

export async function setCandidateDecisionAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  const itemId = text(formData.get("itemId"));
  const decision = oneOf(formData.get("decision"), [
    "considering",
    "picked",
    "ruled_out",
  ] as const);
  if (!id || !decision) return;

  await setCandidateDecision(id, decision, user.id, text(formData.get("reason")));
  refresh(itemId ?? undefined);
}
