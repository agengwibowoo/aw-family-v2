import Link from "next/link";

import { Card } from "./card";

/**
 * Component 2 — action card. Used only on Today.
 *
 * One sentence and one action. At most three of these, ranked deterministically
 * so "why is this here?" is answerable.
 */
export function ActionCard({
  title,
  reason,
  actionLabel,
  href,
  onLater,
}: {
  title: string;
  /** One line. Why this is in front of her right now. */
  reason: string;
  actionLabel: string;
  href: string;
  /** Omitted on the appointment card: a fact is not a task. */
  onLater?: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="text-[17.5px] font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <p className="text-ink2 mt-[4px] text-[13px]">{reason}</p>
      <div className="mt-[14px] flex gap-[12px]">
        <Link
          href={href}
          className="bg-ac flex min-h-[52px] flex-1 items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white"
        >
          {actionLabel}
        </Link>
        {onLater}
      </div>
    </Card>
  );
}

/** "Later" hides the card for 7 days and promotes the next candidate. */
export function LaterButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-ln2 text-ink2 min-h-[52px] shrink-0 basis-[84px] rounded-[11px] border text-[14.5px] font-medium whitespace-nowrap"
    >
      Later
    </button>
  );
}
