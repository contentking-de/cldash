import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const folder = await prisma.mediaFolder.findUnique({
    where: { id },
    include: { _count: { select: { children: true, files: true } } },
  });

  if (!folder) {
    return NextResponse.json({ error: "Ordner nicht gefunden" }, { status: 404 });
  }

  if (folder._count.children > 0 || folder._count.files > 0) {
    return NextResponse.json(
      { error: "Ordner ist nicht leer. Bitte zuerst Inhalte löschen oder verschieben." },
      { status: 400 }
    );
  }

  await prisma.mediaFolder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
