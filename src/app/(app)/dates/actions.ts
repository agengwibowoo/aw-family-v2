"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { number, oneOf, text } from "@/lib/form";
import { instantFromHouseholdTime } from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { forgetDateOff, rememberDateOff } from "@/server/saved";
import {
  createAntenatalSeries,
  createEvent,
  getEvent,
  markDone,
  putEventBack,
  setWindowDay,
  takeEventOff,
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

/** Every screen that lists, counts or archives a date. */
function refresh(id?: string) {
  revalidatePath("/dates");
  revalidatePath("/dates/past");
  revalidatePath("/dates/off");
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

/**
 * Changing one.
 *
 * The form renders whichever pair of when-fields matches the shape the date
 * already has, so exactly one arrives here. Turning a period into a fixed day
 * is not this — that is `setDayAction`, which is the affordance the screen
 * offers. A date has a time or a period, never both and never neither, and
 * `shapeOf` throws rather than let a half-filled form become a database error.
 */
export async function saveEventAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  const date = text(formData.get("date"));
  const time = text(formData.get("time"));
  const title = text(formData.get("title"));
  const type = oneOf(formData.get("type"), TYPES);

  const windowStart = text(formData.get("windowStart"));
  const windowEnd = text(formData.get("windowEnd"));
  const isWindow = !!windowStart && !!windowEnd;

  await updateEvent(
    id,
    {
      ...(title ? { title } : {}),
      ...(type ? { type } : {}),
      ...(isWindow ? { windowStart, windowEnd } : {}),
      ...(!isWindow && date
        ? { startsAt: instantFromHouseholdTime(date, time ?? "09:00") }
        : {}),
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

/**
 * "This is not happening."
 *
 * An ordinary action, not a destructive one behind a confirm — the card it
 * leaves behind on the way out is what takes it back.
 */
export async function takeDateOffAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  // Read the title before the row leaves the lists, so the card can say which
  // date it was.
  const found = await getEvent(id);
  if (!found) return;

  await takeEventOff(id, user.id);
  await rememberDateOff({ eventId: id, title: found.title });

  refresh(id);
  redirect("/dates");
}

export async function putDateBackAction(formData: FormData) {
  const user = await requireApproved();
  const id = text(formData.get("id"));
  if (!id) return;

  await putEventBack(id, user.id);
  await forgetDateOff();

  refresh(id);
  redirect(`/dates/${id}`);
}

/** Fifteen appointments in one tap, from the due date. */
export async function createSeriesAction() {
  const user = await requireApproved();
  await createAntenatalSeries(user.id);
  refresh();
}
