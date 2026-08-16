"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/server/auth";
import { setHospitalDocuments } from "@/server/services/hospitals";

export async function saveHospitalPapersAction(formData: FormData) {
  await requireApproved();
  const hospitalId = String(formData.get("hospitalId"));

  // Only the ticked ones. An unticked row is "they don't ask for it", which is
  // different from "nobody has checked" — the screen says which is which.
  const wanted = formData
    .getAll("documentId")
    .map((v) => Number(v))
    .filter((id) => formData.get(`want_${id}`) === "on")
    .map((id) => ({
      documentId: id,
      copiesRequired: Math.max(0, Number(formData.get(`copies_${id}`)) || 0),
      notes: null,
    }));

  await setHospitalDocuments(hospitalId, wanted);

  revalidatePath(`/hospitals/${hospitalId}`);
  revalidatePath("/papers");
  redirect(`/hospitals/${hospitalId}`);
}
