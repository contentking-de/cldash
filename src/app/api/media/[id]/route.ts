import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { del } from "@vercel/blob";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const file = await prisma.mediaFile.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }

  await del(file.url);

  await prisma.mediaFile.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
