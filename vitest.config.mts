import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests by default — pure domain functions, no network.
 * `pnpm test:db` adds the integration tests, which hit the real database.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside a React Server Component bundle. The
      // guard is for the browser; in a test runner it is just noise.
      "server-only": path.resolve(import.meta.dirname, "src/test/noop.ts"),
    },
  },
  test: {
    setupFiles: ["src/test/load-env.ts"],
    include: ["src/**/*.test.ts"],
    // `*.integration.test.ts` also ends in `.test.ts`, so without this the
    // default run would quietly need a network and a database.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      ...(process.env.TEST_DB ? [] : ["**/*.integration.test.ts"]),
    ],
    // The integration tests share one database; running them in parallel would
    // have them fighting over the single-picked-hospital invariant.
    fileParallelism: !process.env.TEST_DB,
  },
});
