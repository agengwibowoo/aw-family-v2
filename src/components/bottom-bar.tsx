"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

import { LinkPending } from "./link-pending";

/**
 * Component 8 — bottom action bar.
 *
 * One or two actions, one line of copy each. Buttons must never wrap to two
 * lines, so secondaries get a fixed width wide enough for a two-word label.
 *
 * The two actions never disappear, on any state.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-ln bg-bg sticky bottom-0 flex gap-[12px] border-t px-[16px] pt-[12px] pb-[26px]">
      {children}
    </div>
  );
}

const BASE =
  "flex min-h-[52px] items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap";

export function BarPrimary({
  children,
  href,
  onClick,
  type = "button",
  busyLabel,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  /** What it says while the action is in flight. */
  busyLabel?: string;
}) {
  const { pending } = useFormStatus();
  const base = cn(BASE, "bg-ac flex-1 text-white");

  // A link out of a submitting form still works, so it is never dimmed for
  // the form's sake — only for its own navigation.
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
        <LinkPending />
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(base, pending && "opacity-60")}
    >
      {pending && busyLabel ? busyLabel : children}
    </button>
  );
}

export function BarSecondary({
  children,
  href,
  onClick,
  type = "button",
  /** 126–140px for a two-word label. */
  width = 134,
  busyLabel,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  width?: number;
  busyLabel?: string;
}) {
  const { pending } = useFormStatus();
  const base = cn(BASE, "border-ln2 text-ink shrink-0 border");
  const style = { flexBasis: width };

  if (href) {
    return (
      <Link href={href} className={base} style={style}>
        {children}
        <LinkPending />
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(base, pending && "opacity-60")}
      style={style}
    >
      {pending && busyLabel ? busyLabel : children}
    </button>
  );
}
