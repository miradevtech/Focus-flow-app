import React, { useState } from 'react';
import { Alert, AlertStatus } from '../types';
import { api } from '../api/client';
import { Plus, Bell, Calendar, Clock, Trash2, Edit3, Eye, X, CheckCircle2 } from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh, onOpenQuickAdd }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingAlert, setViewingAlert] = useState<Alert | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('09:00');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setTitle(alert.title);
    setDescription(alert.description);
    setDate(alert.date);
    setTime(alert.time);
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (editingAlert) {
        await api.updateAlert(editingAlert.id, {
          title,
          description,
          date,
          time,
          userTimezone
        });
        setEditingAlert(null);
      } else {
        await api.createAlert({
          title,
          description,
          date,
          time,
          userTimezone
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissAlert(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await api.deleteAlert(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('FocusFlow Notifications Enabled', {
          body: 'You will now receive scheduled reminders and alert notifications!'
        });
      } else {
        alert('Notification permission was denied or dismissed.');
      }
    } else {
      alert('Browser notifications are not supported in this browser.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Alerts & Reminders</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Scheduled notifications and important event alerts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleEnableNotifications}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium rounded-xl text-sm transition-all"
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>Enable Notifications</span>
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white mb-1">No upcoming reminders</h3>
          <p className="text-xs text-zinc-400 mb-4">Create a scheduled reminder to stay on top of your schedule.</p>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Create Reminder
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                alert.status === 'dismissed' || alert.status === 'completed'
                  ? 'bg-zinc-950/40 border-zinc-900 opacity-60'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 shadow-lg shadow-black/20'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold ${
                      alert.status === 'pending' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  {alert.description && (
                    <p className="text-xs text-zinc-400 mt-1">{alert.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" /> {alert.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" /> {alert.time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alert.status === 'pending' && (
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors"
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={() => setViewingAlert(alert)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="View Reminder"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(alert)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Edit Reminder"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Reminder Modal */}
      {(isAddOpen || editingAlert) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingAlert ? 'Edit Reminder' : 'Create Reminder'}
              </h3>
              <button
                onClick={() => { setIsAddOpen(false); setEditingAlert(null); }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Reminder Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Team standup meeting"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Time (24-hr) *</label>
                  <input
                    type="time"
                    required
                    step="60"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingAlert(null); }}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20"
                >
                  {editingAlert ? 'Save Changes' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Reminder Modal */}
      {viewingAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{viewingAlert.title}</h3>
              <button
                onClick={() => setViewingAlert(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingAlert.description && (
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
                {viewingAlert.description}
              </p>
            )}

            <div className="text-xs text-zinc-400">
              Scheduled for: <strong className="text-white">{viewingAlert.date} at {viewingAlert.time}</strong>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                onClick={() => setViewingAlert(null)}
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
