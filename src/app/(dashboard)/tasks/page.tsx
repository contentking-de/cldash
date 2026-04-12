import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { NewTaskButton } from "@/components/new-task-button";

export default async function TasksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verwalte deine Tasks per Drag &amp; Drop
          </p>
        </div>
        <NewTaskButton />
      </div>
      <KanbanBoard users={users} />
    </div>
  );
}
