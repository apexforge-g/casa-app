"use client";

import { useState } from "react";
import { Task } from "@/types";
import CategoryBadge from "./CategoryBadge";

const priorityColors = {
  alta: "bg-red-500",
  media: "bg-yellow-500",
  baja: "bg-green-500",
};

const assignLabel = (assignedTo: string, userId: string) => {
  if (assignedTo === "both") return "Ambos";
  if (assignedTo === userId) return "Yo";
  return "Otro";
};

interface TaskCardProps {
  task: Task;
  userId: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  userMap: Record<string, string>;
}

export default function TaskCard({ task, userId, onComplete, onDelete, userMap }: TaskCardProps) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = () => {
    setCompleting(true);
    setTimeout(() => onComplete(task.id), 400);
  };

  const assignedName = task.assigned_to === "both"
    ? "Ambos"
    : userMap[task.assigned_to] || "?";

  return (
    <div
      className={`group bg-slate-800/60 rounded-xl p-4 flex items-start gap-3 transition-all ${
        completing ? "task-completing" : ""
      }`}
    >
      {/* Complete button */}
      <button
        onClick={handleComplete}
        className="mt-0.5 w-6 h-6 rounded-full border-2 border-slate-600 flex-shrink-0 hover:border-green-400 hover:bg-green-400/20 transition-colors flex items-center justify-center"
      >
        {completing && <span className="text-green-400 text-sm">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-slate-100 leading-tight">{task.title}</h3>
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm flex-shrink-0 p-1"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {task.categories && <CategoryBadge category={task.categories} />}
          <span className="text-xs text-slate-500">👤 {assignedName}</span>
          <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
          {task.due_date && (
            <span className="text-xs text-slate-500">
              📅 {new Date(task.due_date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
