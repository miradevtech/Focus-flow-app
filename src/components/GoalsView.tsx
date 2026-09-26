import React, { useState } from 'react';
import { Goal, ChecklistItem } from '../types';
import { api } from '../api/client';
import { Plus, Target, CheckCircle2, Calendar, Trash2, Edit3, Eye, X } from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ goals, onRefresh, onOpenQuickAdd }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingGoal, setViewingGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [checklist, setChecklist] = useState<Array<{ title: string; completed: boolean }>>([]);

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setChecklist([]);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description);
    setTargetDate(goal.targetDate || '');
    setChecklist(goal.checklist ? goal.checklist.map(c => ({ title: c.title, completed: c.completed })) : []);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a goal title.');
      return;
    }

    setIsSaving(true);
    try {
      const formattedChecklist = checklist.map((c, i) => ({
        id: editingGoal?.checklist?.[i]?.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: c.title,
        completed: c.completed
      }));

      if (editingGoal) {
        await api.updateGoal(editingGoal.id, {
          title: title.trim(),
          description: description.trim(),
          targetDate,
          checklist: formattedChecklist
        });
        setEditingGoal(null);
      } else {
        await api.createGoal({
          title: title.trim(),
          description: description.trim(),
          targetDate,
          checklist: formattedChecklist
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      setIsAddOpen(false);
      setEditingGoal(null);
      onRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChecklist = async (goalId: string, itemId: string) => {
    try {
      await api.toggleGoalChecklist(goalId, itemId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.deleteGoal(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-gray-400 text-sm">Define and track your long-term milestones</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-full bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-12 text-center space-y-3">
            <Target className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
            <h3 className="text-white font-medium text-lg">No goals set</h3>
            <p className="text-gray-400 text-sm">Set a goal and start making progress.</p>
            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium hover:bg-indigo-600/30 transition-all inline-block mt-2"
            >
              Create Goal
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const checklistItems = goal.checklist || [];
            const completedCount = checklistItems.filter(c => c.completed).length;
            const totalCount = checklistItems.length;
            const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : goal.status === 'completed' ? 100 : 0;

            return (
              <div
                key={goal.id}
                onClick={() => setViewingGoal(goal)}
                className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-white font-semibold text-lg">{goal.title}</h3>
                    </div>
                    {goal.status === 'completed' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    )}
                  </div>

                  {goal.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{goal.description}</p>
                  )}

                  <div className="space-y-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{completedCount}/{totalCount} milestones completed</span>
                      <span className="text-indigo-400 font-medium">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-[#1A1D29] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {checklistItems.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {checklistItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklist(goal.id, item.id)}
                              className="w-3.5 h-3.5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                            />
                            <span className={item.completed ? 'line-through text-gray-500' : ''}>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {goal.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Target Date: {goal.targetDate}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2E3D]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingGoal(goal)}
                    title="View Goal"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(goal)}
                    title="Edit Goal"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    title="Delete Goal"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Goal Modal */}
      {(isAddOpen || editingGoal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingGoal ? 'Edit Goal' : 'Add Goal'}
              </h2>
              <button
                onClick={() => { setIsAddOpen(false); setEditingGoal(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Set up my apartment"
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description / Success Criteria</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does success look like..."
                  rows={3}
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
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
                  onClick={() => { setIsAddOpen(false); setEditingGoal(null); }}
                  className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white py-3 rounded-xl font-medium text-sm transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Done</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Goal Modal */}
      {viewingGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                {viewingGoal.status === 'completed' && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Completed
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewingGoal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{viewingGoal.title}</h2>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                {viewingGoal.description || 'No description provided.'}
              </p>
            </div>

            {viewingGoal.targetDate && (
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#1A1D29] p-3 rounded-xl border border-[#2A2E3D]">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Target Date: {viewingGoal.targetDate}</span>
              </div>
            )}

            {/* Checklist in view */}
            {viewingGoal.checklist && viewingGoal.checklist.length > 0 && (
              <div className="space-y-3 bg-[#1A1D29] p-4 rounded-2xl border border-[#2A2E3D]">
                <h3 className="text-white font-semibold text-sm">Action Checklist</h3>
                <div className="space-y-2">
                  {viewingGoal.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          handleToggleChecklist(viewingGoal.id, item.id);
                          setViewingGoal({
                            ...viewingGoal,
                            checklist: viewingGoal.checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c)
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
                  const g = viewingGoal;
                  setViewingGoal(null);
                  handleOpenEdit(g);
                }}
                className="flex-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Goal</span>
              </button>
              <button
                onClick={() => setViewingGoal(null)}
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
