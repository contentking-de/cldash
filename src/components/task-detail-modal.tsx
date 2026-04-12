"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import type { Task, TaskUser } from "./kanban-board";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: TaskUser;
};

const priorityOptions = [
  { value: "LOW", label: "Niedrig" },
  { value: "MEDIUM", label: "Mittel" },
  { value: "HIGH", label: "Hoch" },
  { value: "URGENT", label: "Dringend" },
];

const statusOptions = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Arbeit" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Erledigt" },
];

export function TaskDetailModal({
  task,
  users,
  onClose,
  onUpdate,
}: {
  task: Task;
  users: TaskUser[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${task.id}/comments`);
    if (res.ok) setComments(await res.json());
  }, [task.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleUpdate(field: string, value: string | null) {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      onUpdate();
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSendingComment(true);

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch {
      toast.error("Fehler beim Kommentieren");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Task wirklich loeschen?")) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task geloescht");
        onClose();
        onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || "Fehler beim Loeschen");
      }
    } catch {
      toast.error("Fehler beim Loeschen");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl mx-4 mb-16 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Task Details</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="p-1.5 text-slate-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== task.title) handleUpdate("title", title); }}
            className="block w-full text-lg font-semibold text-slate-900 border-0 border-b border-transparent hover:border-slate-200 focus:border-primary-500 focus:ring-0 px-0 py-1 transition"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => { if (description !== (task.description || "")) handleUpdate("description", description || null); }}
            rows={3}
            placeholder="Beschreibung hinzufuegen..."
            className="block w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition resize-none"
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); handleUpdate("status", e.target.value); }}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prioritaet</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); handleUpdate("priority", e.target.value); }}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Zugewiesen an</label>
              <select
                value={assigneeId}
                onChange={(e) => { setAssigneeId(e.target.value); handleUpdate("assigneeId", e.target.value || null); }}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                <option value="">Niemand</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Kommentare ({comments.length})
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {comments.length === 0 && (
                <p className="text-sm text-slate-400">Noch keine Kommentare.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {c.author.name?.[0]?.toUpperCase() || c.author.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {c.author.name || c.author.email}
                      </span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(c.createdAt), "dd. MMM, HH:mm", { locale: de })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
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
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={sendingComment || !newComment.trim()}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
