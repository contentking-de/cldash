import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { resend, fromEmail } from "@/lib/resend";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Nutzer existiert bereits" }, { status: 400 });
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "Einladung bereits gesendet" }, { status: 400 });
  }

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name: name || null,
      role: role || "MEMBER",
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/login?email=${encodeURIComponent(email)}`;
  const greeting = name ? `Hallo ${name},` : "Hallo,";

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Einladung zum clever.legal Admin Dashboard",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Admin Dashboard</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 8px;">
            ${greeting}
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">
            Du wurdest von <strong>${session.user.name || session.user.email}</strong> eingeladen, dem Team beizutreten. Klicke auf den Button, um loszulegen:
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
            Einladung annehmen
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
            Diese Einladung ist 7 Tage gueltig.
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ success: true, invitation: { id: invitation.id, email } }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { invitedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

  await prisma.invitation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
