import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm or ''
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  completedAt: string | null;
  category: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: string;
  checklist: ChecklistItem[];
  status: 'active' | 'completed';
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'active' | 'completed' | 'on_hold';
  color: string;
  checklist: ChecklistItem[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  quantity: string;
  price: number | null;
  category: string;
  purchased: boolean;
  notes: string;
  image?: string | null;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  remindAtUtc: string; // ISO string calculated from user local timezone
  userTimezone: string;
  status: 'pending' | 'triggered' | 'dismissed' | 'completed';
  notifiedAt: string | null;
  googleEventId?: string | null;
  syncedToGoogle?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  notes: string;
  importantDate: string;
  reminderInfo: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  userId: string;
  action: string; // e.g. 'Task Completed', 'Goal Created', 'Shopping Item Purchased'
  entityType: 'task' | 'goal' | 'project' | 'shopping' | 'alert' | 'note' | 'person' | 'auth';
  entityId?: string;
  title: string;
  details?: string;
  timestamp: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
}

export interface SchedulerLog {
  id: string;
  timestamp: string;
  type: 'info' | 'trigger' | 'warn' | 'error';
  message: string;
  alertId?: string;
  userId?: string;
}

export interface DatabaseSchema {
  vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
  users: User[];
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  shopping: ShoppingItem[];
  alerts: Alert[];
  notes: Note[];
  people: Person[];
  history: HistoryItem[];
  pushSubscriptions: PushSubscriptionRecord[];
  schedulerLogs: SchedulerLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'focusflow-db.json');

let dbCache: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw);
      // Ensure all arrays exist in case of schema additions
      if (!dbCache!.vapidKeys || !dbCache!.vapidKeys.publicKey) {
        dbCache!.vapidKeys = webpush.generateVAPIDKeys();
      }
      if (!dbCache!.users) dbCache!.users = [];
      if (!dbCache!.tasks) dbCache!.tasks = [];
      if (!dbCache!.goals) dbCache!.goals = [];
      if (!dbCache!.projects) dbCache!.projects = [];
      if (!dbCache!.shopping) dbCache!.shopping = [];
      if (!dbCache!.alerts) dbCache!.alerts = [];
      if (!dbCache!.notes) dbCache!.notes = [];
      if (!dbCache!.people) dbCache!.people = [];
      if (!dbCache!.history) dbCache!.history = [];
      if (!dbCache!.pushSubscriptions) dbCache!.pushSubscriptions = [];
      if (!dbCache!.schedulerLogs) dbCache!.schedulerLogs = [];
      return dbCache!;
    } catch (err) {
      console.error('Failed reading DB file, recreating default:', err);
    }
  }

  // Generate VAPID keys once and persist
  const vapidKeys = webpush.generateVAPIDKeys();

  dbCache = {
    vapidKeys,
    users: [],
    tasks: [],
    goals: [],
    projects: [],
    shopping: [],
    alerts: [],
    notes: [],
    people: [],
    history: [],
    pushSubscriptions: [],
    schedulerLogs: [
      {
        id: 'init-1',
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'FocusFlow scheduler database initialized successfully'
      }
    ]
  };

  saveDb();
  return dbCache;
}

export function saveDb(): void {
  if (!dbCache) return;
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(dbCache, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database atomically:', err);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {}
  }
}

// Log helper
export function addSchedulerLog(log: Omit<SchedulerLog, 'id' | 'timestamp'>) {
  const db = getDb();
  const entry: SchedulerLog = {
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    ...log
  };
  db.schedulerLogs.unshift(entry);
  if (db.schedulerLogs.length > 200) {
    db.schedulerLogs = db.schedulerLogs.slice(0, 200);
  }
  saveDb();
  return entry;
}

// History helper
export function addHistoryRecord(record: Omit<HistoryItem, 'id' | 'timestamp'>) {
  const db = getDb();
  const entry: HistoryItem = {
    id: 'hist-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    ...record
  };
  db.history.unshift(entry);
  if (db.history.length > 1000) {
    db.history = db.history.slice(0, 1000);
  }
  saveDb();
  return entry;
}
