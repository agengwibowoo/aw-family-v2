"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignInButton({
  next,
  label = "Sign in with Google",
  variant = "primary",
}: {
  next?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = supabaseBrowser();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    if (error) setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={busy}
      aria-busy={busy || undefined}
      className={
        variant === "primary"
          ? "bg-ac flex min-h-[52px] w-full items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white disabled:opacity-60"
          : "border-ln2 text-ink flex min-h-[52px] w-full items-center justify-center rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap disabled:opacity-60"
      }
    >
      {busy ? "Opening Google…" : label}
    </button>
  );
}

export function SignOutButton({ label = "Sign in as someone else" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    router.push("/sign-in");
    // The gate runs in Server Components, so the tree has to be re-fetched
    // without the session — pushing alone would serve the cached signed-in one.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-busy={busy || undefined}
      className="border-ln2 text-ink flex min-h-[52px] w-full items-center justify-center rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap disabled:opacity-60"
    >
      {busy ? "Signing out…" : label}
    </button>
  );
}
