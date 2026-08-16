import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "./env";
import * as schema from "./schema";

/**
 * The database connection. Server-only by construction: importing this from a
 * client component is a build error, which is the point — the browser never
 * holds a key that can write.
 *
 * Everything that touches this lives in src/server/services. Nothing else in
 * the app imports it directly.
 */

const connectionString = env.DATABASE_URL;

declare global {
  var __familyDbClient: ReturnType<typeof postgres> | undefined;
}

// Next reloads modules in dev; without this the connection count climbs until
// Supabase refuses new ones.
const client =
  globalThis.__familyDbClient ??
  postgres(connectionString, { prepare: false, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__familyDbClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
