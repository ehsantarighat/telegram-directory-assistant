import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { translateListing } from "@/lib/translation";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const langSchema = z.enum(["en", "ru", "fa"]);

/**
 * GET /api/listings/[id]/translate?language=en|ru|fa
 *
 * Returns a cached translation, creating one on cache miss via the
 * active provider. Anonymous-friendly — translations are part of the
 * public read surface.
 *
 * Response shape:
 *   { language, direction, title, summary, text, provider, cached }
 * On provider failure or same-language no-op:
 *   { language, error: "unsupported" | "provider_failed" }
 *
 * Master spec: "Fallback to original if translation fails" — clients
 * read `error` and render the original content.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/listings/[id]/translate">,
) {
  const { id } = await ctx.params;
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const langParsed = langSchema.safeParse(
    request.nextUrl.searchParams.get("language"),
  );
  if (!langParsed.success) {
    return NextResponse.json(
      { error: "Invalid language. Use en, ru, or fa." },
      { status: 400 },
    );
  }

  const result = await translateListing({
    listingId: idParsed.data,
    language: langParsed.data,
  });

  if (!result) {
    return NextResponse.json(
      { language: langParsed.data, error: "unsupported" },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    {
      language: langParsed.data,
      title: result.title,
      summary: result.summary,
      text: result.text,
      direction: result.direction,
      provider: result.provider,
      cached: result.cached,
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
