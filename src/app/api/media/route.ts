import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Keine Datei ausgewählt" }, { status: 400 });
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Datei zu groß (max. 50 MB)" }, { status: 400 });
  }

  const blob = await put(file.name, file, {
    access: "public",
  });

  const mediaFile = await prisma.mediaFile.create({
    data: {
      name: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      folderId: folderId || null,
      uploadedById: session.user.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(mediaFile, { status: 201 });
}
