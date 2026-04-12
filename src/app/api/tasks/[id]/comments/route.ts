import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTaskCommentEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      content: parsed.data.content,
      taskId: id,
      authorId: session.user.id,
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  if (task?.assignee && task.assignee.id !== session.user.id) {
    const commentAuthor = session.user.name || session.user.email || "Jemand";
    sendTaskCommentEmail({
      assigneeEmail: task.assignee.email,
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      commentAuthor,
      commentContent: parsed.data.content,
    }).catch(console.error);
    createNotification({
      userId: task.assignee.id,
      type: "task_comment",
      title: `Neuer Kommentar: ${task.title}`,
      body: `${commentAuthor}: ${parsed.data.content.length > 100 ? parsed.data.content.slice(0, 100) + "…" : parsed.data.content}`,
      link: `/tasks?task=${id}`,
    }).catch(console.error);
  }

  return NextResponse.json(comment, { status: 201 });
}
