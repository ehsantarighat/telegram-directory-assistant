import { z } from "zod";

/**
 * Validated environment.
 *
 * Validation is **lazy**: parsing only fires on the first property
 * access, not at module-import time. This matters during `next build`,
 * which collects page-data by transitively importing every route
 * module. If env validation happened at import, a missing var would
 * crash the build even when the build itself doesn't need that var
 * (page-data collection doesn't run handlers).
 *
 * With lazy validation:
 *   - Build with no env vars: still succeeds (no module-load access)
 *   - First request that touches `env.X` at runtime: validates and
 *     either returns the value or throws a clear, single-source error
 *     listing exactly which vars are missing
 *
 * Two schemas:
 *   - server: never sent to the browser (DB URL, service-role key, NODE_ENV)
 *   - client: NEXT_PUBLIC_* values safe to inline into the client bundle
 *
 * The returned object is frozen and cached after the first successful
 * parse, so subsequent accesses are O(1) lookups.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Supabase Postgres pooled connection string)"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Optional. When set, ingestion uses Claude Haiku for LLM extraction.
  // When unset, the pipeline falls back to the rule-based extractor.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_EXTRACTION_MODEL: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  // Yandex.Direct (РСЯ) RTB block ids. Format "R-A-12345678-1".
  // Both optional — when unset, the corresponding ad slot renders
  // nothing (component returns null). Wire them in after the Yandex
  // partner account is approved and you've created the blocks.
  NEXT_PUBLIC_YANDEX_AD_FEED_BLOCK_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_YANDEX_AD_DETAIL_BLOCK_ID: z.string().min(1).optional(),
});

function parse<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data as z.infer<T>;
}

type Server = z.infer<typeof serverSchema>;
type Client = z.infer<typeof clientSchema>;
export type Env = Server & Client;

let cached: Env | null = null;

/**
 * Treat empty strings as undefined before validation. `.env` files written
 * via `KEY=""` or `KEY=` produce empty strings rather than missing keys,
 * which would otherwise fail `.min(1)` on optional vars.
 */
function nz(v: string | undefined): string | undefined {
  return v && v.length > 0 ? v : undefined;
}

function getValidatedEnv(): Env {
  if (cached) return cached;
  const server = parse(serverSchema, {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: nz(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ANTHROPIC_API_KEY: nz(process.env.ANTHROPIC_API_KEY),
    ANTHROPIC_EXTRACTION_MODEL: nz(process.env.ANTHROPIC_EXTRACTION_MODEL),
  });
  const client = parse(clientSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: nz(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_YANDEX_AD_FEED_BLOCK_ID: nz(
      process.env.NEXT_PUBLIC_YANDEX_AD_FEED_BLOCK_ID,
    ),
    NEXT_PUBLIC_YANDEX_AD_DETAIL_BLOCK_ID: nz(
      process.env.NEXT_PUBLIC_YANDEX_AD_DETAIL_BLOCK_ID,
    ),
  });
  cached = Object.freeze({ ...server, ...client });
  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    return getValidatedEnv()[prop as keyof Env];
  },
  has(_target, prop) {
    return prop in getValidatedEnv();
  },
  ownKeys() {
    return Reflect.ownKeys(getValidatedEnv());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getValidatedEnv(), prop);
  },
});
