"use client";

import { Plus } from "lucide-react";

export function NewTaskButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("create-task"))}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
    >
      <Plus className="w-4 h-4" />
      Neuer Task
    </button>
  );
}
