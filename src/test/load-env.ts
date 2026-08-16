import fs from "node:fs";
import path from "node:path";

/** Next loads .env.local for us; a bare test runner does not. */
const file = path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    if (process.env[key] === undefined) {
      process.env[key] = trimmed.slice(i + 1).trim();
    }
  }
}
