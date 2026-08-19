import { undoAction } from "@/app/(app)/add/actions";
import { readSaved } from "@/server/saved";
import { ConfirmationCard, UNDO_BUTTON } from "./confirmation";
import { SubmitButton } from "./submit-button";

/**
 * The confirmation card, wherever she landed.
 *
 * Not a toast. It is read from a cookie by whichever screen rendered next, so
 * it survives navigation and stays for the full fifteen-minute window — which
 * is the point, because it is the only way to take back a mis-tap and there
 * are no confirm dialogs anywhere in this app.
 *
 * Renders nothing when there is nothing to take back.
 */
export async function SavedConfirmation({ offline = false }: { offline?: boolean }) {
  const saved = await readSaved();
  if (!saved) return null;

  const noun = saved.qty === 1 ? "" : "s";

  return (
    <ConfirmationCard
      // "Got it — 2 more nappies." The name stays in whatever language it was
      // typed in; only the sentence around it is English.
      title={`Got it — ${saved.qty} more ${saved.name.toLowerCase()}${
        saved.name.endsWith("s") ? "" : noun
      }.`}
      sub={
        offline
          ? "Saved on your phone. It'll go up when you have signal."
          : `${saved.have} of ${saved.need} now.`
      }
      undo={
        <form action={undoAction}>
          <input type="hidden" name="purchaseId" value={saved.purchaseId} />
          <input type="hidden" name="itemId" value={saved.itemId} />
          <SubmitButton busyLabel="Undoing…" className={UNDO_BUTTON}>
            Undo
          </SubmitButton>
        </form>
      }
      againHref={`/add?thing=${saved.itemId}`}
    />
  );
}
