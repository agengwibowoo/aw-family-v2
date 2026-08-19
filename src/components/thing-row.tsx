import Link from "next/link";

import { cn } from "@/lib/cn";
import { countOf, ITEM_STATUS_WORDS, type ItemStatus } from "@/domain/status";
import { Chip, type ChipTone } from "./chip";
import { LinkPending } from "./link-pending";

/**
 * Component 1 — the row for one thing.
 *
 * Three facts and nothing else: the name, `have of need`, one status word.
 * Gift eligibility is a phrase in the meta line, not a badge column.
 *
 * Counts are mono so `4 of 12`, `10 of 6` and `0 of 2` align down the column
 * and can be scanned without being read.
 */

const TONE: Record<ItemStatus, ChipTone> = {
  still_need: "quiet",
  got_it: "solid",
  more_than_enough: "quiet",
};

export function ThingRow({
  name,
  have,
  need,
  status,
  giftable,
  href,
}: {
  name: string;
  have: number;
  need: number;
  status: ItemStatus;
  giftable?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0",
        "min-h-[52px]",
      )}
    >
      <span className="flex min-w-0 flex-col gap-[2px]">
        {/* The name is data. It stays in whatever language it was typed in. */}
        <span className="text-[15.5px] font-medium tracking-[-0.005em]">
          {name}
        </span>
        <span className="text-ink2 text-[13px]">
          <span className="tabular">{countOf(have, need)}</span>
          {giftable && " · could be a gift"}
        </span>
      </span>
      {/* Never shrinks, truncates or wraps, however long the name is. */}
      <Chip tone={TONE[status]}>{ITEM_STATUS_WORDS[status]}</Chip>
      <LinkPending />
    </Link>
  );
}
