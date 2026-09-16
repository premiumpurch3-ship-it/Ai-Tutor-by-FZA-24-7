// Shared .env.local loader for all scripts in this folder.
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  console.warn("No .env.local found — create one from .env.example first.");
}
