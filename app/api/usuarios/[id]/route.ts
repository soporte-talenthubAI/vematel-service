import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/index";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") data.is_active = body.is_active;
  if (body.name) data.name = body.name;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, is_active: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
