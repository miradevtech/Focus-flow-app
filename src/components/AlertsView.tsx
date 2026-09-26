import React, { useState } from 'react';
import { Alert, AlertStatus } from '../types';
import { api } from '../api/client';
import { Plus, Bell, Calendar, Clock, Trash2, Edit3, Eye, X, CheckCircle2 } from 'lucide-react';
import { TimePicker24 } from './TimePicker24';
import { registerPushDevice, requestAndRegisterNotifications } from '../utils/pushNotifications';

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

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => getLocalDateStr());
  const [time, setTime] = useState('18:07');

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDate(getLocalDateStr());
    // Default to 5 minutes from right now
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    setTime(`${h}:${m}`);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setTitle(alert.title);
    setDescription(alert.description);
    setDate(alert.date);
    const [h, m] = (alert.time ? alert.time.replace('.', ':') : '18:07').split(':');
    setTime(`${String(parseInt(h, 10) || 0).padStart(2, '0')}:${String(parseInt(m, 10) || 0).padStart(2, '0')}`);
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
      const [hStr, mStr] = time.replace('.', ':').split(':');
      const cleanTime = `${String(parseInt(hStr, 10) || 0).padStart(2, '0')}:${String(parseInt(mStr, 10) || 0).padStart(2, '0')}`;

      // Construct local date accurately
      const [y, mon, d] = date.split('-').map(Number);
      const localTarget = new Date();
      localTarget.setFullYear(y, mon - 1, d);
      localTarget.setHours(parseInt(hStr, 10) || 0, parseInt(mStr, 10) || 0, 0, 0);
      const remindAtUtc = isNaN(localTarget.getTime()) ? new Date().toISOString() : localTarget.toISOString();

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

  const handleTestAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {}

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('FocusFlow Test Alert', {
          body: 'Sound & Notifications are working perfectly!',
          icon: '/icon-192.png'
        });
      } catch {}
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: 'FocusFlow Test Alert',
          body: 'Sound & Notifications are working perfectly!'
        });
      } catch {}
    }

    alert('🔊 Sound played & test notification dispatched!');
  };

  const [isSendingPush, setIsSendingPush] = useState(false);
  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  const handleEnableNotifications = async () => {
    const res = await requestAndRegisterNotifications();
    setNotifPermission(res.permission);
    if (res.permission === 'granted') {
      alert('✅ Background Push notifications activated! Scheduled reminders will notify you even when FocusFlow is closed.');
    } else if (res.permission === 'denied') {
      alert('Notification permission was denied. Please allow notifications in your browser or phone site settings.');
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingPush(true);
    try {
      await registerPushDevice();
      const result = await api.sendTestPush();
      alert(`📲 Real push notification sent to ${result.deliveredDevices} device(s)! Lock your phone or switch apps to see it appear.`);
    } catch (err: any) {
      alert(`Could not send push: ${err?.message || 'Tap "Enable Push" first.'}`);
    } finally {
      setIsSendingPush(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* iOS Safari Home Screen Notice if needed */}
      {isIOS && !isStandalone && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-xs text-zinc-300 space-y-1">
            <span className="font-semibold text-white block">iPhone Lock-Screen Alerts Notice</span>
            <p className="text-zinc-400">
              Apple requires web apps to be added to the home screen to wake your locked screen.
              Tap Safari's <strong className="text-white">Share button</strong> (square with arrow up), then tap <strong className="text-white">'Add to Home Screen'</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Alerts & Reminders</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Scheduled notifications and background reminders.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Web Push Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${notifPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : notifPermission === 'denied' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="text-zinc-300">
              {notifPermission === 'granted' ? 'Push Active' : notifPermission === 'denied' ? 'Blocked' : 'Push Inactive'}
            </span>
          </div>

          <button
            onClick={handleEnableNotifications}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition-all active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span>Enable Push</span>
          </button>
          <button
            onClick={handleSendTestPush}
            disabled={isSendingPush}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 font-medium rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
            title="Send real background push to test phone lockscreen"
          >
            <span>{isSendingPush ? 'Sending...' : '📲 Send Test Push'}</span>
          </button>
          <button
            onClick={handleTestAlert}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium rounded-xl text-xs transition-all active:scale-95"
            title="Test sound and in-app banner immediately"
          >
            <span>🔊 In-App Sound</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 text-xs transition-all active:scale-95"
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
