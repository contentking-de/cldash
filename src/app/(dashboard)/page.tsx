import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  KanbanSquare,
  Ticket,
  Users,
  AlertCircle,
  Calendar,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  BACKLOG: { label: "Backlog", color: "bg-slate-100 text-slate-600" },
  TODO: { label: "To Do", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Arbeit", color: "bg-amber-100 text-amber-700" },
  REVIEW: { label: "Review", color: "bg-violet-100 text-violet-700" },
  DONE: { label: "Erledigt", color: "bg-emerald-100 text-emerald-700" },
};

const priorityConfig: Record<string, { label: string; dot: string }> = {
  LOW: { label: "Niedrig", dot: "bg-slate-400" },
  MEDIUM: { label: "Mittel", dot: "bg-blue-400" },
  HIGH: { label: "Hoch", dot: "bg-amber-500" },
  URGENT: { label: "Dringend", dot: "bg-red-500" },
};

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

  const [stats, myTasks] = await Promise.all([
    getStats(),
    prisma.task.findMany({
      where: {
        assigneeId: session.user.id,
        status: { not: "DONE" },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
      ],
      include: {
        _count: { select: { comments: true } },
      },
      take: 10,
    }),
  ]);

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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Meine Tasks</h2>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
          >
            Alle Tasks
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {myTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">Keine offenen Tasks zugewiesen.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {myTasks.map((task) => {
              const status = statusConfig[task.status] || statusConfig.TODO;
              const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

              return (
                <Link
                  key={task.id}
                  href="/tasks"
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priority.dot}`} />
                  <p className="text-sm font-medium text-slate-900 flex-1 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {task._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MessageSquare className="w-3 h-3" />
                        {task._count.comments}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.dueDate), "dd. MMM", { locale: de })}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
