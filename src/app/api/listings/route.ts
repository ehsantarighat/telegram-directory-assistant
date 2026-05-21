import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  fetchListings,
  listingsQuerySchema,
} from "@/lib/listings/query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const raw = Object.fromEntries(sp.entries());

  const parsed = listingsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const page = await fetchListings(parsed.data);
  return NextResponse.json(page, {
    headers: { "Cache-Control": "no-store" },
  });
}
