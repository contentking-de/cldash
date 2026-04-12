import { MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Task } from "./kanban-board";

const priorityConfig: Record<string, { label: string; dot: string }> = {
  LOW: { label: "Niedrig", dot: "bg-slate-400" },
  MEDIUM: { label: "Mittel", dot: "bg-blue-400" },
  HIGH: { label: "Hoch", dot: "bg-amber-500" },
  URGENT: { label: "Dringend", dot: "bg-red-500" },
};

export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const initials = task.assignee?.name
    ? task.assignee.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : task.assignee?.email?.[0]?.toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 mb-2 hover:border-slate-300 hover:shadow-sm transition cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${priority.dot}`} />
        <p className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</p>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.dueDate), "dd. MMM", { locale: de })}
            </span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task._count.comments}
            </span>
          )}
        </div>

        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-semibold">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
