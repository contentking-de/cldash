import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/media-library";

export default async function MediathekPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const files = await prisma.mediaFile.findMany({
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mediathek</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dokumente und Dateien verwalten
        </p>
      </div>
      <MediaLibrary initialFiles={files} />
    </div>
  );
}
