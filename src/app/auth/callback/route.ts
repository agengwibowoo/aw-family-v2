import { NextResponse, type NextRequest } from "next/server";

import { supabaseServer } from "@/server/supabase";

/**
 * Lands on the screen the link pointed at, not on Today.
 *
 * Links arrive in a chat thread. Someone following one may not be signed in and
 * has no back history, so sending them to the home screen after signing in
 * loses the thing they came for.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  // Only ever a path on this app — an open redirect here would be a real one.
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=no_code", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/sign-in?error=exchange_failed", url.origin),
    );
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
