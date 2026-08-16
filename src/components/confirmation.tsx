import Link from "next/link";

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
export function ConfirmationCard({
  title,
  sub,
  onUndo,
  againHref,
  againLabel = "Add another",
}: {
  title: string;
  /** Offline this reads "Saved on your phone. It'll go up when you have signal." */
  sub?: string;
  onUndo?: () => void;
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
        <button
          type="button"
          onClick={onUndo}
          className="bg-sf border-ln2 text-ink min-h-[52px] shrink-0 basis-[104px] rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap"
        >
          Undo
        </button>
        {againHref && (
          <Link
            href={againHref}
            className="border-ac text-acl flex min-h-[52px] flex-1 items-center justify-center rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap"
          >
            {againLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
