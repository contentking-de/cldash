import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskStatusChangedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$use" | "$extends" | "$transaction">;

const reorderSchema = z.object({
  taskId: z.string(),
  newStatus: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  newOrder: z.number(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { taskId, newStatus, newOrder } = parsed.data;

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      assignees: { select: { id: true, name: true, email: true } },
    },
  });
  const oldStatus = task.status;

  await prisma.$transaction(async (tx: TxClient) => {
    if (oldStatus !== newStatus) {
      await tx.task.updateMany({
        where: { status: oldStatus, order: { gt: task.order } },
        data: { order: { decrement: 1 } },
      });
      await tx.task.updateMany({
        where: { status: newStatus, order: { gte: newOrder } },
        data: { order: { increment: 1 } },
      });
    } else {
      if (newOrder > task.order) {
        await tx.task.updateMany({
          where: { status: newStatus, order: { gt: task.order, lte: newOrder } },
          data: { order: { decrement: 1 } },
        });
      } else if (newOrder < task.order) {
        await tx.task.updateMany({
          where: { status: newStatus, order: { gte: newOrder, lt: task.order } },
          data: { order: { increment: 1 } },
        });
      }
    }

    await tx.task.update({
      where: { id: taskId },
      data: { status: newStatus, order: newOrder },
    });
  });

  if (oldStatus !== newStatus) {
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
        oldStatus,
        newStatus,
        changedByName,
      }).catch(console.error);
      createNotification({
        userId: assignee.id,
        type: "task_status",
        title: `Status geändert: ${task.title}`,
        body: `${changedByName} hat den Status von "${statusLabels[oldStatus] || oldStatus}" auf "${statusLabels[newStatus] || newStatus}" geändert.`,
        link: `/tasks?task=${taskId}`,
      }).catch(console.error);
    }
  }

  return NextResponse.json({ success: true });
}
