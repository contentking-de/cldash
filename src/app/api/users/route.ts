import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      _count: { select: { assignedTasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, name, email, role } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
  }

  if (role && !["ADMIN", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "Ungueltige Rolle" }, { status: 400 });
  }

  if (role && userId === session.user.id) {
    return NextResponse.json({ error: "Du kannst deine eigene Rolle nicht aendern" }, { status: 400 });
  }

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Diese E-Mail wird bereits verwendet" }, { status: 400 });
    }
  }

  const data: Record<string, string> = {};
  if (name !== undefined) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Aenderungen" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst loeschen" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
