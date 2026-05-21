/**
 * Next.js instrumentation hook.
 *
 * Runs once at server startup, before any request handler is invoked.
 * We use it to fail-fast on missing environment variables: instead of
 * letting the first user request surface "DATABASE_URL is required",
 * the server refuses to come up at all, and the error is loud in the
 * Railway / Vercel / wherever deploy logs.
 *
 * Combined with the lazy env validator in src/lib/env.ts, this gives:
 *   - Build: always succeeds (env never read at build time)
 *   - Boot: hard crash with clear log if any required var is missing
 *   - First request: same fail-fast (lazy env), but we get there first
 *
 * If you ever see "[env] ✓ all required env vars validated" missing
 * from a Railway deploy log, env validation crashed during boot — the
 * lines above it list exactly which vars were the problem.
 */

export async function register() {
  // The hook also fires for the Edge runtime; only run env validation
  // in the Node runtime where process.env is the source of truth.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { env } = await import("./lib/env");

    // Touch each required field so the lazy validator parses everything
    // up-front rather than deferring to the first request.
    void env.DATABASE_URL;
    void env.NEXT_PUBLIC_SUPABASE_URL;
    void env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("[env] ✓ all required env vars validated");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[env] ✗ FATAL — server refusing to start:\n" + message,
    );
    // Rethrow so Next.js refuses to start the server. The platform
    // marks the deploy failed, the deploy logs show this error, and
    // the error itself lists every missing var (see src/lib/env.ts).
    // We throw rather than process.exit so Turbopack's static analysis
    // doesn't flag a Node-only API even though the runtime guard above
    // restricts execution to the Node runtime.
    throw err;
  }
}
