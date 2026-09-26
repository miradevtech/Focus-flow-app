// Google Identity Services (GIS) & Google Calendar Integration
import { Alert } from '../types';
import { api } from '../api/client';

declare global {
  interface Window {
    google?: any;
  }
}

const SESSION_TOKEN_KEY = 'focusflow_gcal_token';
const SESSION_EXPIRY_KEY = 'focusflow_gcal_expiry';
const DEFAULT_CLIENT_ID = '1043692880047-9le5see4ukgn95kopsruucdpk8g381g2.apps.googleusercontent.com';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let inMemoryToken: string | null = null;
let tokenClientInstance: any = null;

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

export function saveGoogleToken(token: string, expiresInSecs: number = 3500): void {
  inMemoryToken = token;
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + expiresInSecs * 1000));
  } catch {}
}

export function clearGoogleToken(): void {
  inMemoryToken = null;
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch {}
}

export async function fetchGoogleClientId(): Promise<string> {
  try {
    const res = await fetch('/api/google-calendar/config');
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) return data.clientId;
    }
  } catch (err) {
    console.warn('Failed to fetch Google client ID from server:', err);
  }
  return DEFAULT_CLIENT_ID;
}

export async function initGoogleAuth(
  onSuccess: (token: string) => void,
  onError: (err: any) => void
): Promise<() => void> {
  const clientId = await fetchGoogleClientId();

  return new Promise((resolve, reject) => {
    const checkGsi = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        try {
          tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: CALENDAR_SCOPE,
            callback: (tokenResponse: any) => {
              if (tokenResponse?.error) {
                console.error('GIS Error:', tokenResponse);
                onError(tokenResponse.error);
                return;
              }
              if (tokenResponse?.access_token) {
                const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3500;
                saveGoogleToken(tokenResponse.access_token, expiresIn);
                onSuccess(tokenResponse.access_token);
              }
            }
          });

          // Return trigger function
          resolve(() => {
            if (tokenClientInstance) {
              tokenClientInstance.requestAccessToken({ prompt: '' });
            }
          });
        } catch (err) {
          reject(err);
        }
      } else {
        setTimeout(checkGsi, 150);
      }
    };
    checkGsi();
  });
}

export async function requestGoogleCalendarLogin(): Promise<string> {
  const existing = getStoredGoogleToken();
  if (existing) return existing;

  const clientId = await fetchGoogleClientId();

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        clearInterval(interval);
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: CALENDAR_SCOPE,
            callback: (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(new Error(tokenResponse.error_description || tokenResponse.error));
                return;
              }
              if (tokenResponse?.access_token) {
                const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3500;
                saveGoogleToken(tokenResponse.access_token, expiresIn);
                resolve(tokenResponse.access_token);
              } else {
                reject(new Error('No access token received.'));
              }
            }
          });
          client.requestAccessToken({ prompt: '' });
        } catch (err) {
          reject(err);
        }
      } else if (attempts > 30) {
        clearInterval(interval);
        reject(new Error('Google Identity Services script failed to load. Please check your network.'));
      }
    }, 100);
  });
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
      throw new Error('Google authorization expired. Please reconnect Google Calendar.');
    }
    throw new Error(`Google Calendar API error: ${errorText}`);
  }

  return res.json();
}

export async function listUpcomingGoogleCalendarEvents(token: string, maxResults: number = 8): Promise<any[]> {
  const now = new Date().toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      clearGoogleToken();
      throw new Error('Google authorization expired.');
    }
    return [];
  }

  const data = await res.json();
  return data.items || [];
}

export async function syncSingleAlertToGoogle(token: string, alert: Alert): Promise<{ success: boolean; eventId?: string }> {
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
      description: `${alert.description || 'FocusFlow Scheduled Reminder'}\n\nTime: ${alert.time} on ${alert.date}\nDirect notification synced to phone.`,
      startIso,
      remindMinutesBefore: 0
    });

    // Mark as synced
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

  // Sync pending alerts that have not yet been dismissed or completed
  const pendingAlerts = alerts.filter((a) => a.status === 'pending');

  for (const alert of pendingAlerts) {
    try {
      await syncSingleAlertToGoogle(token, alert);
      syncedCount++;
    } catch (err) {
      errors++;
    }
  }

  return { syncedCount, errors };
}
