import React from 'react';
import { Task, Goal, Project, ShoppingItem, Alert, Note, Person, TabType } from '../types';
import {
  CheckSquare,
  Target,
  FolderKanban,
  ShoppingCart,
  Bell,
  ArrowRight,
  Plus,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface HomeViewProps {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  shoppingItems: ShoppingItem[];
  alerts: Alert[];
  notes: Note[];
  people: Person[];
  onNavigate: (tab: TabType) => void;
  onOpenQuickAdd: () => void;
  onToggleTask: (id: string, completed: boolean) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tasks,
  goals,
  projects,
  shoppingItems,
  alerts,
  notes,
  people,
  onNavigate,
  onOpenQuickAdd,
  onToggleTask
}) => {
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const pendingShopping = shoppingItems.filter((s) => !s.purchased);
  const upcomingAlerts = alerts.filter((a) => a.status === 'pending');
  const activeGoals = goals.filter((g) => g.status === 'active');
  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 via-zinc-950 to-purple-950/55 border border-blue-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
            <Flame className="w-3.5 h-3.5" />
            <span>Productivity Pulse</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Stay focused, achieve more.
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            You have completed {completedTasksCount} of {tasks.length} tasks today ({taskProgress}%). Keep your momentum going!
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenQuickAdd}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/25 text-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Create</span>
            </button>
            <button
              onClick={() => onNavigate('tasks')}
              className="px-5 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-medium rounded-xl border border-zinc-800 text-sm transition-all flex items-center gap-2"
            >
              <span>View Tasks</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tasks', count: tasks.length, icon: CheckSquare, tab: 'tasks', color: 'text-blue-400', bg: 'bg-blue-600/10' },
          { label: 'Goals', count: goals.length, icon: Target, tab: 'goals', color: 'text-purple-400', bg: 'bg-purple-600/10' },
          { label: 'Projects', count: projects.length, icon: FolderKanban, tab: 'projects', color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
          { label: 'Shopping', count: pendingShopping.length, icon: ShoppingCart, tab: 'shopping', color: 'text-amber-400', bg: 'bg-amber-600/10' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(stat.tab as TabType)}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{stat.count}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <span>Today's Priority Tasks</span>
            </h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              View all ({tasks.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-sm text-zinc-400 mb-3">No tasks created yet.</p>
              <button
                onClick={onOpenQuickAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => onToggleTask(task.id, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-800"
                    />
                    <div>
                      <h4 className={`text-sm font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      {task.dueDate && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {task.dueDate} {task.dueTime}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      task.priority === 'urgent'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : task.priority === 'high'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Alerts & Active Goals */}
        <div className="space-y-6">
          {/* Upcoming Alerts */}
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <span>Upcoming Alerts</span>
              </h3>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View all
              </button>
            </div>

            {upcomingAlerts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No upcoming reminders.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h4 className="text-xs font-semibold text-white">{alert.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" /> {alert.date} at {alert.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Goals Preview */}
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Active Goals</span>
              </h3>
              <button
                onClick={() => onNavigate('goals')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                View all
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No active goals yet.</p>
            ) : (
              <div className="space-y-2.5">
                {activeGoals.slice(0, 3).map((goal) => {
                  const completedCheck = goal.checklist.filter((c) => c.completed).length;
                  const totalCheck = goal.checklist.length;
                  const pct = totalCheck > 0 ? Math.round((completedCheck / totalCheck) * 100) : 0;
                  return (
                    <div key={goal.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <h4 className="text-xs font-semibold text-white mb-2">{goal.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
