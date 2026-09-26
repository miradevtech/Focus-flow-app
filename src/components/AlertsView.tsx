import React, { useState, useEffect } from 'react';
import { Alert } from '../types';
import { api } from '../api/client';
import {
  Plus,
  Bell,
  Calendar,
  Trash2,
  Edit3,
  Eye,
  X,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
  ExternalLink,
  Volume2,
  Smartphone,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { TimePicker24 } from './TimePicker24';
import { registerPushDevice, requestAndRegisterNotifications } from '../utils/pushNotifications';
import {
  getStoredGoogleToken,
  clearGoogleToken,
  requestGoogleCalendarLogin,
  syncAllAlertsToGoogle,
  syncSingleAlertToGoogle,
  createGoogleCalendarEvent
} from '../utils/googleCalendar';

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

  // Google Calendar Integration State
  const [gcalToken, setGcalToken] = useState<string | null>(() => getStoredGoogleToken());
  const [isConnectingGcal, setIsConnectingGcal] = useState(false);
  const [isSyncingGcal, setIsSyncingGcal] = useState(false);
  const [isAddingTestGcal, setIsAddingTestGcal] = useState(false);
  const [autoSyncGcal, setAutoSyncGcal] = useState<boolean>(() => {
    try {
      return localStorage.getItem('focusflow_gcal_autosync') !== 'false';
    } catch {
      return true;
    }
  });
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Web Push State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSendingPush, setIsSendingPush] = useState(false);

  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

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
  const [syncThisToGcal, setSyncThisToGcal] = useState(true);

  useEffect(() => {
    const token = getStoredGoogleToken();
    if (token) setGcalToken(token);
  }, []);

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
    setSyncThisToGcal(Boolean(gcalToken && autoSyncGcal));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setTitle(alert.title);
    setDescription(alert.description);
    setDate(alert.date);
    const [h, m] = (alert.time ? alert.time.replace('.', ':') : '18:07').split(':');
    setTime(`${String(parseInt(h, 10) || 0).padStart(2, '0')}:${String(parseInt(m, 10) || 0).padStart(2, '0')}`);
    setSyncThisToGcal(!alert.syncedToGoogle && Boolean(gcalToken));
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

      let savedAlert: Alert;
      if (editingAlert) {
        savedAlert = await api.updateAlert(editingAlert.id, {
          title: title.trim(),
          description: description.trim(),
          date,
          time: cleanTime,
          userTimezone,
          remindAtUtc
        });
        setEditingAlert(null);
      } else {
        savedAlert = await api.createAlert({
          title: title.trim(),
          description: description.trim(),
          date,
          time: cleanTime,
          userTimezone,
          remindAtUtc
        });
        setIsAddOpen(false);
      }

      // If Google Calendar is connected and sync requested, sync immediately
      if (gcalToken && syncThisToGcal) {
        try {
          await syncSingleAlertToGoogle(gcalToken, savedAlert);
        } catch (gcalErr) {
          console.warn('Auto sync to Google Calendar had an issue:', gcalErr);
        }
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

  // Google Calendar Handlers
  const handleConnectGoogleCalendar = async () => {
    setIsConnectingGcal(true);
    setSyncFeedback(null);
    try {
      const token = await requestGoogleCalendarLogin();
      setGcalToken(token);
      setSyncFeedback('🎉 Google Calendar connected! Your reminders can now ring alarms and wake your locked screen.');
      // Automatically sync existing pending alerts
      const res = await syncAllAlertsToGoogle(token, alerts);
      if (res.syncedCount > 0) {
        setSyncFeedback(`🎉 Connected! Synced ${res.syncedCount} upcoming reminder(s) to your Google Calendar.`);
        onRefresh();
      }
    } catch (err: any) {
      alert(`Google Calendar connection: ${err?.message || 'Could not complete login. Please try again.'}`);
    } finally {
      setIsConnectingGcal(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    clearGoogleToken();
    setGcalToken(null);
    setSyncFeedback('Google Calendar disconnected.');
  };

  const handleSyncAllToGoogle = async () => {
    let token = gcalToken || getStoredGoogleToken();
    if (!token) {
      try {
        token = await requestGoogleCalendarLogin();
        setGcalToken(token);
      } catch (err: any) {
        alert(`Please connect Google Calendar first: ${err?.message}`);
        return;
      }
    }

    setIsSyncingGcal(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllAlertsToGoogle(token, alerts);
      setSyncFeedback(`✅ Successfully synced ${res.syncedCount} reminder(s) to your Google Calendar!`);
      onRefresh();
    } catch (err: any) {
      setSyncFeedback(`⚠️ Sync issue: ${err?.message || 'Please check your connection.'}`);
    } finally {
      setIsSyncingGcal(false);
    }
  };

  const handleSyncSingle = async (alertItem: Alert) => {
    let token = gcalToken || getStoredGoogleToken();
    if (!token) {
      try {
        token = await requestGoogleCalendarLogin();
        setGcalToken(token);
      } catch (err: any) {
        alert(`Please connect Google Calendar first: ${err?.message}`);
        return;
      }
    }

    try {
      await syncSingleAlertToGoogle(token, alertItem);
      onRefresh();
      alert(`✅ Reminder "${alertItem.title}" synced to your Google Calendar!`);
    } catch (err: any) {
      alert(`Could not sync to calendar: ${err?.message}`);
    }
  };

  const handleAdd2MinTestAlarm = async () => {
    let token = gcalToken || getStoredGoogleToken();
    if (!token) {
      try {
        token = await requestGoogleCalendarLogin();
        setGcalToken(token);
      } catch (err: any) {
        alert(`Please connect Google Calendar first: ${err?.message}`);
        return;
      }
    }

    setIsAddingTestGcal(true);
    try {
      const targetTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      await createGoogleCalendarEvent(token, {
        summary: '⏰ FocusFlow Test Alert — Lock Screen Alarm',
        description: 'Scheduled lock-screen alarm test from FocusFlow. If you hear sound or see this on your locked screen, it works perfectly!',
        startIso: targetTime.toISOString(),
        remindMinutesBefore: 0
      });

      // Also create a local alert entry so user sees it in FocusFlow
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${targetTime.getFullYear()}-${pad(targetTime.getMonth() + 1)}-${pad(targetTime.getDate())}`;
      const timeStr = `${pad(targetTime.getHours())}:${pad(targetTime.getMinutes())}`;

      await api.createAlert({
        title: '2-Minute Lock Screen Test',
        description: 'Testing Google Calendar native phone alarm on lock screen',
        date: dateStr,
        time: timeStr,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        remindAtUtc: targetTime.toISOString()
      });

      onRefresh();
      alert(`🔔 Google Calendar Test Event created for 2 minutes from now (${targetTime.toLocaleTimeString()})!\n\nLock your phone screen now. Your phone's calendar will ring and display the alert!`);
    } catch (err: any) {
      alert(`Could not schedule test alarm: ${err?.message}`);
    } finally {
      setIsAddingTestGcal(false);
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

    alert('🔊 In-app sound played and test alert triggered!');
  };

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
      {/* 1. GOOGLE CALENDAR LOCK-SCREEN SOLUTION BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Guaranteed Lock-Screen Alarms
              </span>
              {gcalToken ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Google Calendar Connected
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Recommended Setup
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Wake Locked Phone & Sound Alarms Outside the App
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Mobile browsers (especially Safari on iPhone) block web apps from playing sounds when your phone is locked or closed.
              Syncing to <strong className="text-white">Google Calendar</strong> rings your phone's native alarm, vibrates, and shows lock screen alerts through your phone's built-in calendar at the exact scheduled minute.
            </p>

            {syncFeedback && (
              <div className="p-3 rounded-xl bg-indigo-900/50 border border-indigo-400/40 text-xs text-indigo-200 animate-fadeIn">
                {syncFeedback}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            {gcalToken ? (
              <>
                <button
                  onClick={handleSyncAllToGoogle}
                  disabled={isSyncingGcal}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl text-xs shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGcal ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGcal ? 'Syncing...' : 'Sync All Reminders to Calendar'}</span>
                </button>

                <button
                  onClick={handleAdd2MinTestAlarm}
                  disabled={isAddingTestGcal}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/90 hover:bg-zinc-700 border border-indigo-500/40 text-indigo-200 font-semibold rounded-2xl text-xs transition-all active:scale-95 disabled:opacity-50"
                  title="Adds a test alarm for 2 minutes from now to test your locked phone screen"
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isAddingTestGcal ? 'Scheduling...' : '🔔 Test 2-Min Lock Screen Alarm'}</span>
                </button>

                <div className="flex items-center justify-between gap-3 px-1 pt-1 text-[11px] text-zinc-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSyncGcal}
                      onChange={(e) => {
                        setAutoSyncGcal(e.target.checked);
                        try {
                          localStorage.setItem('focusflow_gcal_autosync', String(e.target.checked));
                        } catch {}
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Auto-sync new reminders</span>
                  </label>
                  <button
                    onClick={handleDisconnectGoogleCalendar}
                    className="text-zinc-500 hover:text-zinc-300 underline"
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleConnectGoogleCalendar}
                disabled={isConnectingGcal}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>{isConnectingGcal ? 'Connecting...' : 'Connect Google Calendar'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* iOS Safari Home Screen Notice if needed */}
      {isIOS && !isStandalone && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-xs text-zinc-300 space-y-1">
            <span className="font-semibold text-white block">iPhone Lock-Screen Direct Push Notice</span>
            <p className="text-zinc-400">
              For direct browser push on iOS, tap Safari's <strong className="text-white">Share button</strong> (square with arrow up), then tap <strong className="text-white">'Add to Home Screen'</strong>.
              Connecting <strong className="text-white">Google Calendar</strong> above also ensures your lock screen rings automatically via Apple Calendar / Google Calendar!
            </p>
          </div>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Alerts & Reminders</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Scheduled notifications and background reminders.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Web Push Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                notifPermission === 'granted'
                  ? 'bg-emerald-500 animate-pulse'
                  : notifPermission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
            />
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
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sound</span>
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors"
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
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      alert.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : alert.status === 'dismissed'
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {alert.status}
                  </span>

                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {alert.date} at {alert.time}
                  </span>

                  {alert.syncedToGoogle && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                      Google Calendar Alarm
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{alert.title}</h3>
                {alert.description && <p className="text-xs text-zinc-400">{alert.description}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Sync to Google Calendar Button if not yet synced */}
                {!alert.syncedToGoogle && alert.status === 'pending' && (
                  <button
                    onClick={() => handleSyncSingle(alert)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl transition-colors active:scale-95"
                    title="Sync this reminder to Google Calendar for lock-screen alarms"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sync to Calendar</span>
                  </button>
                )}

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
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingAlert(null);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reminder Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Call dentist, Team standup, Medication"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 text-white text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional context or notes..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 text-white text-sm outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 text-white text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Time (24h) *</label>
                  <TimePicker24 value={time} onChange={(val) => setTime(val)} />
                </div>
              </div>

              {/* Google Calendar Sync Option */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncThisToGcal}
                    onChange={(e) => setSyncThisToGcal(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Sync to Google Calendar Alarm</span>
                    <span className="text-zinc-400">
                      Rings your phone sound and displays on your locked screen via Google/Apple Calendar.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingAlert(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingAlert ? 'Update Reminder' : 'Create Reminder'}
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
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  viewingAlert.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : viewingAlert.status === 'dismissed'
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
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

            <h3 className="text-xl font-bold text-white">{viewingAlert.title}</h3>
            {viewingAlert.description && <p className="text-sm text-zinc-300">{viewingAlert.description}</p>}

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Scheduled Time:</span>
                <span className="text-white font-medium">
                  {viewingAlert.date} at {viewingAlert.time}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Lock Screen Alarm:</span>
                <span className={viewingAlert.syncedToGoogle ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                  {viewingAlert.syncedToGoogle ? '✓ Google Calendar Active' : 'Push Only'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Created:</span>
                <span className="text-zinc-300">{new Date(viewingAlert.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {!viewingAlert.syncedToGoogle && viewingAlert.status === 'pending' && (
                <button
                  onClick={() => {
                    handleSyncSingle(viewingAlert);
                    setViewingAlert(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Sync to Calendar
                </button>
              )}
              <button
                onClick={() => setViewingAlert(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
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
