import { toggleHaveAction } from "@/app/(app)/papers/actions";
import { readGotPaper } from "@/server/saved";
import { ConfirmationCard, UNDO_BUTTON } from "./confirmation";
import { SubmitButton } from "./submit-button";

/**
 * The card left behind when a paper is ticked off.
 *
 * Same shape as the one after a purchase and the one after a place comes off
 * the list, and for the same reason: ticking a paper is an ordinary action with
 * no confirm dialog in front of it, so the way back has to be sitting there
 * afterwards for the full fifteen minutes.
 *
 * It is not the only way back. Opening the paper's own row in Ready offers the
 * same thing once the card has gone.
 */
export async function GotPaperConfirmation() {
  const got = await readGotPaper();
  if (!got) return null;

  return (
    <ConfirmationCard
      // The name stays in whatever language it was typed in.
      title={`Got it — ${got.name}.`}
      sub="It moved to Ready. Undo if that was a mis-tap."
      undo={
        <form action={toggleHaveAction}>
          <input type="hidden" name="documentId" value={got.documentId} />
          <input type="hidden" name="have" value="false" />
          <SubmitButton busyLabel="Undoing…" className={UNDO_BUTTON}>
            Undo
          </SubmitButton>
        </form>
      }
    />
  );
}
