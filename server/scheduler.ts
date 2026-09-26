import webpush from 'web-push';
import { getDb, saveDb, addSchedulerLog, addHistoryRecord, Alert, SchedulerLog } from './db';

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

export function initWebPush() {
  const db = getDb();
  try {
    webpush.setVapidDetails(
      'mailto:support@focusflow.app',
      db.vapidKeys.publicKey,
      db.vapidKeys.privateKey
    );
    addSchedulerLog({
      type: 'info',
      message: 'VAPID keys loaded and Web Push configured.'
    });
  } catch (err: any) {
    console.error('Failed to initialize Web Push VAPID:', err);
    addSchedulerLog({
      type: 'error',
      message: `Failed to initialize VAPID: ${err?.message || err}`
    });
  }
}

export function startScheduler() {
  if (schedulerInterval) return;

  initWebPush();
  isRunning = true;

  addSchedulerLog({
    type: 'info',
    message: 'FocusFlow background scheduler started (10-second tick frequency).'
  });

  schedulerInterval = setInterval(async () => {
    try {
      await tickScheduler();
    } catch (err: any) {
      console.error('Scheduler tick error:', err);
      addSchedulerLog({
        type: 'error',
        message: `Tick cycle error: ${err?.message || err}`
      });
    }
  }, 10000); // 10s tick interval for responsive notification delivery
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  isRunning = false;
  addSchedulerLog({
    type: 'warn',
    message: 'Scheduler stopped.'
  });
}

export async function tickScheduler() {
  const db = getDb();
  const nowIso = new Date().toISOString();

  // Find all pending alerts whose scheduled time has arrived or passed
  const dueAlerts = db.alerts.filter(
    (a) => a.status === 'pending' && a.remindAtUtc <= nowIso
  );

  if (dueAlerts.length === 0) {
    return;
  }

  for (const alert of dueAlerts) {
    await processDueAlert(alert);
  }

  saveDb();
}

async function processDueAlert(alert: Alert) {
  const db = getDb();
  const userSubs = db.pushSubscriptions.filter((s) => s.userId === alert.userId);

  const payload = JSON.stringify({
    title: `FocusFlow Alert: ${alert.title}`,
    body: alert.description || `Scheduled for ${alert.date} at ${alert.time}`,
    icon: '/icon-192.png',
    data: {
      url: '/?tab=alerts',
      alertId: alert.id,
      date: alert.date,
      time: alert.time
    }
  });

  let deliveredCount = 0;
  let failedCount = 0;

  for (const sub of userSubs) {
    try {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };

      await webpush.sendNotification(pushConfig, payload);
      deliveredCount++;
    } catch (err: any) {
      failedCount++;
      // If subscription expired or not registered anymore (404/410), prune it
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.pushSubscriptions = db.pushSubscriptions.filter((s) => s.id !== sub.id);
        addSchedulerLog({
          type: 'warn',
          message: `Pruned expired push subscription for user ${alert.userId}`,
          userId: alert.userId
        });
      } else {
        console.warn('Push delivery failed for subscription:', err.message);
      }
    }
  }

  // Update alert status
  alert.status = 'triggered';
  alert.notifiedAt = new Date().toISOString();
  alert.updatedAt = new Date().toISOString();

  addSchedulerLog({
    type: 'trigger',
    message: `Dispatched alert "${alert.title}" to ${deliveredCount} device(s) (${failedCount} failed/offline).`,
    alertId: alert.id,
    userId: alert.userId
  });

  addHistoryRecord({
    userId: alert.userId,
    action: 'Alert Triggered',
    entityType: 'alert',
    entityId: alert.id,
    title: alert.title,
    details: `Triggered at ${new Date().toLocaleTimeString()} (Scheduled: ${alert.date} ${alert.time})`
  });
}

export function getSchedulerDiagnostics(userId: string) {
  const db = getDb();
  const now = new Date();
  const userSubs = db.pushSubscriptions.filter((s) => s.userId === userId);
  const userPending = db.alerts.filter((a) => a.userId === userId && a.status === 'pending');
  const allPending = db.alerts.filter((a) => a.status === 'pending');

  return {
    schedulerStatus: isRunning ? 'RUNNING' : 'STOPPED',
    serverTimeUtc: now.toISOString(),
    serverTimeLocal: now.toString(),
    serverTimestamp: now.getTime(),
    userPushDevices: userSubs.length,
    totalPushDevices: db.pushSubscriptions.length,
    userPendingQueue: userPending.length,
    totalPendingQueue: allPending.length,
    vapidPublicKeyConfigured: Boolean(db.vapidKeys.publicKey),
    recentLogs: db.schedulerLogs.slice(0, 30)
  };
}
