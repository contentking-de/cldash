import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentBrowser } from "@/components/document-browser";

export default async function MediathekPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dokumente</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dokumente und Dateien verwalten
        </p>
      </div>
      <DocumentBrowser />
    </div>
  );
}
