import { cn } from "@/lib/cn";
import { formatDayMonth, type PlainDate } from "@/domain/dates";

/**
 * Component 7 — date block.
 *
 * A fixed day and a period get different *shapes*, not different colours: one
 * number, or two numbers split by a rule. A period must never look like a fixed
 * appointment, because turning up on the wrong day is the failure this prevents.
 */

function parts(d: PlainDate) {
  const [day, month] = formatDayMonth(d).split(" ");
  return { day, month };
}

export function DateBlock({
  date,
  className,
}: {
  date: PlainDate;
  className?: string;
}) {
  const { day, month } = parts(date);
  return (
    <div
      className={cn(
        "bg-sf2 grid w-[46px] shrink-0 place-items-center rounded-[9px] py-[6px]",
        className,
      )}
    >
      <span className="tabular text-[18px] leading-none font-medium">{day}</span>
      <span className="text-ink2 mt-[3px] text-[10px] uppercase">{month}</span>
    </div>
  );
}

export function WindowBlock({
  from,
  to,
  className,
}: {
  from: PlainDate;
  to: PlainDate;
  className?: string;
}) {
  const a = parts(from);
  const b = parts(to);
  return (
    <div
      className={cn(
        "bg-sf2 grid w-[46px] shrink-0 place-items-center rounded-[9px] py-[6px]",
        className,
      )}
    >
      <span className="flex items-center gap-[4px]">
        <span className="tabular text-[15px] leading-none font-medium">
          {a.day}
        </span>
        <span aria-hidden className="bg-ln2 h-[13px] w-[1.5px] rounded-full" />
        <span className="tabular text-[15px] leading-none font-medium">
          {b.day}
        </span>
      </span>
      <span className="text-ink2 mt-[3px] text-[10px] uppercase">
        {a.month === b.month ? a.month : `${a.month}–${b.month}`}
      </span>
    </div>
  );
}
