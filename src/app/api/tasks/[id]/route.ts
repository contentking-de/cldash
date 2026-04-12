import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskStatusChangedEmail, sendTaskAssignedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
  order: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { assigneeIds, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
  }

  const oldTask = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { select: { id: true } } },
  });

  if (assigneeIds !== undefined) {
    data.assignees = {
      set: assigneeIds.map((uid: string) => ({ id: uid })),
    };
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      assignees: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  if (
    oldTask &&
    parsed.data.status &&
    oldTask.status !== parsed.data.status
  ) {
    const changedByName = session.user.name || session.user.email || "Jemand";
    const statusLabels: Record<string, string> = {
      BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Arbeit",
      REVIEW: "Review", DONE: "Erledigt",
    };
    for (const assignee of task.assignees) {
      if (assignee.id === session.user.id) continue;
      sendTaskStatusChangedEmail({
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        taskTitle: task.title,
        oldStatus: oldTask.status,
        newStatus: parsed.data.status,
        changedByName,
      }).catch(console.error);
      createNotification({
        userId: assignee.id,
        type: "task_status",
        title: `Status geändert: ${task.title}`,
        body: `${changedByName} hat den Status von "${statusLabels[oldTask.status] || oldTask.status}" auf "${statusLabels[parsed.data.status] || parsed.data.status}" geändert.`,
        link: `/tasks?task=${id}`,
      }).catch(console.error);
    }
  }

  if (assigneeIds !== undefined && oldTask) {
    const oldIds = new Set(oldTask.assignees.map((a) => a.id));
    const newAssignees = task.assignees.filter((a) => !oldIds.has(a.id) && a.id !== session.user.id);
    const assignedByName = session.user.name || session.user.email || "Jemand";
    for (const assignee of newAssignees) {
      sendTaskAssignedEmail({
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        taskTitle: task.title,
        taskId: task.id,
        assignedByName,
      }).catch(console.error);
      createNotification({
        userId: assignee.id,
        type: "task_assigned",
        title: `Neuer Task: ${task.title}`,
        body: `${assignedByName} hat dir einen Task zugewiesen.`,
        link: `/tasks?task=${id}`,
      }).catch(console.error);
    }
  }

  return NextResponse.json(task);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && task.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
