import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single shared postgres.js client for the server runtime.
 *
 * Supabase recommends using the **pooled** connection string
 * (port 6543, transaction mode) for serverless / short-lived environments.
 * For long-running workers (the future Telegram ingestion process) use the
 * direct connection (port 5432) instead — see DATABASE_URL_DIRECT in
 * .env.example.
 *
 * `prepare: false` is required for Supabase transaction-pooler usage.
 */
declare global {
  var __tdaPgClient: ReturnType<typeof postgres> | undefined;
}

const queryClient =
  globalThis.__tdaPgClient ??
  postgres(env.DATABASE_URL, {
    prepare: false,
    max: 10,
  });

if (env.NODE_ENV !== "production") {
  globalThis.__tdaPgClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
export { schema };
export type DB = typeof db;

/** Close the shared postgres pool. Call from one-shot CLI scripts. */
export async function closeDbPool(): Promise<void> {
  await queryClient.end({ timeout: 5 });
  if (env.NODE_ENV !== "production") {
    globalThis.__tdaPgClient = undefined;
  }
}
