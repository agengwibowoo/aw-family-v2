import Link from "next/link";
import { LinkPending } from "./link-pending";

/**
 * Component 15 — confirmation card with Undo.
 *
 * **Not a toast.** It survives navigation and stays for the full fifteen-minute
 * undo window.
 *
 * This is the app's only safety mechanism for a mis-tap. There are no "are you
 * sure" dialogs anywhere, which is what makes recording a purchase take three
 * seconds — and what makes this card non-optional on every path that saves.
 */
/** The Undo control's own styling, so a caller's form button matches. */
export const UNDO_BUTTON =
  "bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap";

export function ConfirmationCard({
  title,
  sub,
  undo,
  againHref,
  againLabel = "Add another",
}: {
  title: string;
  /** Offline this reads "Saved on your phone. It'll go up when you have signal." */
  sub?: string;
  /**
   * The Undo control. A slot rather than a callback because the card is
   * rendered by a server component: undoing is a form posting to an action,
   * and the fifteen-minute window is checked on the server where it cannot be
   * lied to.
   */
  undo?: React.ReactNode;
  againHref?: string;
  againLabel?: string;
}) {
  return (
    <div className="bg-acs border-ac rounded-[14px] border px-[16px] py-[15px]">
      <p className="text-acl text-[17.5px] font-semibold tracking-[-0.015em]">
        {title}
      </p>
      {sub && <p className="text-acl mt-[4px] text-[13px] opacity-80">{sub}</p>}
      <div className="mt-[14px] flex gap-[12px]">
        {undo && <div className="shrink-0 basis-[104px]">{undo}</div>}
        {againHref && (
          <Link
            href={againHref}
            className="border-ac text-acl flex min-h-[52px] flex-1 items-center justify-center rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap"
          >
            {againLabel}
            <LinkPending />
          </Link>
        )}
      </div>
    </div>
  );
}
