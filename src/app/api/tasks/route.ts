import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTaskAssignedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, status, priority, assigneeId, dueDate } = parsed.data;

  const maxOrder = await prisma.task.aggregate({
    where: { status: status || "BACKLOG" },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || "BACKLOG",
      priority: priority || "MEDIUM",
      assigneeId: assigneeId || null,
      creatorId: session.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  if (task.assignee && task.assignee.id !== session.user.id) {
    const assignedByName = session.user.name || session.user.email || "Jemand";
    sendTaskAssignedEmail({
      assigneeEmail: task.assignee.email,
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      taskId: task.id,
      assignedByName,
    }).catch(console.error);
    createNotification({
      userId: task.assignee.id,
      type: "task_assigned",
      title: `Neuer Task: ${task.title}`,
      body: `${assignedByName} hat dir einen neuen Task zugewiesen.`,
      link: `/tasks?task=${task.id}`,
    }).catch(console.error);
  }

  return NextResponse.json(task, { status: 201 });
}
