import Link from "next/link";

interface Task {
  id: number;
  title: string;
  assignee: "Jorge" | "Nancy";
  status: "pending" | "done";
}

const tasks: Task[] = [
  { id: 1, title: "Lavar ropa", assignee: "Nancy", status: "done" },
  { id: 2, title: "Regar plantas", assignee: "Jorge", status: "pending" },
  { id: 3, title: "Comprar supermercado", assignee: "Jorge", status: "pending" },
];

export default function TasksPage() {
  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Tareas
        </h1>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Inicio
        </Link>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  task.status === "done" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <div>
                <p
                  className={`font-medium ${
                    task.status === "done"
                      ? "line-through text-slate-500"
                      : "text-white"
                  }`}
                >
                  {task.title}
                </p>
                <p className="text-sm text-slate-400">{task.assignee}</p>
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                task.status === "done"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-amber-400/10 text-amber-400"
              }`}
            >
              {task.status === "done" ? "Hecho" : "Pendiente"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
