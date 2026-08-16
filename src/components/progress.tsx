import { cn } from "@/lib/cn";
import { countOf } from "@/domain/status";

/**
 * Component 3 — progress bar.
 *
 * Always accompanied by a count in words, never a bare percentage. It measures
 * things rather than rupiah, which is why it still works with money hidden.
 */

export function ProgressBar({
  have,
  need,
  className,
}: {
  have: number;
  need: number;
  className?: string;
}) {
  const pct = need <= 0 ? 100 : Math.min(100, Math.round((have / need) * 100));
  return (
    <div
      className={cn("bg-sf2 h-[6px] w-full overflow-hidden rounded-[3px]", className)}
      role="progressbar"
      aria-valuenow={have}
      aria-valuemin={0}
      aria-valuemax={need}
      aria-valuetext={countOf(have, need)}
    >
      <div className="bg-ac h-full rounded-[3px]" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** The bar and its count, which are not separable. */
export function ProgressWithCount({
  label,
  have,
  need,
}: {
  label: string;
  have: number;
  need: number;
}) {
  return (
    <div>
      <div className="mb-[9px] flex items-baseline justify-between gap-3">
        <span className="text-[15.5px] font-medium tracking-[-0.005em]">
          {label}
        </span>
        <span className="tabular text-ink2 shrink-0">{countOf(have, need)}</span>
      </div>
      <ProgressBar have={have} need={need} />
    </div>
  );
}
