import React, { useState } from 'react';
import { Note } from '../types';
import { api } from '../api/client';
import { Plus, FileText, Search, Trash2, Edit3, Eye, X, Calendar } from 'lucide-react';

interface NotesViewProps {
  notes: Note[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ notes, onRefresh, onOpenQuickAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleOpenAdd = () => {
    setTitle('');
    setContent('');
    setTagsInput('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags ? note.tags.join(', ') : '');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (editingNote) {
        await api.updateNote(editingNote.id, { title, content, tags });
        setEditingNote(null);
      } else {
        await api.createNote({ title, content, tags });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.deleteNote(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Notes & Ideas</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Capture quick thoughts, reference information, and brainstorming notes.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes by title, content, or tags..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white mb-1">No notes found</h3>
          <p className="text-xs text-zinc-400 mb-4">Create your first note to keep your thoughts organized.</p>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Create Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-white tracking-tight">{note.title}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingNote(note)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="View Note"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(note)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Edit Note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {note.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed mb-4 line-clamp-4">
                  {note.content}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      {(isAddOpen || editingNote) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingNote ? 'Edit Note' : 'Create Note'}
              </h3>
              <button
                onClick={() => { setIsAddOpen(false); setEditingNote(null); }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ideas, work, reference"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Content</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note contents..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingNote(null); }}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{viewingNote.title}</h3>
              <button
                onClick={() => setViewingNote(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingNote.tags && viewingNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {viewingNote.tags.map((tag, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/60 max-h-96 overflow-y-auto">
              {viewingNote.content}
            </p>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                onClick={() => setViewingNote(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium"
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
