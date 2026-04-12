import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = 50;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ messages: messages.reverse(), hasMore });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = (await req.json()) as { content: string };

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.chatMessage.create({
    data: {
      content: content.trim(),
      conversationId: id,
      senderId: session.user.id,
    },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: id, userId: { not: session.user.id } },
  });

  const senderName = session.user.name || session.user.email || "Jemand";
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { title: true, isGroup: true },
  });

  await Promise.all(
    otherParticipants.map((p) =>
      createNotification({
        userId: p.userId,
        type: "chat_message",
        title: conversation?.isGroup && conversation?.title
          ? `${senderName} in ${conversation.title}`
          : `Neue Nachricht von ${senderName}`,
        body: content.trim().length > 100 ? content.trim().slice(0, 100) + "…" : content.trim(),
        link: `/cleverchat?id=${id}`,
      })
    )
  );

  return NextResponse.json(message, { status: 201 });
}
