"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

/**
 * A submit button that goes inert while its action is in flight.
 *
 * Server Actions are dispatched one at a time per client, not deduplicated, so
 * a second tap queues a second write and both land. Two identical places got
 * added that way. `disabled` while pending is what stops it.
 *
 * The busy state is reduced opacity and a word — the design's own loading
 * vocabulary. Never a spinner, never a skeleton, never a colour.
 */
export function SubmitButton({
  children,
  busyLabel,
  className,
  disabled,
  name,
  value,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  /** The verb, on buttons wide enough to swap it without moving under a thumb. */
  busyLabel?: string;
  className?: string;
  /** A reason of its own, kept alongside the pending one. */
  disabled?: boolean;
  name?: string;
  value?: string | number;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      aria-label={ariaLabel}
      name={name}
      value={value}
      className={cn(className, pending && "opacity-60")}
    >
      {pending && busyLabel ? busyLabel : children}
    </button>
  );
}
