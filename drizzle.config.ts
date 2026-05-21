import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js auto-loads .env.local but standalone CLIs (drizzle-kit) do not.
// Load .env.local explicitly so `pnpm db:generate / db:push / db:studio` work
// against the same DATABASE_URL used by the app.
loadDotenv({ path: ".env.local", override: false });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env.local and fill it in.",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
