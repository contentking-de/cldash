"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Send, Bug, Lightbulb, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type TicketUser = { id: string; name: string | null; email: string; image?: string | null };

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: TicketUser;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
  reporter: TicketUser;
  assignee: TicketUser | null;
  comments: Comment[];
};

const typeConfig: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  BUG: { label: "Bug", icon: Bug, color: "bg-red-50 text-red-700" },
  FEATURE: { label: "Feature", icon: Sparkles, color: "bg-violet-50 text-violet-700" },
  IDEA: { label: "Idee", icon: Lightbulb, color: "bg-amber-50 text-amber-700" },
};

const statusOptions = [
  { value: "OPEN", label: "Offen" },
  { value: "IN_PROGRESS", label: "In Arbeit" },
  { value: "RESOLVED", label: "Geloest" },
  { value: "CLOSED", label: "Geschlossen" },
];

const priorityOptions = [
  { value: "LOW", label: "Niedrig" },
  { value: "MEDIUM", label: "Mittel" },
  { value: "HIGH", label: "Hoch" },
  { value: "URGENT", label: "Dringend" },
];

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${params.id}`);
    if (res.ok) {
      setTicket(await res.json());
    } else {
      toast.error("Ticket nicht gefunden");
      router.push("/tickets");
    }
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  async function handleStatusChange(status: string) {
    await fetch(`/api/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTicket();
  }

  async function handlePriorityChange(priority: string) {
    await fetch(`/api/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    fetchTicket();
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSendingComment(true);

    try {
      const res = await fetch(`/api/tickets/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchTicket();
      }
    } catch {
      toast.error("Fehler beim Kommentieren");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Ticket wirklich loeschen?")) return;
    const res = await fetch(`/api/tickets/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ticket geloescht");
      router.push("/tickets");
    } else {
      const data = await res.json();
      toast.error(data.error || "Fehler beim Loeschen");
    }
  }

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const type = typeConfig[ticket.type];
  const TypeIcon = type?.icon || Bug;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck zu Tickets
        </Link>
        <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${type?.color}`}>
                <TypeIcon className="w-3 h-3" />
                {type?.label}
              </span>
              <span className="text-xs text-slate-400">
                {format(new Date(ticket.createdAt), "dd. MMM yyyy, HH:mm", { locale: de })}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
          </div>
        </div>

        <p className="text-sm text-slate-700 whitespace-pre-wrap mb-6">{ticket.description}</p>

        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Prioritaet</label>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            >
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Erstellt von</label>
            <p className="text-sm text-slate-700">{ticket.reporter.name || ticket.reporter.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Kommentare ({ticket.comments.length})
        </h2>

        <div className="space-y-4 mb-6">
          {ticket.comments.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Noch keine Kommentare.</p>
          )}
          {ticket.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {c.author.name?.[0]?.toUpperCase() || c.author.email[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {c.author.name || c.author.email}
                  </span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(c.createdAt), "dd. MMM, HH:mm", { locale: de })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Kommentar schreiben..."
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
          />
          <button
            type="submit"
            disabled={sendingComment || !newComment.trim()}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
