import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  await prisma.$transaction(async (tx: TxClient) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    const oldStatus = task.status;

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

  return NextResponse.json({ success: true });
}
