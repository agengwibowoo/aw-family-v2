"use server";

import { revalidatePath } from "next/cache";

import { number, text } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import {
  deleteInsurer,
  deleteQuote,
  upsertInsurer,
  upsertQuote,
} from "@/server/services/hospitals";

function refresh(hospitalId: string) {
  revalidatePath(`/hospitals/${hospitalId}/money`);
  revalidatePath(`/hospitals/${hospitalId}`);
  revalidatePath("/hospitals");
}

export async function addQuoteAction(formData: FormData) {
  await requireApproved();
  const hospitalId = String(formData.get("hospitalId"));
  const deliveryType = text(formData.get("deliveryType"));
  const roomClass = text(formData.get("roomClass"));
  if (!deliveryType || !roomClass) return;

  await upsertQuote({
    hospitalId,
    deliveryType,
    roomClass,
    priceIdr: text(formData.get("priceIdr")),
    nightsIncluded: number(formData.get("nightsIncluded")),
    includes: text(formData.get("includes")),
    excludes: text(formData.get("excludes")),
    source: text(formData.get("source")),
    // When they told you. Prices go stale and the screen says so after 60 days.
    quotedOn: text(formData.get("quotedOn")),
  });

  refresh(hospitalId);
}

export async function deleteQuoteAction(formData: FormData) {
  await requireApproved();
  await deleteQuote(String(formData.get("id")));
  refresh(String(formData.get("hospitalId")));
}

export async function addInsurerAction(formData: FormData) {
  await requireApproved();
  const hospitalId = String(formData.get("hospitalId"));
  const insurerName = text(formData.get("insurerName"));
  if (!insurerName) return;

  const accepted = text(formData.get("accepted"));

  await upsertInsurer({
    hospitalId,
    insurerName,
    accepted: accepted === "yes" ? true : accepted === "no" ? false : null,
    settlement: text(formData.get("settlement")),
    requiresPreauth: formData.get("requiresPreauth") === "on" ? true : null,
    preauthLeadDays: number(formData.get("preauthLeadDays")),
    notes: text(formData.get("notes")),
  });

  refresh(hospitalId);
}

export async function deleteInsurerAction(formData: FormData) {
  await requireApproved();
  await deleteInsurer(String(formData.get("id")));
  refresh(String(formData.get("hospitalId")));
}
