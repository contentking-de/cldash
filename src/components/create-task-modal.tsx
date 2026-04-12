"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import type { TaskUser } from "./kanban-board";

export function CreateTaskModal({
  defaultStatus,
  users,
  onClose,
  onCreated,
}: {
  defaultStatus: string;
  users: TaskUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          status: defaultStatus,
          priority,
          assigneeIds,
          dueDate: dueDate || null,
        }),
      });

      if (res.ok) {
        toast.success("Task erstellt");
        onCreated();
      } else {
        toast.error("Fehler beim Erstellen");
      }
    } catch {
      toast.error("Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  const selectedUsers = users.filter((u) => assigneeIds.includes(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Neuer Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titel</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task-Titel eingeben..."
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optionale Beschreibung..."
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prioritaet</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 pl-3.5 pr-8 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                <option value="LOW">Niedrig</option>
                <option value="MEDIUM">Mittel</option>
                <option value="HIGH">Hoch</option>
                <option value="URGENT">Dringend</option>
              </select>
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Zuweisen an</label>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown((v) => !v)}
                className="flex items-center justify-between w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-left focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
              >
                <span className={selectedUsers.length === 0 ? "text-slate-400" : "text-slate-900 truncate"}>
                  {selectedUsers.length === 0
                    ? "Niemand"
                    : selectedUsers.length === 1
                      ? selectedUsers[0].name || selectedUsers[0].email
                      : `${selectedUsers.length} Personen`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        assigneeIds.includes(u.id)
                          ? "bg-primary-600 border-primary-600"
                          : "border-slate-300"
                      }`}>
                        {assigneeIds.includes(u.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{u.name || u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full"
                >
                  {u.name || u.email}
                  <button type="button" onClick={() => toggleAssignee(u.id)} className="hover:text-primary-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deadline</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 transition"
            >
              {loading ? "Erstellen..." : "Task erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
