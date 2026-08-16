"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { number, oneOf, text } from "@/lib/form";
import { instantFromHouseholdTime } from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import {
  createAntenatalSeries,
  createEvent,
  deleteEvent,
  markDone,
  setWindowDay,
  updateEvent,
} from "@/server/services/schedule";

const TYPES = [
  "antenatal",
  "lab",
  "class",
  "hospital",
  "immunisation",
  "paediatric",
  "postpartum",
  "other",
] as const;

function refresh(id?: string) {
  revalidatePath("/dates");
  revalidatePath("/");
  if (id) revalidatePath(`/dates/${id}`);
}

export async function addEventAction(formData: FormData) {
  const user = await requireApproved();

  const title = text(formData.get("title"));
  const type = oneOf(formData.get("type"), TYPES) ?? "other";
  if (!title) return;

  const date = text(formData.get("date"));
  const time = text(formData.get("time"));
  const windowStart = text(formData.get("windowStart"));
  const windowEnd = text(formData.get("windowEnd"));

  // A period or a time, never both. The check constraint says so too, but a
  // half-filled form should not reach it as a database error.
  const isWindow = !!windowStart && !!windowEnd;
  if (!isWindow && !date) return;

  const id = await createEvent(
    {
      type,
      title,
      startsAt: isWindow ? null : instantFromHouseholdTime(date!, time ?? "09:00"),
      windowStart: isWindow ? windowStart : null,
      windowEnd: isWindow ? windowEnd : null,
      locationText: text(formData.get("locationText")),
      practitioner: text(formData.get("practitioner")),
      prepNotes: text(formData.get("prepNotes")),
      costIdr: number(formData.get("costIdr")),
    },
    user.id,
  );

  refresh(id);
  redirect(`/dates/${id}`);
}

export async function saveEventAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  const date = text(formData.get("date"));
  const time = text(formData.get("time"));
  const title = text(formData.get("title"));

  await updateEvent(
    id,
    {
      ...(title ? { title } : {}),
      ...(date ? { startsAt: instantFromHouseholdTime(date, time ?? "09:00") } : {}),
      locationText: text(formData.get("locationText")),
      practitioner: text(formData.get("practitioner")),
      prepNotes: text(formData.get("prepNotes")),
      costIdr: number(formData.get("costIdr")),
    },
    user.id,
  );

  refresh(id);
  redirect(`/dates/${id}`);
}

/** One of the two honest endings. */
export async function markDoneAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;
  await markDone(id, text(formData.get("outcomeNotes")), user.id);
  refresh(id);
}

/** The other one: a period that now has a day. */
export async function setDayAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  const date = text(formData.get("date"));
  if (!id || !date) return;

  await setWindowDay(
    id,
    instantFromHouseholdTime(date, text(formData.get("time")) ?? "09:00"),
    user.id,
  );
  refresh(id);
}

export async function addNoteAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;
  await updateEvent(id, { outcomeNotes: text(formData.get("outcomeNotes")) }, user.id);
  refresh(id);
}

export async function deleteEventAction(formData: FormData) {
  await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;
  await deleteEvent(id);
  refresh();
  redirect("/dates");
}

/** Fifteen appointments in one tap, from the due date. */
export async function createSeriesAction() {
  const user = await requireApproved();
  await createAntenatalSeries(user.id);
  refresh();
}
