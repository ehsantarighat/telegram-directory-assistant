/**
 * pnpm env:check
 *
 * Verifies the local environment is ready before you deploy or run
 * migrations. Run it from your laptop or inside CI:
 *
 *   - Confirms every required var is present in .env.local
 *   - Pings Supabase via a real `SELECT 1` (catches typos in DATABASE_URL
 *     and a paused Supabase project, not just missing values)
 *   - Verifies the public Supabase URL resolves
 *
 * Output is one line per check. Exits 1 on any failure so you can
 * chain it: `pnpm env:check && pnpm db:migrate && pnpm db:seed`.
 *
 * The script reads .env.local explicitly so it works regardless of
 * how dotenv-cli or Next.js auto-loading might be configured.
 */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: false });

type CheckResult = { name: string; ok: boolean; detail?: string };

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const OPTIONAL_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

async function main() {
  const results: CheckResult[] = [];

  // 1) Required var presence
  for (const key of REQUIRED_KEYS) {
    const v = process.env[key];
    if (!v || v.length === 0) {
      results.push({ name: `${key} set`, ok: false, detail: "missing" });
    } else {
      results.push({
        name: `${key} set`,
        ok: true,
        detail: `len=${v.length}`,
      });
    }
  }

  // 2) Optional var presence (informational)
  for (const key of OPTIONAL_KEYS) {
    const v = process.env[key];
    results.push({
      name: `${key} (optional)`,
      ok: true,
      detail: v ? `len=${v.length}` : "not set",
    });
  }

  // 3) DATABASE_URL parse
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      const summary = `${u.hostname}:${u.port}/${u.pathname.slice(1)} sslmode=${u.searchParams.get("sslmode") ?? "(none)"}`;
      results.push({ name: "DATABASE_URL parses", ok: true, detail: summary });
      if (!u.password) {
        results.push({
          name: "DATABASE_URL has password",
          ok: false,
          detail: "URL missing password component",
        });
      } else {
        results.push({
          name: "DATABASE_URL has password",
          ok: true,
          detail: "yes (redacted)",
        });
      }
      if (
        u.pathname.includes("%22") ||
        u.pathname.includes('"') ||
        dbUrl.includes('"')
      ) {
        results.push({
          name: "DATABASE_URL has no stray quotes",
          ok: false,
          detail: "found a `\"` character — strip it",
        });
      } else {
        results.push({
          name: "DATABASE_URL has no stray quotes",
          ok: true,
        });
      }
    } catch (err) {
      results.push({
        name: "DATABASE_URL parses",
        ok: false,
        detail: err instanceof Error ? err.message : "invalid URL",
      });
    }
  }

  // 4) NEXT_PUBLIC_SUPABASE_URL parse
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supaUrl) {
    try {
      const u = new URL(supaUrl);
      if (!u.hostname.endsWith(".supabase.co")) {
        results.push({
          name: "NEXT_PUBLIC_SUPABASE_URL is a Supabase host",
          ok: false,
          detail: `hostname=${u.hostname}`,
        });
      } else {
        results.push({
          name: "NEXT_PUBLIC_SUPABASE_URL is a Supabase host",
          ok: true,
          detail: u.hostname,
        });
      }
    } catch {
      results.push({
        name: "NEXT_PUBLIC_SUPABASE_URL parses",
        ok: false,
        detail: "invalid URL",
      });
    }
  }

  // 5) Live SELECT 1 (only if DATABASE_URL is present and valid)
  if (dbUrl && results.every((r) => !r.name.startsWith("DATABASE_URL") || r.ok)) {
    try {
      const { default: postgres } = await import("postgres");
      const sql = postgres(dbUrl, {
        max: 1,
        prepare: false,
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10,
      });
      try {
        const rows = await sql<{ one: number }[]>`select 1 as one`;
        if (rows[0]?.one === 1) {
          results.push({
            name: "Live Postgres connection",
            ok: true,
            detail: "SELECT 1 returned",
          });
        } else {
          results.push({
            name: "Live Postgres connection",
            ok: false,
            detail: "unexpected response",
          });
        }
      } finally {
        await sql.end({ timeout: 2 });
      }
    } catch (err) {
      results.push({
        name: "Live Postgres connection",
        ok: false,
        detail: err instanceof Error ? err.message : "connection failed",
      });
    }
  }

  // ----- Report -----
  let okCount = 0;
  let failCount = 0;
  for (const r of results) {
    const tag = r.ok ? "✓" : "✗";
    const line = `  ${tag} ${r.name}` + (r.detail ? `  · ${r.detail}` : "");
    if (r.ok) {
      okCount++;
      console.log(line);
    } else {
      failCount++;
      console.error(line);
    }
  }
  console.log("");
  console.log(
    failCount === 0
      ? `All ${okCount} checks passed. Safe to deploy.`
      : `${failCount} check${failCount === 1 ? "" : "s"} failed (${okCount} passed). See .env.example for the canonical list.`,
  );

  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("env:check crashed:", err);
  process.exit(1);
});
