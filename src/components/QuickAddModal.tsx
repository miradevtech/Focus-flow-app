import React, { useState } from 'react';
import { api } from '../api/client';
import { TabType, Priority } from '../types';
import { X, CheckSquare, Target, FolderKanban, ShoppingCart, Bell, FileText, Users } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: TabType;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess, defaultType = 'tasks' }) => {
  const [type, setType] = useState<TabType>(defaultType === 'home' || defaultType === 'history' ? 'tasks' : defaultType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('12:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('General');

  // Specific fields
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title/Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (type === 'tasks') {
        await api.createTask({
          title,
          description,
          dueDate,
          dueTime,
          priority,
          category,
          completed: false
        });
      } else if (type === 'goals') {
        await api.createGoal({
          title,
          description,
          targetDate: dueDate,
          checklist: []
        });
      } else if (type === 'projects') {
        await api.createProject({
          title,
          description,
          targetDate: dueDate,
          color: '#3b82f6',
          status: 'active',
          checklist: []
        });
      } else if (type === 'shopping') {
        await api.createShoppingItem({
          name: title,
          quantity,
          price: price ? parseFloat(price) : null,
          category,
          notes: description
        });
      } else if (type === 'alerts') {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        await api.createAlert({
          title,
          description,
          date: dueDate,
          time: dueTime,
          userTimezone
        });
      } else if (type === 'notes') {
        await api.createNote({
          title,
          content: description,
          tags: [category]
        });
      } else if (type === 'people') {
        await api.createPerson({
          name: title,
          phone,
          email,
          relationship: category || 'Friend',
          notes: description,
          importantDate: '',
          reminderInfo: ''
        });
      }

      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Quick Create</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-6">
          {[
            { id: 'tasks', label: 'Task', icon: CheckSquare },
            { id: 'goals', label: 'Goal', icon: Target },
            { id: 'projects', label: 'Project', icon: FolderKanban },
            { id: 'shopping', label: 'Shop', icon: ShoppingCart },
            { id: 'alerts', label: 'Alert', icon: Bell },
            { id: 'notes', label: 'Note', icon: FileText },
            { id: 'people', label: 'Person', icon: Users }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as TabType)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {type === 'shopping' ? 'Item Name' : type === 'people' ? 'Person Name' : 'Title'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {(type === 'tasks' || type === 'goals' || type === 'projects' || type === 'alerts') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  {type === 'goals' || type === 'projects' ? 'Target Date' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              {type === 'tasks' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Due Time (24-hr)</label>
                  <input
                    type="time"
                    step="60"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {type === 'alerts' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Alert Time (24-hr)</label>
                  <input
                    type="time"
                    step="60"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {type === 'shopping' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Quantity</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="2 packs"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Estimated Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="14.99"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {type === 'people' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {(type === 'tasks' || type === 'goals' || type === 'projects') && (
            <div className="grid grid-cols-2 gap-3">
              {type === 'tasks' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Category / Tag</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Work, Personal..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {type === 'notes' ? 'Content' : type === 'people' ? 'Contact Notes' : 'Description / Notes'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${type.slice(0, -1)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
