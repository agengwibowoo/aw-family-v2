import type { Config } from "drizzle-kit";

export default {
  schema: "./src/server/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
} satisfies Config;
