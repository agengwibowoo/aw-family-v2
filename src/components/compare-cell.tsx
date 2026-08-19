import Link from "next/link";

import { cn } from "@/lib/cn";
import { NOT_FILLED_IN } from "@/domain/status";
import { Chip } from "./chip";
import { LinkPending } from "./link-pending";

/**
 * Component 13 — comparison cell.
 *
 * Nothing below 13px, and no value below 14px. A blank renders the outline chip
 * and is tappable: filling it in starts here, so a gap in the comparison is an
 * invitation rather than a scold.
 *
 * A stale price carries "asked 4 months ago" on the value itself. No legend, no
 * colour.
 */
export function CompareCell({
  value,
  note,
  fillHref,
  mono,
  className,
}: {
  value?: React.ReactNode;
  note?: string;
  /** Where filling it in starts. A gap is an invitation, not a scold. */
  fillHref?: string;
  mono?: boolean;
  className?: string;
}) {
  const blank = value === null || value === undefined || value === "";

  if (blank) {
    const inner = <Chip tone="outline">{NOT_FILLED_IN}</Chip>;
    const box = cn("flex items-center px-[10px] py-[10px]", className);

    return fillHref ? (
      <Link href={fillHref} className={box}>
        {inner}
        <LinkPending />
      </Link>
    ) : (
      <div className={box}>{inner}</div>
    );
  }

  return (
    <div
      className={cn("flex flex-col justify-center px-[10px] py-[10px]", className)}
    >
      <span className={cn("text-[14px] font-medium", mono && "tabular")}>
        {value}
      </span>
      {note && <span className="text-ink3 mt-[2px] text-[13px]">{note}</span>}
    </div>
  );
}
