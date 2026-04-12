"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Bug, Lightbulb, Sparkles, MessageSquare } from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
  assignee: { id: string; name: string | null; email: string } | null;
  _count: { comments: number };
};

const typeConfig: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  BUG: { label: "Bug", icon: Bug, color: "bg-red-50 text-red-700" },
  FEATURE: { label: "Feature", icon: Sparkles, color: "bg-violet-50 text-violet-700" },
  IDEA: { label: "Idee", icon: Lightbulb, color: "bg-amber-50 text-amber-700" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Offen", color: "bg-blue-50 text-blue-700" },
  IN_PROGRESS: { label: "In Arbeit", color: "bg-amber-50 text-amber-700" },
  RESOLVED: { label: "Geloest", color: "bg-emerald-50 text-emerald-700" },
  CLOSED: { label: "Geschlossen", color: "bg-slate-100 text-slate-600" },
};

const priorityConfig: Record<string, { label: string; dot: string }> = {
  LOW: { label: "Niedrig", dot: "bg-slate-400" },
  MEDIUM: { label: "Mittel", dot: "bg-blue-400" },
  HIGH: { label: "Hoch", dot: "bg-amber-500" },
  URGENT: { label: "Dringend", dot: "bg-red-500" },
};

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    async function fetchTickets() {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/tickets?${params}`);
      if (res.ok) setTickets(await res.json());
      setLoading(false);
    }
    fetchTickets();
  }, [filterType, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
          >
            <option value="">Alle Typen</option>
            <option value="BUG">Bugs</option>
            <option value="FEATURE">Features</option>
            <option value="IDEA">Ideen</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
          >
            <option value="">Alle Status</option>
            <option value="OPEN">Offen</option>
            <option value="IN_PROGRESS">In Arbeit</option>
            <option value="RESOLVED">Geloest</option>
            <option value="CLOSED">Geschlossen</option>
          </select>
        </div>

        <Link
          href="/tickets/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Neues Ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <p className="text-sm text-slate-500">Keine Tickets gefunden.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Typ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prioritaet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Erstellt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Zugewiesen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => {
                const type = typeConfig[ticket.type];
                const status = statusConfig[ticket.status];
                const priority = priorityConfig[ticket.priority];
                const TypeIcon = type?.icon || Bug;

                return (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${ticket.id}`} className="group">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition">
                          {ticket.title}
                        </p>
                        {ticket._count.comments > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <MessageSquare className="w-3 h-3" />
                            {ticket._count.comments}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${type?.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {type?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status?.color}`}>
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${priority?.dot}`} />
                        <span className="text-xs text-slate-600">{priority?.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {format(new Date(ticket.createdAt), "dd. MMM yyyy", { locale: de })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {ticket.assignee?.name || ticket.assignee?.email || "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
