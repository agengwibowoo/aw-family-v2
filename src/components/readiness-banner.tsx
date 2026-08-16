import { cn } from "@/lib/cn";
import { countOf } from "@/domain/status";
import { ProgressBar } from "./progress";

/**
 * Component 16 — readiness banner. The loudest component, and the only one
 * allowed to be.
 *
 * Ready is the app's single saturated surface. It exists so that one answer is
 * legible from arm's length, half asleep, in a car. Do not add a second.
 *
 * Not-ready uses an ink border, never red. Nothing here is an error; it is work
 * remaining, and a red banner at 3am helps nobody.
 */
export function ReadinessBanner({
  ready,
  headline,
  sub,
  have,
  need,
}: {
  ready: boolean;
  headline: string;
  sub?: string;
  have: number;
  need: number;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] px-[16px] py-[15px]",
        ready ? "bg-ac text-white" : "border-ink bg-sf border",
      )}
    >
      <p
        className={cn(
          "text-[26px] leading-[1.15] font-semibold tracking-[-0.02em]",
          ready && "text-white",
        )}
      >
        {headline}
      </p>
      {sub && (
        <p className={cn("mt-[6px] text-[13px]", ready ? "text-white/80" : "text-ink2")}>
          {sub}
        </p>
      )}
      {!ready && (
        <div className="mt-[14px]">
          <ProgressBar have={have} need={need} />
          <p className="tabular text-ink2 mt-[8px] text-[13px]">
            {countOf(have, need)}
          </p>
        </div>
      )}
    </div>
  );
}
