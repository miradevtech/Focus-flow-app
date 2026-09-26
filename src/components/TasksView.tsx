import React, { useState } from 'react';
import { Task, Priority, ChecklistItem } from '../types';
import { api } from '../api/client';
import { Plus, Search, CheckCircle2, Clock, Trash2, Edit3, Eye, X } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onRefresh, onOpenQuickAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state for Add/Edit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('General');
  const [checklist, setChecklist] = useState<Array<{ title: string; completed: boolean }>>([]);

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDueTime('');
    setPriority('medium');
    setCategory('General');
    setChecklist([]);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
    setDueTime(task.dueTime || '');
    setPriority(task.priority);
    setCategory(task.category || 'General');
    setChecklist(task.checklist ? task.checklist.map(c => ({ title: c.title, completed: c.completed })) : []);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const formattedChecklist = checklist.map((c, i) => ({
        id: editingTask?.checklist?.[i]?.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: c.title,
        completed: c.completed
      }));

      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title,
          description,
          dueDate,
          dueTime,
          priority,
          category,
          checklist: formattedChecklist
        });
        setEditingTask(null);
      } else {
        await api.createTask({
          title,
          description,
          dueDate,
          dueTime,
          priority,
          category,
          checklist: formattedChecklist
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await api.updateTask(id, { completed, completedAt: completed ? new Date().toISOString() : null });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklistItem = async (taskId: string, itemId: string) => {
    try {
      await api.toggleTaskChecklist(taskId, itemId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'completed' ? t.completed : !t.completed);
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400 text-sm">Organize your daily actionable steps</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12141C] border border-[#2A2E3D] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#12141C] border border-[#2A2E3D] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#12141C] border border-[#2A2E3D] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
            <h3 className="text-white font-medium text-lg">No tasks found</h3>
            <p className="text-gray-400 text-sm">Create your first task to get started.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium hover:bg-indigo-600/30 transition-all inline-block mt-2"
            >
              Create Task
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const checklistItems = task.checklist || [];
            const completedCount = checklistItems.filter(c => c.completed).length;
            const totalCount = checklistItems.length;
            const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : task.completed ? 100 : 0;

            return (
              <div
                key={task.id}
                onClick={() => setViewingTask(task)}
                className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggle(task.id, !task.completed)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-[#2A2E3D] bg-[#1A1D29] hover:border-indigo-500'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => setViewingTask(task)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-white font-medium text-base ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        task.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-400 bg-[#1A1D29] px-2 py-0.5 rounded-md border border-[#2A2E3D]">
                        {task.category || 'General'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-1">{task.description}</p>
                    )}

                    {/* Checklist Summary */}
                    {totalCount > 0 && (
                      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{completedCount}/{totalCount} actions completed</span>
                          <span className="text-indigo-400 font-medium">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-[#1A1D29] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="space-y-1 pt-1">
                          {checklistItems.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklistItem(task.id, item.id)}
                                className="w-3.5 h-3.5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                              />
                              <span className={item.completed ? 'line-through text-gray-500' : ''}>{item.title}</span>
                            </div>
                          ))}
                          {totalCount > 3 && (
                            <p className="text-[11px] text-indigo-400 pl-5">+{totalCount - 3} more actions</p>
                          )}
                        </div>
                      </div>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Due {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons: View, Edit, Delete */}
                <div className="flex items-center gap-1.5 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingTask(task)}
                    title="View Task"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(task)}
                    title="Edit Task"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    title="Delete Task"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {(isAddOpen || editingTask) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h2>
              <button
                onClick={() => { setIsAddOpen(false); setEditingTask(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Finish quarterly report"
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details or context..."
                  rows={3}
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Due Time (24-hr)</label>
                  <input
                    type="time"
                    step="60"
                    lang="en-GB"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Work, Personal..."
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions / Checklist matching IMG_9242.png */}
              <div className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm">Actions</h3>
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => {
                          const updated = [...checklist];
                          updated[index].completed = e.target.checked;
                          setChecklist(updated);
                        }}
                        className="w-5 h-5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...checklist];
                          updated[index].title = e.target.value;
                          setChecklist(updated);
                        }}
                        placeholder="Action title..."
                        className="flex-1 bg-transparent border-b border-[#2A2E3D] text-white py-1 px-1 focus:outline-none focus:border-indigo-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setChecklist(checklist.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChecklist([...checklist, { title: '', completed: false }])}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 mt-2"
                >
                  + Add Action
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingTask(null); }}
                  className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white py-3 rounded-xl font-medium text-sm transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  viewingTask.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  viewingTask.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {viewingTask.priority}
                </span>
                <span className="text-xs text-gray-400 bg-[#1A1D29] px-2.5 py-0.5 rounded-md border border-[#2A2E3D]">
                  {viewingTask.category || 'General'}
                </span>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{viewingTask.title}</h2>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                {viewingTask.description || 'No description provided.'}
              </p>
            </div>

            {viewingTask.dueDate && (
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#1A1D29] p-3 rounded-xl border border-[#2A2E3D]">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Due {viewingTask.dueDate} {viewingTask.dueTime ? `at ${viewingTask.dueTime}` : ''}</span>
              </div>
            )}

            {/* Checklist in view */}
            {viewingTask.checklist && viewingTask.checklist.length > 0 && (
              <div className="space-y-3 bg-[#1A1D29] p-4 rounded-2xl border border-[#2A2E3D]">
                <h3 className="text-white font-semibold text-sm">Action Checklist</h3>
                <div className="space-y-2">
                  {viewingTask.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          handleToggleChecklistItem(viewingTask.id, item.id);
                          setViewingTask({
                            ...viewingTask,
                            checklist: viewingTask.checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c)
                          });
                        }}
                        className="w-4 h-4 rounded border-[#2A2E3D] bg-[#12141C] text-indigo-600 focus:ring-0"
                      />
                      <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const t = viewingTask;
                  setViewingTask(null);
                  handleOpenEdit(t);
                }}
                className="flex-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Task</span>
              </button>
              <button
                onClick={() => setViewingTask(null)}
                className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
