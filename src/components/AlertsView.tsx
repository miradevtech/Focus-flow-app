import React, { useState } from 'react';
import { Alert } from '../types';
import { api } from '../api/client';
import {
  Plus,
  Bell,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Eye,
  X,
  CheckCircle2,
  Circle,
  Volume2,
  ExternalLink,
  Smartphone,
  Search,
  Filter
} from 'lucide-react';
import { TimePicker24 } from './TimePicker24';
import {
  generateGoogleCalendarUrl,
  downloadIcsFile
} from '../utils/googleCalendar';
import { requestAndRegisterNotifications } from '../utils/pushNotifications';

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [search, setSearch] = useState('');
  const [showLockScreenTip, setShowLockScreenTip] = useState(() => {
    return localStorage.getItem('ff_dismiss_lock_tip') !== 'true';
  });
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const handleTestPush = async () => {
    setTestingPush(true);
    setPushStatusMessage(null);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          const res = await requestAndRegisterNotifications();
          if (res.permission !== 'granted') {
            setPushStatusMessage('⚠️ Notification permission not granted yet. Please allow notifications.');
            setTestingPush(false);
            return;
          }
        }
      }
      const testRes = await api.sendTestPush();
      if (testRes.success) {
        setPushStatusMessage(`✅ Sent VAPID push! Lock screen now to test.`);
      } else {
        setPushStatusMessage('⚠️ Could not send push. Check if notifications are enabled.');
      }
    } catch (err: any) {
      try {
        await requestAndRegisterNotifications();
        const retry = await api.sendTestPush();
        if (retry.success) {
          setPushStatusMessage('✅ Push registered & sent! Lock screen to check.');
        } else {
          setPushStatusMessage(`⚠️ ${err?.message || 'Failed to dispatch push'}`);
        }
      } catch (e: any) {
        setPushStatusMessage(`⚠️ ${e?.message || err?.message || 'Failed to dispatch push'}`);
      }
    } finally {
      setTestingPush(false);
      setTimeout(() => setPushStatusMessage(null), 6000);
    }
  };

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => getLocalDateStr());
  const [time, setTime] = useState('09:00');

  const handleOpenAdd = () => {
    setTitle('');
    setDescription('');
    setDate(getLocalDateStr());
    // Default to 15 minutes from now
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
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
    const [h, m] = (alert.time ? alert.time.replace('.', ':') : '09:00').split(':');
    setTime(`${String(parseInt(h, 10) || 0).padStart(2, '0')}:${String(parseInt(m, 10) || 0).padStart(2, '0')}`);
  };

  const applyQuickTime = (type: '15m' | '1h' | 'tonight' | 'tomorrow_morning') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (type === '15m') {
      now.setMinutes(now.getMinutes() + 15);
      setDate(getLocalDateStr(now));
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    } else if (type === '1h') {
      now.setHours(now.getHours() + 1);
      setDate(getLocalDateStr(now));
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    } else if (type === 'tonight') {
      setDate(getLocalDateStr(now));
      setTime('20:00');
    } else if (type === 'tomorrow_morning') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setDate(getLocalDateStr(tomorrow));
      setTime('09:00');
    }
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const [hStr, mStr] = time.replace('.', ':').split(':');
      const cleanTime = `${String(parseInt(hStr, 10) || 0).padStart(2, '0')}:${String(parseInt(mStr, 10) || 0).padStart(2, '0')}`;

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
      } else {
        await api.createAlert({
          title: title.trim(),
          description: description.trim(),
          date,
          time: cleanTime,
          userTimezone,
          remindAtUtc
        });
      }

      setIsAddOpen(false);
      setEditingAlert(null);
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

  const handleToggleStatus = async (alertItem: Alert) => {
    try {
      const nextStatus = alertItem.status === 'completed' ? 'pending' : 'completed';
      await api.updateAlert(alertItem.id, { status: nextStatus });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAlert(id);
      if (viewingAlert?.id === id) setViewingAlert(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  // Filtered alerts
  const filteredAlerts = alerts
    .filter((a) => {
      if (filter === 'pending') return a.status === 'pending';
      if (filter === 'completed') return a.status === 'completed' || a.status === 'dismissed';
      return true;
    })
    .filter((a) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
    });

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Clean Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Reminders</h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {pendingCount} active
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Simple, distraction-free alarms and schedules.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestSound}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Preview in-app sound"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleTestPush}
            disabled={testingPush}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
            title="Test VAPID Lock-Screen Push Notification"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>{testingPush ? 'Sending...' : 'Test Push'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {pushStatusMessage && (
        <div className="p-3 rounded-2xl bg-zinc-900 border border-indigo-500/30 text-xs text-indigo-200 animate-in fade-in duration-200">
          {pushStatusMessage}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl w-fit">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'pending'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Upcoming ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'completed'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reminders..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
 
      {/* Quick Lock-Screen Reminder Helper */}
      {showLockScreenTip && (
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">To hear alarms when your phone screen is locked:</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Mobile browsers pause background web tabs when locked. Tap <strong className="text-emerald-300">+ Apple</strong> (iPhone) or <strong className="text-blue-300">+ Google</strong> (Android) on any reminder below to schedule a native system alarm that rings outside the app.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowLockScreenTip(false);
              localStorage.setItem('ff_dismiss_lock_tip', 'true');
            }}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reminder Items List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-zinc-800/60">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm">No reminders found</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            {search ? 'Try clearing your search query' : 'Keep your day on track by scheduling a reminder'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Create Reminder
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAlerts.map((alert) => {
            const isCompleted = alert.status === 'completed' || alert.status === 'dismissed';

            return (
              <div
                key={alert.id}
                className={`group p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-start sm:items-center justify-between gap-3.5 ${
                  isCompleted ? 'opacity-60 bg-zinc-950/40' : ''
                }`}
              >
                {/* Left: Checkmark & Title */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleStatus(alert)}
                    className="mt-0.5 text-zinc-500 hover:text-indigo-400 transition-colors shrink-0"
                    title={isCompleted ? 'Mark as active' : 'Mark as done'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <h4
                      className={`text-sm font-semibold tracking-tight truncate ${
                        isCompleted ? 'line-through text-zinc-400' : 'text-white'
                      }`}
                    >
                      {alert.title}
                    </h4>

                    {alert.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">{alert.description}</p>
                    )}

                    {/* Time & Date Badge */}
                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 pt-0.5">
                      <span className="flex items-center gap-1 font-medium text-zinc-300">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {alert.time}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {alert.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                  {/* 1-Tap Native Phone Alarm Buttons */}
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(alert)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors active:scale-95"
                    title="Add Alarm to Apple Calendar (iPhone/iPad/Mac - rings when locked)"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Apple</span>
                  </button>

                  <a
                    href={generateGoogleCalendarUrl(alert)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors active:scale-95"
                    title="Add Alarm to Google Calendar (Android/PC - rings when locked)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>+ Google</span>
                  </a>

                  <button
                    onClick={() => setViewingAlert(alert)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(alert)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Reminder Modal */}
      {(isAddOpen || editingAlert) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingAlert ? 'Edit Reminder' : 'New Reminder'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingAlert(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call client, Take vitamins, Project review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-medium text-zinc-400 mb-1.5 block">Quick Time Presets</span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickTime('15m')}
                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 text-[11px] font-medium transition-colors"
                  >
                    In 15m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTime('1h')}
                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 text-[11px] font-medium transition-colors"
                  >
                    In 1 hour
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTime('tonight')}
                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 text-[11px] font-medium transition-colors"
                  >
                    Tonight
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickTime('tomorrow_morning')}
                    className="px-2 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 text-[11px] font-medium transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <TimePicker24 value={time} onChange={setTime} label="Time (24h)" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Ring Phone Alarm (Apple / Google) */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ring phone when screen is off / locked:</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Phones sleep background browser tabs. Tap below to schedule a native system alarm on your phone:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      downloadIcsFile({
                        title: title.trim() || 'FocusFlow Reminder',
                        description: description.trim(),
                        date,
                        time,
                        remindAtUtc: new Date().toISOString()
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors active:scale-95"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add to Apple Cal</span>
                  </button>
                  <a
                    href={generateGoogleCalendarUrl({
                      title: title.trim() || 'FocusFlow Reminder',
                      description: description.trim(),
                      date,
                      time,
                      remindAtUtc: new Date().toISOString()
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Add to Google Cal</span>
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingAlert(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingAlert ? 'Update' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  viewingAlert.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {viewingAlert.status}
              </span>
              <button
                onClick={() => setViewingAlert(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{viewingAlert.title}</h3>
              {viewingAlert.description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{viewingAlert.description}</p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Scheduled Time:</span>
                <span className="text-white font-medium">
                  {viewingAlert.date} at {viewingAlert.time}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Status:</span>
                <span className={viewingAlert.status === 'completed' ? 'text-emerald-400 font-medium' : 'text-indigo-300 font-medium'}>
                  {viewingAlert.status === 'completed' ? 'Completed' : 'Active'}
                </span>
              </div>
            </div>

            {/* Optional Export to Calendar */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="text-[11px] font-medium text-zinc-400 block">Save to Calendar:</span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={generateGoogleCalendarUrl(viewingAlert)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={() => downloadIcsFile(viewingAlert)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apple / iCal</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  handleDelete(viewingAlert.id);
                  setViewingAlert(null);
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleToggleStatus(viewingAlert);
                    setViewingAlert(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                >
                  {viewingAlert.status === 'completed' ? 'Mark Active' : 'Mark Done'}
                </button>

                <button
                  onClick={() => setViewingAlert(null)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
