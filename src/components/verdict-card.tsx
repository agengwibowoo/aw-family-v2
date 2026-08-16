import { cn } from "@/lib/cn";
import type { InsuranceVerdict } from "@/domain/insurance";
import { Card } from "./card";

/**
 * The computed insurance sentence.
 *
 * The single most consequential fact in the hospital decision, so it is the
 * first thing on the screen — above even the decision chip. It is three
 * sentences of plain English worked out from a start date and a waiting
 * period, never "policy started 3 Jun 2025 · wait 12 months" left for the
 * reader to subtract.
 *
 * The ink border is the loudest this is allowed to be. Not being covered is
 * not an error state, and there is no red in this app.
 */
export function VerdictCard({
  verdict,
  children,
  className,
}: {
  verdict: InsuranceVerdict;
  /** One more line of the same sentence — the policy screen adds the date
      cover begins. Anything longer belongs somewhere else on the screen. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-ink", className)}>
      <p className="text-[16.5px] font-medium tracking-[-0.01em]">
        {verdict.headline}
      </p>
      {verdict.reason && (
        <p className="text-ink2 mt-[6px] text-[13px]">{verdict.reason}</p>
      )}
      {verdict.consequence && (
        <p className="text-ink2 mt-[4px] text-[13px]">{verdict.consequence}</p>
      )}
      {children}
    </Card>
  );
}
