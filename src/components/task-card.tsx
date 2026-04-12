import { MessageSquare, Calendar, AlertTriangle, UserCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { de } from "date-fns/locale";
import type { Task } from "./kanban-board";

const priorityConfig: Record<string, { label: string; dot: string }> = {
  LOW: { label: "Niedrig", dot: "bg-slate-400" },
  MEDIUM: { label: "Mittel", dot: "bg-blue-400" },
  HIGH: { label: "Hoch", dot: "bg-amber-500" },
  URGENT: { label: "Dringend", dot: "bg-red-500" },
};

function getDueDateStyle(dueDate: string, status: string) {
  if (status === "DONE") return "text-slate-400";
  const date = new Date(dueDate);
  if (isToday(date)) return "text-amber-600 font-medium";
  if (isPast(date)) return "text-red-500 font-medium";
  return "text-slate-400";
}

export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  const isOverdue = task.dueDate && task.status !== "DONE" && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

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
      className={`w-full text-left bg-white border rounded-lg p-3 mb-2 hover:shadow-sm transition cursor-grab active:cursor-grabbing select-none ${isOverdue ? "border-red-300 hover:border-red-400" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${priority.dot}`} />
        <p className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</p>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2 ml-3.5">{task.description}</p>
      )}

      {task.creator && (
        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 ml-3.5">
          <UserCircle className="w-3 h-3" />
          <span>{task.creator.name || task.creator.email}</span>
          <span>·</span>
          <span>{format(new Date(task.createdAt), "dd. MMM yyyy", { locale: de })}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs">
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${getDueDateStyle(task.dueDate, task.status)}`}>
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              {format(new Date(task.dueDate), "dd. MMM", { locale: de })}
            </span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <MessageSquare className="w-3 h-3" />
              {task._count.comments}
            </span>
          )}
        </div>

        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((assignee) => {
              const initials = assignee.name
                ? assignee.name.split(" ").map((n) => n[0]).join("").toUpperCase()
                : assignee.email[0].toUpperCase();
              return (
                <div
                  key={assignee.id}
                  title={assignee.name || assignee.email}
                  className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-semibold ring-2 ring-white"
                >
                  {initials}
                </div>
              );
            })}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-semibold ring-2 ring-white">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
