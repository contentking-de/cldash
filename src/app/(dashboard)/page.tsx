import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  KanbanSquare,
  Ticket,
  Users,
  AlertCircle,
} from "lucide-react";

async function getStats() {
  const [taskCount, ticketCount, openTickets, userCount] = await Promise.all([
    prisma.task.count(),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.user.count(),
  ]);
  return { taskCount, ticketCount, openTickets, userCount };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const stats = await getStats();

  const cards = [
    {
      title: "Offene Tasks",
      value: stats.taskCount,
      icon: KanbanSquare,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Tickets gesamt",
      value: stats.ticketCount,
      icon: Ticket,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      title: "Offene Tickets",
      value: stats.openTickets,
      icon: AlertCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Team-Mitglieder",
      value: stats.userCount,
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Willkommen zurueck, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-[18px] h-[18px] ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
