import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/index";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      last_access: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hashed },
    select: { id: true, email: true, name: true, is_active: true, created_at: true },
  });

  return NextResponse.json(user, { status: 201 });
}
