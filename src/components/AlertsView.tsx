import React, { useState } from 'react';
import { Alert, AlertStatus } from '../types';
import { api } from '../api/client';
import { Plus, Bell, Calendar, Clock, Trash2, Edit3, Eye, X, CheckCircle2 } from 'lucide-react';
import { TimePicker24 } from './TimePicker24';

interface AlertsViewProps {
  alerts: Alert[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingAlert, setViewingAlert] = useState<Alert | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:07');

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('18:07');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setTitle(alert.title);
    setDescription(alert.description);
    setDate(alert.date);
    setTime(alert.time ? alert.time.replace('.', ':') : '18:07');
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a reminder title.');
      return;
    }
    if (!date) {
      alert('Please select a date.');
      return;
    }
    if (!time) {
      alert('Please select a time.');
      return;
    }

    setIsSaving(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const cleanTime = time.replace('.', ':');
      let remindAtUtc: string;
      try {
        const localTarget = new Date(`${date}T${cleanTime}:00`);
        remindAtUtc = isNaN(localTarget.getTime()) ? new Date().toISOString() : localTarget.toISOString();
      } catch {
        remindAtUtc = new Date().toISOString();
      }

      if (editingAlert) {
        await api.updateAlert(editingAlert.id, {
          title: title.trim(),
          description: description.trim(),
          date,
          time: cleanTime,
          userTimezone,
          remindAtUtc
        });
        setEditingAlert(null);
      } else {
        await api.createAlert({
          title: title.trim(),
          description: description.trim(),
          date,
          time: cleanTime,
          userTimezone,
          remindAtUtc
        });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      setIsAddOpen(false);
      setEditingAlert(null);
      onRefresh();
    } finally {
      setIsSaving(false);
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
      setNotifPermission(permission);
      if (permission === 'granted') {
        new Notification('FocusFlow Notifications Enabled', {
          body: 'You will now receive scheduled reminders and alert notifications!'
        });

        // Register push subscription with server
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            const { publicKey } = await api.getVapidKey();
            if (publicKey && reg.pushManager) {
              const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
              const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              const appServerKey = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) {
                appServerKey[i] = rawData.charCodeAt(i);
              }
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: appServerKey
              });
              await api.subscribePush(sub);
            }
          }
        } catch (e) {
          console.warn('Push registration skipped or failed:', e);
        }
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Web Push Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${notifPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : notifPermission === 'denied' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="text-zinc-300">
              {notifPermission === 'granted' ? 'Web Push Active & Running' : notifPermission === 'denied' ? 'Notifications Blocked' : 'Notifications Inactive'}
            </span>
          </div>

          <button
            onClick={handleEnableNotifications}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium rounded-xl text-sm transition-all"
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            <span>Enable Push</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 text-sm transition-all active:scale-95"
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
            onClick={handleOpenAdd}
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
              className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                    alert.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    alert.status === 'dismissed' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {alert.status}
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {alert.date} at {alert.time}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{alert.title}</h3>
                {alert.description && (
                  <p className="text-xs text-zinc-400">{alert.description}</p>
                )}
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

              {/* 24-Hour TimePicker */}
              <TimePicker24
                value={time}
                onChange={setTime}
                label="Alert Time (24-Hour Clock)"
              />

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
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingAlert ? 'Save Changes' : 'Create Reminder'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Reminder Modal */}
      {viewingAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{viewingAlert.status}</span>
              <button
                onClick={() => setViewingAlert(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white">{viewingAlert.title}</h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Scheduled for {viewingAlert.date} at {viewingAlert.time}</span>
            </p>
            {viewingAlert.description && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{viewingAlert.description}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingAlert(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl"
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
