import "server-only";

import { z } from "zod";

/**
 * Read once, fail loudly.
 *
 * The mistake this exists to catch is pasting the secret key where the
 * publishable one goes, or picking up a legacy JWT from the "JWT keys" section
 * of the dashboard. Both fail later as an opaque 401 from PostgREST, which is a
 * bad afternoon.
 *
 * NEXT_PUBLIC_ values are referenced statically so the bundler can inline them.
 */

const publishable = z
  .string()
  .min(1, "missing")
  .refine((v) => !v.startsWith("sb_secret_"), {
    message:
      "this is the secret key. It must never reach the browser — put it in SUPABASE_SECRET_KEY instead",
  })
  .refine((v) => v.startsWith("sb_publishable_") || v.startsWith("eyJ"), {
    message:
      "expected a publishable key (sb_publishable_…), from Project Settings → API Keys",
  });

const secret = z
  .string()
  .min(1, "missing")
  .refine((v) => !v.startsWith("sb_publishable_"), {
    message:
      "this is the publishable key. Use the secret key (sb_secret_…) here",
  })
  .refine((v) => v.startsWith("sb_secret_") || v.startsWith("eyJ"), {
    message: "expected a secret key (sb_secret_…)",
  });

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("expected the project URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  DATABASE_URL: z
    .string()
    .min(1, "missing")
    .refine((v) => !v.includes("[YOUR-PASSWORD]"), {
      message:
        "still contains the [YOUR-PASSWORD] placeholder — replace it with the database password",
    }),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
});

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (i) => `  ${i.path.join(".")}: ${i.message}`,
  );
  throw new Error(
    `.env.local is not right yet — see docs/setup.md step 6.\n\n${lines.join("\n")}\n`,
  );
}

export const env = parsed.data;
