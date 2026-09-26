// Google Calendar & Native Mobile Calendar Integration (Firebase Auth + Direct Sync)
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { app, auth as firebaseAuth } from '../firebase/index';
import { Alert } from '../types';
import { api } from '../api/client';
export { firebaseAuth };

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(CALENDAR_SCOPE);
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const SESSION_TOKEN_KEY = 'focusflow_gcal_token';
const SESSION_EXPIRY_KEY = 'focusflow_gcal_expiry';
const USER_EMAIL_KEY = 'focusflow_gcal_user_email';

let inMemoryToken: string | null = null;
let inMemoryUserEmail: string | null = null;

export function getStoredGoogleToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    if (stored && expiry && Date.now() < parseInt(expiry, 10)) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {}
  return null;
}

export function getStoredUserEmail(): string | null {
  if (inMemoryUserEmail) return inMemoryUserEmail;
  try {
    return sessionStorage.getItem(USER_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function saveGoogleToken(token: string, email?: string, expiresInSecs: number = 3500): void {
  inMemoryToken = token;
  if (email) inMemoryUserEmail = email;
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + expiresInSecs * 1000));
    if (email) sessionStorage.setItem(USER_EMAIL_KEY, email);
  } catch {}
}

export function clearGoogleToken(): void {
  inMemoryToken = null;
  inMemoryUserEmail = null;
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
  } catch {}
  signOut(firebaseAuth).catch(() => {});
}

/**
 * Initiates Google Calendar connection using Firebase Authentication.
 * Firebase manages authorized OAuth redirect handlers, preventing origin_mismatch errors.
 */
export async function requestGoogleCalendarLogin(): Promise<{ token: string; email?: string }> {
  const existing = getStoredGoogleToken();
  if (existing) {
    return { token: existing, email: getStoredUserEmail() || undefined };
  }

  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Google authorization completed, but no calendar access token was received.');
    }

    const email = result.user?.email || undefined;
    saveGoogleToken(accessToken, email);
    return { token: accessToken, email };
  } catch (error: any) {
    console.error('Firebase Google Auth error:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled. Please click "Connect" again to authorize calendar sync.');
    }
    if (error?.code === 'auth/unauthorized-domain') {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'this domain';
      throw new Error(
        `OAuth domain authorization needed: "${currentOrigin}" must be added to your Firebase / Google Cloud authorized domains. See the setup guide below.`
      );
    }
    throw new Error(error?.message || 'Failed to authenticate with Google Calendar.');
  }
}

export interface GoogleCalendarEventPayload {
  summary: string;
  description?: string;
  startIso: string;
  endIso?: string;
  remindMinutesBefore?: number;
}

export async function createGoogleCalendarEvent(
  token: string,
  payload: GoogleCalendarEventPayload
): Promise<any> {
  const startTime = new Date(payload.startIso);
  const endTime = payload.endIso
    ? new Date(payload.endIso)
    : new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min duration

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const reminderMinutes = payload.remindMinutesBefore ?? 0;

  const body = {
    summary: payload.summary,
    description: payload.description || 'Scheduled reminder from FocusFlow productivity app.',
    start: {
      dateTime: startTime.toISOString(),
      timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      clearGoogleToken();
      throw new Error('Google Calendar authorization expired. Please click Reconnect.');
    }
    throw new Error(`Google Calendar API error: ${errorText}`);
  }

  return res.json();
}

export async function syncSingleAlertToGoogle(
  token: string,
  alert: Alert
): Promise<{ success: boolean; eventId?: string }> {
  try {
    let startIso: string;
    if (alert.remindAtUtc) {
      startIso = alert.remindAtUtc;
    } else {
      const [h, m] = (alert.time || '09:00').split(':');
      const d = new Date(alert.date);
      d.setHours(parseInt(h, 10) || 9, parseInt(m, 10) || 0, 0, 0);
      startIso = d.toISOString();
    }

    const event = await createGoogleCalendarEvent(token, {
      summary: `⏰ FocusFlow: ${alert.title}`,
      description: `${alert.description || 'FocusFlow Scheduled Reminder'}\n\nScheduled for: ${alert.date} at ${alert.time}\nDirect alarm on your phone and calendar.`,
      startIso,
      remindMinutesBefore: 0
    });

    await api.updateAlert(alert.id, {
      syncedToGoogle: true,
      googleEventId: event.id
    });

    return { success: true, eventId: event.id };
  } catch (err) {
    console.error('Error syncing alert to Google Calendar:', err);
    throw err;
  }
}

export async function syncAllAlertsToGoogle(
  token: string,
  alerts: Alert[]
): Promise<{ syncedCount: number; errors: number }> {
  let syncedCount = 0;
  let errors = 0;

  const pendingAlerts = alerts.filter((a) => a.status === 'pending');

  for (const alert of pendingAlerts) {
    try {
      await syncSingleAlertToGoogle(token, alert);
      syncedCount++;
    } catch {
      errors++;
    }
  }

  return { syncedCount, errors };
}

/**
 * 1-Tap Universal Calendar URL
 * Generates a direct Google Calendar event creation link that requires ZERO OAuth,
 * ZERO permissions, and works for ANY user worldwide on mobile, tablet, or desktop.
 */
export function generateGoogleCalendarUrl(alert: {
  title: string;
  description?: string;
  date: string;
  time: string;
  remindAtUtc?: string;
}): string {
  let start: Date;
  if (alert.remindAtUtc) {
    start = new Date(alert.remindAtUtc);
  } else {
    const [h, m] = (alert.time || '09:00').split(':');
    start = new Date(alert.date);
    start.setHours(parseInt(h, 10) || 9, parseInt(m, 10) || 0, 0, 0);
  }
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const formatGCalDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const datesParam = `${formatGCalDate(start)}/${formatGCalDate(end)}`;
  const title = encodeURIComponent(`⏰ FocusFlow: ${alert.title}`);
  const details = encodeURIComponent(
    `${alert.description || 'FocusFlow Alert'}\n\nScheduled for: ${alert.date} at ${alert.time}\nCreated from FocusFlow.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}`;
}

/**
 * 1-Tap Apple Calendar / iCal Download
 * Directly prompts native iOS Calendar or Mac Calendar to add the reminder with sound alarm.
 */
export function downloadIcsFile(alert: {
  title: string;
  description?: string;
  date: string;
  time: string;
  remindAtUtc?: string;
}): void {
  let start: Date;
  if (alert.remindAtUtc) {
    start = new Date(alert.remindAtUtc);
  } else {
    const [h, m] = (alert.time || '09:00').split(':');
    start = new Date(alert.date);
    start.setHours(parseInt(h, 10) || 9, parseInt(m, 10) || 0, 0, 0);
  }
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FocusFlow//Productivity App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:focusflow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@focusflow.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:⏰ FocusFlow: ${alert.title}`,
    `DESCRIPTION:${(alert.description || 'FocusFlow Reminder').replace(/\n/g, '\\n')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:FocusFlow Reminder Alarm',
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focusflow-alert-${alert.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
