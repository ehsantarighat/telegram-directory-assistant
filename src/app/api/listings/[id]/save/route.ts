import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getUser } from "@/lib/auth/getUser";
import { saveListing, unsaveListing } from "@/lib/listings/saved";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

async function getValidatedId(
  ctx: RouteContext<"/api/listings/[id]/save">,
): Promise<string | null> {
  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/listings/[id]/save">,
) {
  const id = await getValidatedId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save listings" },
      { status: 401 },
    );
  }

  const result = await saveListing(user.id, id);
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/listings/[id]/save">,
) {
  const id = await getValidatedId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const result = await unsaveListing(user.id, id);
  return NextResponse.json(result);
}
