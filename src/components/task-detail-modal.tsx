"use client";

import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from "react";
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
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const filteredMentionUsers = mentionQuery !== null
    ? users.filter((u) => {
        const q = mentionQuery.toLowerCase();
        return (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      })
    : [];

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
        body: JSON.stringify({
          content: newComment,
          mentionedUserIds: Array.from(mentionedUserIds),
        }),
      });
      if (res.ok) {
        setNewComment("");
        setMentionedUserIds(new Set());
        fetchComments();
      }
    } catch {
      toast.error("Fehler beim Kommentieren");
    } finally {
      setSendingComment(false);
    }
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[1].length - 1);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function handleCommentKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredMentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMentionUsers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentionUsers[mentionIndex]);
      } else if (e.key === "Escape") {
        setMentionQuery(null);
      }
    }
  }

  function insertMention(user: TaskUser) {
    const displayName = user.name || user.email;
    const before = newComment.slice(0, mentionStartPos);
    const after = newComment.slice(textareaRef.current?.selectionStart ?? mentionStartPos);
    const inserted = `@${displayName} `;
    setNewComment(before + inserted + after);
    setMentionedUserIds((prev) => new Set(prev).add(user.id));
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  }

  function renderCommentContent(content: string) {
    const parts = content.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionName = part.slice(1);
        const matched = users.some(
          (u) => u.name === mentionName || u.email === mentionName
        );
        if (matched) {
          return (
            <span key={i} className="text-primary-600 font-medium">
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
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
                className="block w-full rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
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
                className="block w-full rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
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
                className="block w-full rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                <option value="">Niemand</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleUpdate("dueDate", e.target.value || null);
                }}
                className="block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => { setDueDate(""); handleUpdate("dueDate", null); }}
                  className="text-xs text-slate-400 hover:text-red-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
                    <p className="text-sm text-slate-600 mt-0.5">{renderCommentContent(c.content)}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Kommentar schreiben... (@Name zum Erwähnen)"
                    rows={2}
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition resize-none"
                  />
                  {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                    <div
                      ref={mentionListRef}
                      className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50"
                    >
                      {filteredMentionUsers.slice(0, 6).map((u, i) => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                            i === mentionIndex ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                          </span>
                          <span className="truncate">
                            {u.name || u.email}
                            {u.name && <span className="text-slate-400 ml-1 text-xs">{u.email}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={sendingComment || !newComment.trim()}
                  className="self-end px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
