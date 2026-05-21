import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchListingById } from "@/lib/listings/query";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const listing = await fetchListingById(parsed.data);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(listing, {
    headers: { "Cache-Control": "no-store" },
  });
}
