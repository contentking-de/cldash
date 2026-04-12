import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTicketCommentEmail } from "@/lib/email";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

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

  const comment = await prisma.ticketComment.create({
    data: {
      content: parsed.data.content,
      ticketId: id,
      authorId: session.user.id,
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  if (ticket?.assignee && ticket.assignee.id !== session.user.id) {
    sendTicketCommentEmail({
      assigneeEmail: ticket.assignee.email,
      assigneeName: ticket.assignee.name,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      commentAuthor: session.user.name || session.user.email || "Jemand",
      commentContent: parsed.data.content,
    }).catch(console.error);
  }

  return NextResponse.json(comment, { status: 201 });
}
