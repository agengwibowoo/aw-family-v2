"use server";

import { revalidatePath } from "next/cache";

import { getCaller } from "@/server/auth";
import { askAgain } from "@/server/services/members";

export async function askAgainAction() {
  const caller = await getCaller();
  if (caller.kind !== "pending") return;
  await askAgain(caller.user.id);
  revalidatePath("/sign-in");
}
