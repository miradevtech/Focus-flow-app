import React, { useState } from 'react';
import { Person } from '../types';
import { api } from '../api/client';
import { Plus, Users, Search, Phone, Mail, Trash2, Edit3, Eye, X } from 'lucide-react';

interface PeopleViewProps {
  people: Person[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ people, onRefresh, onOpenQuickAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRelationship('Friend');
    setNotes('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setName(person.name);
    setPhone(person.phone);
    setEmail(person.email);
    setRelationship(person.relationship || 'Friend');
    setNotes(person.notes);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name,
        phone,
        email,
        relationship,
        notes,
        importantDate: '',
        reminderInfo: ''
      };

      if (editingPerson) {
        await api.updatePerson(editingPerson.id, payload);
        setEditingPerson(null);
      } else {
        await api.createPerson(payload);
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.deletePerson(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPeople = people.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">People & Contacts</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Keep track of important contacts, phone numbers, and notes.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
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
          placeholder="Search contacts by name, email, phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {filteredPeople.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white mb-1">No contacts added yet</h3>
          <p className="text-xs text-zinc-400 mb-4">Add people you want to keep track of with tap-to-call and email support.</p>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person) => (
            <div
              key={person.id}
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/25 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{person.name}</h3>
                      <p className="text-xs text-zinc-400">{person.relationship || 'Contact'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPerson(person)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="View Contact"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(person)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Edit Contact"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {person.phone && (
                    <a
                      href={`tel:${person.phone}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs text-zinc-300 hover:text-blue-400 hover:border-blue-500/40 transition-all"
                    >
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span>{person.phone}</span>
                    </a>
                  )}

                  {person.email && (
                    <a
                      href={`mailto:${person.email}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs text-zinc-300 hover:text-blue-400 hover:border-blue-500/40 transition-all truncate"
                    >
                      <Mail className="w-4 h-4 text-purple-400" />
                      <span className="truncate">{person.email}</span>
                    </a>
                  )}
                </div>

                {person.notes && (
                  <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/30 p-3 rounded-xl border border-zinc-900">
                    {person.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {(isAddOpen || editingPerson) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingPerson ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={() => { setIsAddOpen(false); setEditingPerson(null); }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Relationship / Group</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Friend, Colleague, Family"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Important details about this contact..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingPerson(null); }}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20"
                >
                  {editingPerson ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {viewingPerson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                  {viewingPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{viewingPerson.name}</h3>
                  <p className="text-xs text-zinc-400">{viewingPerson.relationship || 'Contact'}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingPerson(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {viewingPerson.phone && (
                <a
                  href={`tel:${viewingPerson.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-sm text-zinc-200 hover:text-blue-400"
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>{viewingPerson.phone}</span>
                </a>
              )}
              {viewingPerson.email && (
                <a
                  href={`mailto:${viewingPerson.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-sm text-zinc-200 hover:text-blue-400"
                >
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>{viewingPerson.email}</span>
                </a>
              )}
            </div>

            {viewingPerson.notes && (
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
                {viewingPerson.notes}
              </p>
            )}

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                onClick={() => setViewingPerson(null)}
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
