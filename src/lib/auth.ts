import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { fromEmail } from "@/lib/resend";
import type { Role } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: fromEmail,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { Resend: ResendClient } = await import("resend");
        const resend = new ResendClient(process.env.RESEND_API_KEY);

        // Redirect through an intermediate page to prevent email scanners
        // from consuming the token via automated GET requests.
        const callbackUrl = new URL(url);
        const token = callbackUrl.searchParams.get("token") ?? "";
        const originalCallback = callbackUrl.searchParams.get("callbackUrl") ?? "/";
        const confirmParams = new URLSearchParams({
          token,
          email,
          callbackUrl: originalCallback,
        });
        const confirmUrl = `${callbackUrl.origin}/confirm-login?${confirmParams.toString()}`;

        await resend.emails.send({
          from: provider.from!,
          to: email,
          subject: "Login bei clever.legal Admin",
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Admin Dashboard</p>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
                  Klicke auf den Button, um dich einzuloggen:
                </p>
                <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                  Einloggen
                </a>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
                  Dieser Link ist 24 Stunden gueltig. Falls du den Login nicht angefordert hast, kannst du diese E-Mail ignorieren.
                </p>
              </div>
            </div>
          `,
        });
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const invitation = await prisma.invitation.findFirst({
        where: { email: user.email, acceptedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!invitation) return;

      if (invitation.name && !user.name) {
        await prisma.user.update({
          where: { id: user.id! },
          data: { name: invitation.name, role: invitation.role },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id! },
          data: { role: invitation.role },
        });
      }
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role || "MEMBER";
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}
