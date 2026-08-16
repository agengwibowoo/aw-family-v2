"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * A bottom sheet.
 *
 * Used where a screen needs a second surface without becoming a second screen:
 * "Narrow it" on the list, the one question behind "Add" on a thing, the
 * one-tap count. It rises from the bottom because that is where her thumb is.
 *
 * It is deliberately not a dialog with a decision in it. There are no "are you
 * sure" dialogs anywhere in this app — the safety is in Undo — so a sheet only
 * ever asks a question or offers a shortcut.
 *
 * Open state lives in the URL rather than in component state, so the back
 * gesture closes it and a link can open straight into it.
 */
export function Sheet({
  title,
  onClose,
  closeLabel = "Close",
  children,
}: {
  title: string;
  /** Defaults to going back, which is what a sheet opened from a link wants. */
  onClose?: () => void;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(
    () => (onClose ? onClose() : router.back()),
    [onClose, router],
  );

  // Escape closes it. Nothing here depends on motion, so nothing animates.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* The screen underneath stays legible: this is a layer, not a new place. */}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={close}
        className="bg-ink/35 absolute inset-0"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "bg-sf border-ln relative mx-auto w-full max-w-[420px] rounded-t-[20px] border border-b-0",
          "px-[18px] pt-[20px] pb-[max(26px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-ink2 shadow-[inset_0_0_0_1px_var(--ln2)] shrink-0 rounded-[7px] px-[9px] py-[4px] text-[12px] font-semibold"
          >
            {closeLabel}
          </button>
        </div>
        <div className="mt-[16px]">{children}</div>
      </div>
    </div>
  );
}

/**
 * A full-width choice inside a sheet.
 *
 * 60px and 18px on the branch question, because that sheet exists to be
 * answered without reading twice.
 */
export function SheetChoice({
  children,
  onClick,
  href,
  tone = "quiet",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "primary" | "quiet";
}) {
  const className = cn(
    "flex min-h-[60px] w-full items-center justify-center rounded-[11px] px-4 text-[18px] font-medium whitespace-nowrap",
    tone === "primary"
      ? "bg-ac text-white"
      : "border-ln2 text-ink border bg-transparent",
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
