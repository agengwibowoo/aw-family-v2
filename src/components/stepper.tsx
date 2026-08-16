"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * How many.
 *
 * Sized for one hand at the bottom of the screen: on "Add what we got" the
 * buttons are 68px and the count is 30px, because that screen is used standing
 * up, one-handed, with the thumb never leaving the bottom third. On a form
 * where she is already typing, 52px is enough.
 *
 * The value rides in a hidden input so the surrounding form stays an ordinary
 * uncontrolled form — nothing here needs to know about the rest of it.
 */
export function Stepper({
  name,
  defaultValue = 1,
  min = 0,
  size = "form",
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue?: number;
  /** 1 on "Add what we got": you cannot have got none of something. */
  min?: number;
  size?: "form" | "large";
  "aria-label"?: string;
}) {
  const [value, setValue] = useState(Math.max(min, defaultValue));
  const large = size === "large";

  const button = cn(
    "border-ln2 text-ink shrink-0 rounded-[11px] border font-normal",
    large ? "h-[68px] basis-[68px] text-[26px]" : "h-[52px] basis-[52px] text-[22px]",
  );

  return (
    <div className="flex items-stretch gap-[10px]">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-label="One fewer"
        onClick={() => setValue((v) => Math.max(min, v - 1))}
        className={button}
      >
        −
      </button>
      <div
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn(
          "bg-sf border-ln text-ink flex flex-1 items-center justify-center rounded-[11px] border",
          "tabular font-medium",
          large ? "min-h-[68px] text-[30px]" : "min-h-[52px] text-[20px]",
        )}
      >
        {value}
      </div>
      <button
        type="button"
        aria-label="One more"
        onClick={() => setValue((v) => v + 1)}
        className={button}
      >
        +
      </button>
    </div>
  );
}
