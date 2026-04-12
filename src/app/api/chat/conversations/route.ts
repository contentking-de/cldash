import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: session.user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withUnread = conversations.map((conv) => {
    const myParticipant = conv.participants.find((p) => p.userId === session.user.id);
    const lastReadAt = myParticipant?.lastReadAt ?? new Date(0);
    const lastMessage = conv.messages[0] ?? null;
    const hasUnread = lastMessage ? lastMessage.createdAt > lastReadAt && lastMessage.senderId !== session.user.id : false;

    return {
      id: conv.id,
      title: conv.title,
      isGroup: conv.isGroup,
      updatedAt: conv.updatedAt,
      participants: conv.participants.map((p) => p.user),
      lastMessage,
      hasUnread,
    };
  });

  return NextResponse.json(withUnread);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantIds, title } = (await req.json()) as {
    participantIds: string[];
    title?: string;
  };

  if (!participantIds || participantIds.length === 0) {
    return NextResponse.json({ error: "participantIds required" }, { status: 400 });
  }

  const allIds = Array.from(new Set([session.user.id, ...participantIds]));

  if (!title && allIds.length === 2) {
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: allIds.map((uid) => ({
          participants: { some: { userId: uid } },
        })),
        participants: { every: { userId: { in: allIds } } },
      },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id });
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: title ?? null,
      isGroup: allIds.length > 2,
      participants: {
        create: allIds.map((userId) => ({ userId })),
      },
    },
  });

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}
