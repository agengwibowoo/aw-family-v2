import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, TextArea, TextInput } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import {
  formatTimeInHousehold,
  plainDateInHousehold,
} from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { getEvent } from "@/server/services/schedule";

import { addNoteAction, deleteEventAction, saveEventAction } from "../../actions";

/**
 * Changing a date, and writing down what happened.
 *
 * The note is one paragraph in her words rather than a set of fields: structure
 * here would be blank most of the time, and what the doctor actually said does
 * not fit a form.
 */
export default async function EditDate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/dates/${id}/edit`);

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <form action={saveEventAction}>
        <input type="hidden" name="id" value={id} />

        <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
          <div className="min-w-0">
            <p className="text-ink2 text-[13px]">{event.title}</p>
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              Change it
            </h1>
          </div>
          <Link
            href={`/dates/${id}`}
            className="text-ink2 shrink-0 text-[13px] font-semibold"
          >
            Close
          </Link>
        </header>

        <div className="px-[18px]">
          <Card>
            <Field label="What is it?">
              <TextInput name="title" defaultValue={event.title} />
            </Field>

            {event.startsAt && (
              <>
                <Field label="Which day?">
                  <TextInput
                    name="date"
                    type="date"
                    defaultValue={plainDateInHousehold(event.startsAt)}
                    mono
                  />
                </Field>
                <Field label="What time?">
                  <input
                    type="time"
                    name="time"
                    defaultValue={formatTimeInHousehold(event.startsAt)}
                    aria-label="What time"
                    className="bg-sf border-ln2 text-ink tabular min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                  />
                </Field>
              </>
            )}

            <Field label="Who are you seeing?">
              <TextInput name="practitioner" defaultValue={event.practitioner} />
            </Field>
            <Field label="Where?">
              <TextInput name="locationText" defaultValue={event.locationText} />
            </Field>
            <Field label="Anything to do before you go?">
              <TextArea name="prepNotes" defaultValue={event.prepNotes} />
            </Field>
            <Field label="Roughly what will it cost?" hint="Rupiah">
              <TextInput name="costIdr" defaultValue={event.costIdr} mono />
            </Field>
          </Card>
        </div>

        <BottomBar>
          <BarPrimary type="submit" busyLabel="Saving…">
            Save it
          </BarPrimary>
          <BarSecondary href={`/dates/${id}`} width={126}>
            Cancel
          </BarSecondary>
        </BottomBar>
      </form>

      <div className="px-[18px] pb-[20px]">
        <form action={addNoteAction}>
          <input type="hidden" name="id" value={id} />
          <Card>
            <Field
              label="What the doctor said"
              hint="One paragraph, in her words. No fields."
            >
              <TextArea
                name="outcomeNotes"
                defaultValue={event.outcomeNotes}
                placeholder="Growing well, 2.1 kg. Head down already. Iron tablets, one a day."
              />
            </Field>
            <SubmitButton
              busyLabel="Saving…"
              className="border-ln2 text-ink mt-[6px] min-h-[52px] w-full rounded-[11px] border text-[14.5px] font-medium"
            >
              Save the note
            </SubmitButton>
          </Card>
        </form>

        <form action={deleteEventAction} className="mt-[13px]">
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="text-ink2 text-[14.5px] font-medium underline underline-offset-2">
            This is not happening
          </SubmitButton>
          <p className="text-ink3 mt-[4px] text-[13px]">
            Takes it off the list for good.
          </p>
        </form>
      </div>
    </>
  );
}
