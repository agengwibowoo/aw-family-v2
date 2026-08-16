import { cn } from "@/lib/cn";
import { NOT_FILLED_IN } from "@/domain/status";
import { Chip } from "./chip";

/**
 * Component 10 — key-value row.
 *
 * A blank is never a dash, never an empty cell, never N/A, never a 0 standing
 * in for unknown. It says "not filled in", written out, because a blank that
 * could be misread as "no" is a bug.
 */
export function KeyValue({
  label,
  value,
  mono,
  note,
  className,
}: {
  label: string;
  /** Null or undefined renders the blank, deliberately. */
  value?: React.ReactNode;
  mono?: boolean;
  /** e.g. "asked 4 months ago" — stated on the value, with no colour. */
  note?: string;
  className?: string;
}) {
  const blank = value === null || value === undefined || value === "";

  return (
    <div
      className={cn(
        "border-ln flex items-baseline justify-between gap-4 border-b py-[10px] last:border-b-0",
        className,
      )}
    >
      <span className="text-ink2 text-[14.5px]">{label}</span>
      <span className="flex flex-col items-end gap-[2px] text-right">
        {blank ? (
          <Chip tone="outline">{NOT_FILLED_IN}</Chip>
        ) : (
          <span
            className={cn(
              "text-[14.5px] font-medium",
              mono && "tabular",
            )}
          >
            {value}
          </span>
        )}
        {note && <span className="text-ink3 text-[12px]">{note}</span>}
      </span>
    </div>
  );
}
