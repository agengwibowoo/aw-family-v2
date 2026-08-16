import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design references, not source. Flat inline-heavy HTML/JS by design —
    // see design-handoff/README.md.
    "design-handoff/**",
    "supabase/migrations/**",
  ]),

  /**
   * ADR-0002: `src/server/services/` is the only code permitted to touch the
   * database. Server Actions call it, `/api/mcp` calls it, and nothing else
   * imports `src/server/db` — so a human and an agent get the same guarantees
   * from one implementation of every invariant rather than two.
   *
   * This was already violated three times by pages doing their own selects,
   * which is why it is a lint rule now rather than a paragraph in a document.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db",
              message:
                "Only src/server/services may touch the database (ADR-0002). Add a function there and call it.",
            },
            {
              name: "@/server/schema",
              message:
                "Only src/server/services may touch the database (ADR-0002). Add a function there and call it.",
            },
          ],
          patterns: [
            {
              group: ["**/server/db", "**/server/schema", "drizzle-orm"],
              message:
                "Only src/server/services may touch the database (ADR-0002). Add a function there and call it.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
