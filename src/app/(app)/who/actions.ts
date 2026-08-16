"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth";
import {
  approveMember,
  blockMember,
  unblockMember,
} from "@/server/services/members";

export async function approveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await approveMember(id, admin.id);
  revalidatePath("/who");
}

export async function blockAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await blockMember(id, admin.id);
  revalidatePath("/who");
}

export async function unblockAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await unblockMember(id, admin.id);
  revalidatePath("/who");
}
