import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/user-management";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nutzerverwaltung</h1>
        <p className="text-sm text-slate-500 mt-1">
          Team-Mitglieder verwalten und neue Nutzer einladen
        </p>
      </div>
      <UserManagement
        currentUserId={session.user.id}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}
