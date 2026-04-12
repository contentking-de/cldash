"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Search, User, X } from "lucide-react";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";
import { CreateTaskModal } from "./create-task-modal";
import toast from "react-hot-toast";

export type TaskUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  order: number;
  dueDate: string | null;
  creatorId: string;
  assignees: TaskUser[];
  creator: TaskUser;
  _count: { comments: number };
  createdAt: string;
  updatedAt: string;
};

const COLUMNS = [
  { id: "BACKLOG", title: "Backlog", color: "bg-slate-100 text-slate-600" },
  { id: "TODO", title: "To Do", color: "bg-blue-100 text-blue-700" },
  { id: "IN_PROGRESS", title: "In Arbeit", color: "bg-amber-100 text-amber-700" },
  { id: "REVIEW", title: "Review", color: "bg-violet-100 text-violet-700" },
  { id: "DONE", title: "Erledigt", color: "bg-emerald-100 text-emerald-700" },
];

const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id));

function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onSelectTask,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onAddTask: () => void;
  onSelectTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${column.color}`}
          >
            {column.title}
          </span>
          <span className="text-xs text-slate-400">{tasks.length}</span>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver
            ? "bg-primary-50 border-2 border-dashed border-primary-200"
            : "bg-slate-50"
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ users, currentUserId }: { users: TaskUser[]; currentUserId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [showMyTasks, setShowMyTasks] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && tasks.length > 0 && !selectedTask) {
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        setSelectedTask(found);
        router.replace("/tasks", { scroll: false });
      }
    }
  }, [searchParams, tasks, selectedTask, router]);

  useEffect(() => {
    function onCreateTask() {
      setCreateInColumn("TODO");
    }
    window.addEventListener("create-task", onCreateTask);
    return () => window.removeEventListener("create-task", onCreateTask);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const hasActiveFilters = searchQuery !== "" || filterAssignee !== "" || showMyTasks;

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (showMyTasks) {
      result = result.filter((t) => t.assignees.some((a) => a.id === currentUserId) || t.creatorId === currentUserId);
    }

    if (filterAssignee) {
      result = result.filter((t) => t.assignees.some((a) => a.id === filterAssignee));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [tasks, searchQuery, filterAssignee, showMyTasks, currentUserId]);

  const getColumnTasks = useCallback(
    (status: string) => {
      return filteredTasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order);
    },
    [filteredTasks],
  );

  function findColumn(id: string): string | undefined {
    if (COLUMN_IDS.has(id)) return id;
    return tasks.find((t) => t.id === id)?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCol = findColumn(activeId);
    const overCol = findColumn(overId);

    if (!activeCol || !overCol || activeCol === overCol) return;

    setTasks((prev) => {
      const sourceTasks = prev
        .filter((t) => t.status === activeCol && t.id !== activeId)
        .sort((a, b) => a.order - b.order);
      const destTasks = prev
        .filter((t) => t.status === overCol && t.id !== activeId)
        .sort((a, b) => a.order - b.order);

      let insertIndex: number;
      if (COLUMN_IDS.has(overId)) {
        insertIndex = destTasks.length;
      } else {
        const overIndex = destTasks.findIndex((t) => t.id === overId);
        const isBelowOver =
          (active.rect.current.translated?.top ?? 0) >
          over.rect.top + over.rect.height / 2;
        insertIndex = isBelowOver ? overIndex + 1 : overIndex;
      }

      const movedTask = prev.find((t) => t.id === activeId);
      if (!movedTask) return prev;

      const newSourceTasks = sourceTasks.map((t, i) => ({
        ...t,
        order: i,
      }));
      const newDestTasks = [...destTasks];
      newDestTasks.splice(insertIndex, 0, {
        ...movedTask,
        status: overCol,
      });
      const reorderedDest = newDestTasks.map((t, i) => ({ ...t, order: i }));

      const untouched = prev.filter(
        (t) => t.status !== activeCol && t.status !== overCol && t.id !== activeId,
      );

      return [...untouched, ...newSourceTasks, ...reorderedDest];
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const draggedTask = activeTask;
    setActiveTask(null);

    if (!over || !draggedTask) {
      fetchTasks();
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const originalCol = draggedTask.status;
    const targetCol = COLUMN_IDS.has(overId) ? overId : tasks.find((t) => t.id === overId)?.status;

    if (!targetCol) {
      fetchTasks();
      return;
    }

    if (originalCol === targetCol) {
      const columnTasks = tasks
        .filter((t) => t.status === originalCol)
        .sort((a, b) => a.order - b.order);

      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      let newIndex: number;

      if (COLUMN_IDS.has(overId)) {
        newIndex = columnTasks.length - 1;
      } else {
        newIndex = columnTasks.findIndex((t) => t.id === overId);
      }

      if (oldIndex !== newIndex && newIndex >= 0) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        setTasks((prev) => {
          const others = prev.filter((t) => t.status !== originalCol);
          return [...others, ...reordered.map((t, i) => ({ ...t, order: i }))];
        });

        try {
          await fetch("/api/tasks/reorder", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: activeId,
              newStatus: originalCol,
              newOrder: newIndex,
            }),
          });
        } catch {
          toast.error("Fehler beim Verschieben");
        }
        fetchTasks();
      }
    } else {
      const destTasks = tasks
        .filter((t) => t.status === targetCol)
        .sort((a, b) => a.order - b.order);

      const newIndex = destTasks.findIndex((t) => t.id === activeId);
      const finalIndex = newIndex >= 0 ? newIndex : destTasks.length;

      try {
        await fetch("/api/tasks/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: activeId,
            newStatus: targetCol,
            newOrder: finalIndex,
          }),
        });
      } catch {
        toast.error("Fehler beim Verschieben");
      }
      fetchTasks();
    }
  }

  function handleTaskCreated() {
    setCreateInColumn(null);
    fetchTasks();
  }

  function handleTaskUpdated() {
    fetchTasks();
    if (selectedTask) {
      fetch("/api/tasks")
        .then((res) => (res.ok ? res.json() : []))
        .then((allTasks: Task[]) => {
          const updated = allTasks.find((t) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tasks durchsuchen..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
          />
        </div>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-sm text-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
        >
          <option value="">Alle Mitglieder</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowMyTasks((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition ${
            showMyTasks
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <User className="w-4 h-4" />
          Meine Tasks
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setFilterAssignee(""); setShowMyTasks(false); }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-3.5 h-3.5" />
            Filter zuruecksetzen
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getColumnTasks(column.id)}
              onAddTask={() => setCreateInColumn(column.id)}
              onSelectTask={setSelectedTask}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="rotate-3 scale-105">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
        />
      )}

      {createInColumn && (
        <CreateTaskModal
          defaultStatus={createInColumn}
          users={users}
          onClose={() => setCreateInColumn(null)}
          onCreated={handleTaskCreated}
        />
      )}
    </>
  );
}
