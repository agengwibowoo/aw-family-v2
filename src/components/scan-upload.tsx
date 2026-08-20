"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BAR_BUTTON } from "@/components/bottom-bar";
import { cn } from "@/lib/cn";

/**
 * Take a photo of a paper.
 *
 * The bytes go straight from the phone to storage using a short-lived signed
 * URL, never through this app — a 10MB photo on the request path is a slow save
 * on a bad connection, which is exactly when she is doing this.
 *
 * `capture` opens the camera rather than the gallery, because these are photos
 * she takes now, of something in front of her.
 */
export function ScanUpload({
  signAction,
  attachAction,
  label = "Add a photo",
  variant = "slot",
  className,
}: {
  /** Asks the server where to put it. */
  signAction: (filename: string) => Promise<{ path: string; url: string } | null>;
  /** Tells the server it landed. */
  attachAction: (path: string) => Promise<void>;
  label?: string;
  /** An empty slot in a strip of photos, or the primary action in the bar. */
  variant?: "slot" | "bar";
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  // The transition only covers the write at the end. The slow part is the
  // signing round-trip and the PUT, so the button has to be dead for those
  // too — otherwise a second tap on a bad connection uploads the photo twice.
  const [sending, setSending] = useState(false);
  const busy = sending || pending;

  async function upload(file: File) {
    setProblem(null);
    setSending(true);
    try {
      const target = await signAction(file.name);
      if (!target) {
        setProblem("There is nowhere to put photos yet.");
        return;
      }

      const response = await fetch(target.url, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type },
      });
      if (!response.ok) {
        setProblem("That didn't upload. Try once more.");
        return;
      }

      start(async () => {
        await attachAction(target.path);
        router.refresh();
      });
    } catch {
      // Offline, or the signed URL expired while she was choosing. Say so
      // rather than leaving the slot looking like it worked.
      setProblem("That didn't upload. Try once more.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn(variant === "bar" && "flex-1", className)}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => input.current?.click()}
        className={cn(
          variant === "bar"
            ? cn(BAR_BUTTON, "bg-ac w-full text-white")
            : "bg-sf2 border-ln2 text-ink3 grid h-[132px] w-[104px] shrink-0 place-items-center rounded-[8px] border border-dashed text-[11px]",
          busy && "opacity-60",
        )}
      >
        {busy ? "Saving…" : label}
      </button>
      {problem && <p className="text-ink2 mt-[6px] text-[12px]">{problem}</p>}
    </div>
  );
}
