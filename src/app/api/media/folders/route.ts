import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");

  const [folders, files, breadcrumbs] = await Promise.all([
    prisma.mediaFolder.findMany({
      where: { parentId: parentId || null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { children: true, files: true } },
      },
    }),
    prisma.mediaFile.findMany({
      where: { folderId: parentId || null },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    parentId ? buildBreadcrumbs(parentId) : [],
  ]);

  return NextResponse.json({ folders, files, breadcrumbs });
}

async function buildBreadcrumbs(folderId: string) {
  const crumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { id: string; name: string; parentId: string | null } | null =
      await prisma.mediaFolder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return crumbs;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, parentId } = parsed.data;

  const maxOrder = await prisma.mediaFolder.aggregate({
    where: { parentId: parentId || null },
    _max: { order: true },
  });

  const folder = await prisma.mediaFolder.create({
    data: {
      name,
      parentId: parentId || null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      _count: { select: { children: true, files: true } },
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
