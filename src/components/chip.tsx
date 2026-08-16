import { cn } from "@/lib/cn";

/**
 * Component 4 — status word chip.
 *
 * Every status is a word, never a colour. The variants carry emphasis, not
 * meaning: "More than enough" gets the same weight as "Got it", because ten of
 * six nappies is good news and nothing here is an error.
 */

export type ChipTone =
  | "quiet" // default — --sf2 fill
  | "solid" // .k — inverted, for Got it / Picked this one
  | "accent" // .a — accent tint, for Looking at it
  | "outline"; // .o — for not filled in / Ruled out / secondary controls

const TONES: Record<ChipTone, string> = {
  quiet: "bg-sf2 text-ink2",
  solid: "bg-ink text-bg",
  accent: "bg-acs text-acl",
  outline: "text-ink2 bg-transparent shadow-[inset_0_0_0_1px_var(--ln2)]",
};

export function Chip({
  children,
  tone = "quiet",
  className,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Never shrinks, truncates or wraps — a status word that has been cut
        // in half is worse than no status word.
        "inline-block shrink-0 whitespace-nowrap rounded-[7px] px-[9px] py-[4px] text-[12px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
