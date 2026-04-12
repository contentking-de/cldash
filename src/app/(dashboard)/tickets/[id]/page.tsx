"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Send, Bug, Lightbulb, Sparkles, Trash2, Pencil, Check, X } from "lucide-react";
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

const typeOptions = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE", label: "Feature Request" },
  { value: "IDEA", label: "Idee" },
];

const statusOptions = [
  { value: "OPEN", label: "Offen" },
  { value: "IN_PROGRESS", label: "In Arbeit" },
  { value: "RESOLVED", label: "Gelöst" },
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

  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

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

  async function patchTicket(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      await fetchTicket();
      toast.success("Gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  function startEditTitle() {
    if (!ticket) return;
    setEditTitle(ticket.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }

  async function saveTitle() {
    if (!editTitle.trim() || editTitle === ticket?.title) {
      setEditingTitle(false);
      return;
    }
    await patchTicket({ title: editTitle.trim() });
    setEditingTitle(false);
  }

  function startEditDesc() {
    if (!ticket) return;
    setEditDesc(ticket.description);
    setEditingDesc(true);
    setTimeout(() => descInputRef.current?.focus(), 50);
  }

  async function saveDesc() {
    if (!editDesc.trim() || editDesc === ticket?.description) {
      setEditingDesc(false);
      return;
    }
    await patchTicket({ description: editDesc.trim() });
    setEditingDesc(false);
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
    if (!confirm("Ticket wirklich löschen?")) return;
    const res = await fetch(`/api/tickets/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ticket gelöscht");
      router.push("/tickets");
    } else {
      const data = await res.json();
      toast.error(data.error || "Fehler beim Löschen");
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
          Zurück zu Tickets
        </Link>
        <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 transition" title="Ticket löschen">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        {/* Type badge + timestamp */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${type?.color}`}>
            <TypeIcon className="w-3 h-3" />
            {type?.label}
          </span>
          <span className="text-xs text-slate-400">
            {format(new Date(ticket.createdAt), "dd. MMM yyyy, HH:mm", { locale: de })}
          </span>
        </div>

        {/* Editable Title */}
        {editingTitle ? (
          <div className="flex items-center gap-2 mb-4">
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              disabled={saving}
              className="flex-1 text-xl font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            />
            <button
              onClick={saveTitle}
              disabled={saving}
              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="group flex items-start gap-2 mb-4">
            <h1 className="text-xl font-bold text-slate-900 flex-1">{ticket.title}</h1>
            <button
              onClick={startEditTitle}
              className="p-1.5 rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 mt-0.5"
              title="Titel bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editable Description */}
        {editingDesc ? (
          <div className="mb-6">
            <textarea
              ref={descInputRef}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingDesc(false);
              }}
              disabled={saving}
              rows={6}
              className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3.5 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={saveDesc}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition"
              >
                Speichern
              </button>
              <button
                onClick={() => setEditingDesc(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative mb-6">
            <p className="text-sm text-slate-700 whitespace-pre-wrap pr-8">{ticket.description}</p>
            <button
              onClick={startEditDesc}
              className="absolute top-0 right-0 p-1.5 rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Beschreibung bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Properties */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => patchTicket({ status: e.target.value })}
              disabled={saving}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition disabled:opacity-50"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Priorität</label>
            <select
              value={ticket.priority}
              onChange={(e) => patchTicket({ priority: e.target.value })}
              disabled={saving}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition disabled:opacity-50"
            >
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Typ</label>
            <select
              value={ticket.type}
              onChange={(e) => patchTicket({ type: e.target.value })}
              disabled={saving}
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition disabled:opacity-50"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Erstellt von</label>
            <p className="text-sm text-slate-700 py-1.5">{ticket.reporter.name || ticket.reporter.email}</p>
          </div>
        </div>
      </div>

      {/* Comments */}
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
