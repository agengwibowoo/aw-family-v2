import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser client. It holds the publishable key, which grants nothing on its
 * own — it is used for signing in and for reading the session, never for
 * writing application data. Writes go through Server Actions into
 * src/server/services. See ADR-0002.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
