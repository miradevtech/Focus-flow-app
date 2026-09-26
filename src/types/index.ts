export type TabType =
  | 'home'
  | 'tasks'
  | 'goals'
  | 'projects'
  | 'shopping'
  | 'alerts'
  | 'notes'
  | 'people'
  | 'history';

export interface User {
  id: string;
  name: string;
  email: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  completed: boolean;
  completedAt: string | null;
  category: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
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

export type ProjectStatus = 'active' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: string;
  status: ProjectStatus;
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

export type AlertStatus = 'pending' | 'triggered' | 'dismissed' | 'completed';

export interface Alert {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  remindAtUtc: string;
  userTimezone: string;
  status: AlertStatus;
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
  action: string;
  entityType: 'task' | 'goal' | 'project' | 'shopping' | 'alert' | 'note' | 'person' | 'auth';
  entityId?: string;
  title: string;
  details?: string;
  timestamp: string;
}

export interface SchedulerDiagnostics {
  schedulerStatus: 'RUNNING' | 'STOPPED' | 'ERROR';
  serverTimeUtc: string;
  serverTimeLocal: string;
  serverTimestamp: number;
  userPushDevices: number;
  totalPushDevices: number;
  userPendingQueue: number;
  totalPendingQueue: number;
  vapidPublicKeyConfigured: boolean;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    type: 'info' | 'trigger' | 'warn' | 'error';
    message: string;
  }>;
}
