import { putDateBackAction } from "@/app/(app)/dates/actions";
import { readDateOff } from "@/server/saved";
import { ConfirmationCard, UNDO_BUTTON } from "./confirmation";
import { SubmitButton } from "./submit-button";

/**
 * The card left behind when a date comes off the list.
 *
 * Same shape as the one after a purchase and the one after a place, and for the
 * same reason: saying a date is not happening is an ordinary action with no
 * confirm dialog in front of it, so the way back has to be sitting there
 * afterwards for the full fifteen minutes.
 *
 * It is not the only way back. The screen of dates taken off offers the same
 * thing once the card has gone.
 */
export async function DateOffConfirmation() {
  const off = await readDateOff();
  if (!off) return null;

  return (
    <ConfirmationCard
      // The title stays in whatever language it was typed in.
      title={`Off the list — ${off.title}.`}
      sub="It's not happening. Its photos and its notes are still here."
      undo={
        <form action={putDateBackAction}>
          <input type="hidden" name="id" value={off.eventId} />
          <SubmitButton busyLabel="Undoing…" className={UNDO_BUTTON}>
            Undo
          </SubmitButton>
        </form>
      }
    />
  );
}
