import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskStatusChangedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional().nullable(),
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

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
  }

  const oldTask = parsed.data.status
    ? await prisma.task.findUnique({
        where: { id },
        select: { status: true, assigneeId: true },
      })
    : null;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  if (
    oldTask &&
    parsed.data.status &&
    oldTask.status !== parsed.data.status &&
    task.assignee &&
    task.assignee.id !== session.user.id
  ) {
    const changedByName = session.user.name || session.user.email || "Jemand";
    const statusLabels: Record<string, string> = {
      BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Arbeit",
      REVIEW: "Review", DONE: "Erledigt",
    };
    sendTaskStatusChangedEmail({
      assigneeEmail: task.assignee.email,
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      oldStatus: oldTask.status,
      newStatus: parsed.data.status,
      changedByName,
    }).catch(console.error);
    createNotification({
      userId: task.assignee.id,
      type: "task_status",
      title: `Status geändert: ${task.title}`,
      body: `${changedByName} hat den Status von "${statusLabels[oldTask.status] || oldTask.status}" auf "${statusLabels[parsed.data.status] || parsed.data.status}" geändert.`,
      link: `/tasks?task=${id}`,
    }).catch(console.error);
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
