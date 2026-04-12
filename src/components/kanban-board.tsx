"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
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
  assigneeId: string | null;
  creatorId: string;
  assignee: TaskUser | null;
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

export function KanbanBoard({ users }: { users: TaskUser[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function getColumnTasks(status: string) {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    const newOrder = destination.index;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggableId ? { ...t, status: newStatus, order: newOrder } : t
      )
    );

    try {
      await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: draggableId, newStatus, newOrder }),
      });
      fetchTasks();
    } catch {
      toast.error("Fehler beim Verschieben");
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
        .then((res) => res.ok ? res.json() : [])
        .then((allTasks: Task[]) => {
          const updated = allTasks.find((t) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        });
    }
  }

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setCreateInColumn("TODO")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Neuer Task
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnTasks = getColumnTasks(column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${column.color}`}>
                      {column.title}
                    </span>
                    <span className="text-xs text-slate-400">{columnTasks.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateInColumn(column.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] rounded-lg p-2 transition ${
                        snapshot.isDraggingOver ? "bg-primary-50 border-2 border-dashed border-primary-200" : "bg-slate-50"
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-90" : ""}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => setSelectedTask(task)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
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
