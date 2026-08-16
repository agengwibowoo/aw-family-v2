import { cn } from "@/lib/cn";
import { NOT_FILLED_IN } from "@/domain/status";
import { Chip } from "./chip";

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
  onFill,
  mono,
  className,
}: {
  value?: React.ReactNode;
  note?: string;
  onFill?: () => void;
  mono?: boolean;
  className?: string;
}) {
  const blank = value === null || value === undefined || value === "";

  if (blank) {
    return (
      <button
        type="button"
        onClick={onFill}
        className={cn("flex items-center px-[10px] py-[10px]", className)}
      >
        <Chip tone="outline">{NOT_FILLED_IN}</Chip>
      </button>
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
