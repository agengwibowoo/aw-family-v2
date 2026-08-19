import { restoreHospitalAction } from "@/app/(app)/hospitals/actions";
import { readRemovedPlace } from "@/server/saved";
import { ConfirmationCard, UNDO_BUTTON } from "./confirmation";
import { SubmitButton } from "./submit-button";

/**
 * The card left behind when a place comes off the list.
 *
 * Same shape as the one after a purchase, and for the same reason: taking a
 * place off is an ordinary action with no confirm dialog in front of it, so the
 * way back has to be sitting there afterwards for the full fifteen minutes.
 *
 * It is not the only way back. The removed places screen offers the same thing
 * once the card has gone.
 */
export async function RemovedPlaceConfirmation() {
  const removed = await readRemovedPlace();
  if (!removed) return null;

  return (
    <ConfirmationCard
      // The name stays in whatever language it was typed in.
      title={`Removed — ${removed.name}.`}
      sub="It's off the list. Its prices and papers are still here."
      undo={
        <form action={restoreHospitalAction}>
          <input type="hidden" name="id" value={removed.hospitalId} />
          <SubmitButton busyLabel="Undoing…" className={UNDO_BUTTON}>
            Undo
          </SubmitButton>
        </form>
      }
    />
  );
}
