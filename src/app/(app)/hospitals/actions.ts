"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { number, text, tristate } from "@/lib/form";
import { requireApproved } from "@/server/auth";
import {
  createHospital,
  setDecision,
  updateHospital,
} from "@/server/services/hospitals";

export async function addHospitalAction(formData: FormData) {
  const user = await requireApproved();
  const name = text(formData.get("name"));
  if (!name) return;

  const id = await createHospital(
    { name, address: text(formData.get("address")) },
    user.id,
  );
  redirect(`/hospitals/${id}`);
}

export async function saveHospitalAction(formData: FormData) {
  const user = await requireApproved();
  const id = String(formData.get("id"));

  await updateHospital(
    id,
    {
      name: text(formData.get("name")) ?? undefined,
      type: text(formData.get("type")),
      address: text(formData.get("address")),
      mapsUrl: text(formData.get("mapsUrl")),
      phone: text(formData.get("phone")),
      whatsapp: text(formData.get("whatsapp")),
      website: text(formData.get("website")),
      instagram: text(formData.get("instagram")),

      distanceKm: text(formData.get("distanceKm")),
      driveMinutesNormal: number(formData.get("driveMinutesNormal")),
      driveMinutesPeak: number(formData.get("driveMinutesPeak")),
      hasIgd24h: tristate(formData.get("hasIgd24h")),

      hasNicu: tristate(formData.get("hasNicu")),
      nicuLevel: text(formData.get("nicuLevel")),
      supportsImd: tristate(formData.get("supportsImd")),
      roomingIn: tristate(formData.get("roomingIn")),
      hasLactationConsultant: tristate(formData.get("hasLactationConsultant")),

      allowsHusbandInRoom: tristate(formData.get("allowsHusbandInRoom")),
      allowsPhotographer: tristate(formData.get("allowsPhotographer")),

      depositIdr: text(formData.get("depositIdr")),
      notes: text(formData.get("notes")),
    },
    user.id,
  );

  revalidatePath(`/hospitals/${id}`);
  redirect(`/hospitals/${id}`);
}

export async function setDecisionAction(formData: FormData) {
  const user = await requireApproved();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as
    | "shortlisted"
    | "picked"
    | "ruled_out";

  await setDecision(id, decision, user.id, text(formData.get("reason")));

  revalidatePath("/hospitals");
  revalidatePath(`/hospitals/${id}`);
  // The papers pack is generated from whichever place is picked.
  revalidatePath("/papers");
}
