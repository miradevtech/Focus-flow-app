import React, { useState } from 'react';
import { Project, ChecklistItem, ProjectStatus } from '../types';
import { api } from '../api/client';
import { Plus, FolderKanban, Calendar, Trash2, Edit3, Eye, X } from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onRefresh, onOpenQuickAdd }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [color, setColor] = useState('#6366F1');
  const [checklist, setChecklist] = useState<Array<{ title: string; completed: boolean }>>([]);

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setStatus('active');
    setColor('#6366F1');
    setChecklist([]);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description);
    setTargetDate(project.targetDate || '');
    setStatus(project.status);
    setColor(project.color || '#6366F1');
    setChecklist(project.checklist ? project.checklist.map(c => ({ title: c.title, completed: c.completed })) : []);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const formattedChecklist = checklist.map((c, i) => ({
        id: editingProject?.checklist?.[i]?.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: c.title,
        completed: c.completed
      }));

      if (editingProject) {
        await api.updateProject(editingProject.id, {
          title,
          description,
          targetDate,
          status,
          color,
          checklist: formattedChecklist
        });
        setEditingProject(null);
      } else {
        await api.createProject({
          title,
          description,
          targetDate,
          status,
          color,
          checklist: formattedChecklist
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (projectId: string, itemId: string) => {
    try {
      await api.toggleProjectChecklist(projectId, itemId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm">Manage bigger initiatives and multi-step plans</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-full bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-12 text-center space-y-3">
            <FolderKanban className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
            <h3 className="text-white font-medium text-lg">No projects yet</h3>
            <p className="text-gray-400 text-sm">Create a project to organize bigger plans.</p>
            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium hover:bg-indigo-600/30 transition-all inline-block mt-2"
            >
              Create Project
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const checklistItems = project.checklist || [];
            const completedCount = checklistItems.filter(c => c.completed).length;
            const totalCount = checklistItems.length;
            const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : project.status === 'completed' ? 100 : 0;

            return (
              <div
                key={project.id}
                onClick={() => setViewingProject(project)}
                className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || '#6366F1' }} />
                      <h3 className="text-white font-semibold text-lg">{project.title}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      project.status === 'on_hold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                  )}

                  {/* Progress bar & Checklist preview */}
                  <div className="space-y-2 pt-2" onClick={(e) => e.stopPropagation()}>
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
                    {checklistItems.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {checklistItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklist(project.id, item.id)}
                              className="w-3.5 h-3.5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                            />
                            <span className={item.completed ? 'line-through text-gray-500' : ''}>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {project.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Target: {project.targetDate}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2E3D]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingProject(project)}
                    title="View Project"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(project)}
                    title="Edit Project"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    title="Delete Project"
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

      {/* Add / Edit Project Modal */}
      {(isAddOpen || editingProject) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingProject ? 'Edit Project' : 'Add Project'}
              </h2>
              <button
                onClick={() => { setIsAddOpen(false); setEditingProject(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Title *</label>
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
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about..."
                  rows={3}
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
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
                  onClick={() => { setIsAddOpen(false); setEditingProject(null); }}
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

      {/* View Project Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewingProject.color || '#6366F1' }} />
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  viewingProject.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  viewingProject.status === 'on_hold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {viewingProject.status}
                </span>
              </div>
              <button
                onClick={() => setViewingProject(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{viewingProject.title}</h2>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                {viewingProject.description || 'No description provided.'}
              </p>
            </div>

            {viewingProject.targetDate && (
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#1A1D29] p-3 rounded-xl border border-[#2A2E3D]">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Target Date: {viewingProject.targetDate}</span>
              </div>
            )}

            {/* Checklist in view */}
            {viewingProject.checklist && viewingProject.checklist.length > 0 && (
              <div className="space-y-3 bg-[#1A1D29] p-4 rounded-2xl border border-[#2A2E3D]">
                <h3 className="text-white font-semibold text-sm">Action Checklist</h3>
                <div className="space-y-2">
                  {viewingProject.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          handleToggleChecklist(viewingProject.id, item.id);
                          setViewingProject({
                            ...viewingProject,
                            checklist: viewingProject.checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c)
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
                  const p = viewingProject;
                  setViewingProject(null);
                  handleOpenEdit(p);
                }}
                className="flex-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Project</span>
              </button>
              <button
                onClick={() => setViewingProject(null)}
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
