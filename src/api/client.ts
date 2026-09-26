import {
  User,
  Task,
  Goal,
  Project,
  ShoppingItem,
  Alert,
  Note,
  Person,
  HistoryItem,
  SchedulerDiagnostics
} from '../types';

const TOKEN_KEY = 'focusflow_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data && data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async guestLogin(): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/guest', {
      method: 'POST'
    });
    setStoredToken(res.token);
    return res;
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    setStoredToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  logout(): void {
    setStoredToken(null);
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    return request<Task[]>('/api/tasks');
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    return request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async toggleTask(id: string): Promise<Task> {
    return request<Task>(`/api/tasks/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  async addTaskChecklist(taskId: string, title: string): Promise<Task> {
    return request<Task>(`/api/tasks/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  },

  async toggleTaskChecklist(taskId: string, itemId: string): Promise<Task> {
    return request<Task>(`/api/tasks/${taskId}/checklist/${itemId}`, {
      method: 'PATCH'
    });
  },

  async deleteTaskChecklist(taskId: string, itemId: string): Promise<Task> {
    return request<Task>(`/api/tasks/${taskId}/checklist/${itemId}`, {
      method: 'DELETE'
    });
  },

  // Goals
  async getGoals(): Promise<Goal[]> {
    return request<Goal[]>('/api/goals');
  },

  async createGoal(data: {
    title: string;
    description: string;
    targetDate: string;
    checklist: Array<{ title: string; completed?: boolean }>;
  }): Promise<Goal> {
    return request<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
    return request<Goal>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async toggleGoalChecklist(id: string, itemId: string): Promise<Goal> {
    return request<Goal>(`/api/goals/${id}/checklist/${itemId}`, {
      method: 'PATCH'
    });
  },

  async deleteGoal(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/goals/${id}`, {
      method: 'DELETE'
    });
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/api/projects');
  },

  async createProject(data: {
    title: string;
    description: string;
    targetDate: string;
    color: string;
    status?: string;
    checklist: Array<{ title: string; completed?: boolean }>;
  }): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async toggleProjectChecklist(id: string, itemId: string): Promise<Project> {
    return request<Project>(`/api/projects/${id}/checklist/${itemId}`, {
      method: 'PATCH'
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Shopping
  async getShopping(): Promise<ShoppingItem[]> {
    return request<ShoppingItem[]>('/api/shopping');
  },

  async createShoppingItem(data: {
    name: string;
    quantity: string;
    price?: number | null;
    category: string;
    notes?: string;
  }): Promise<ShoppingItem> {
    return request<ShoppingItem>('/api/shopping', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateShoppingItem(id: string, data: Partial<ShoppingItem>): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async toggleShoppingPurchased(id: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  async clearPurchasedShopping(): Promise<{ cleared: number }> {
    return request<{ cleared: number }>('/api/shopping/clear-purchased', {
      method: 'POST'
    });
  },

  async deleteShoppingItem(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/shopping/${id}`, {
      method: 'DELETE'
    });
  },

  async addShoppingChecklist(itemId: string, title: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${itemId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  },

  async toggleShoppingChecklist(itemId: string, checkId: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${itemId}/checklist/${checkId}`, {
      method: 'PATCH'
    });
  },

  async deleteShoppingChecklist(itemId: string, checkId: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${itemId}/checklist/${checkId}`, {
      method: 'DELETE'
    });
  },

  async updateShoppingImage(itemId: string, image: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${itemId}/image`, {
      method: 'PUT',
      body: JSON.stringify({ image })
    });
  },

  async deleteShoppingImage(itemId: string): Promise<ShoppingItem> {
    return request<ShoppingItem>(`/api/shopping/${itemId}/image`, {
      method: 'DELETE'
    });
  },

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return request<Alert[]>('/api/alerts');
  },

  async createAlert(data: {
    title: string;
    description: string;
    date: string;
    time: string;
    userTimezone?: string;
  }): Promise<Alert> {
    return request<Alert>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAlert(id: string, data: Partial<Alert>): Promise<Alert> {
    return request<Alert>(`/api/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async dismissAlert(id: string): Promise<Alert> {
    return request<Alert>(`/api/alerts/${id}/dismiss`, {
      method: 'PATCH'
    });
  },

  async deleteAlert(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/alerts/${id}`, {
      method: 'DELETE'
    });
  },

  async getVapidPublicKey(): Promise<string> {
    const res = await request<{ publicKey: string }>('/api/alerts/vapid-key');
    return res.publicKey;
  },

  async registerPushSubscription(subscription: PushSubscription): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/alerts/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription,
        userAgent: navigator.userAgent
      })
    });
  },

  async getAlertDiagnostics(): Promise<SchedulerDiagnostics> {
    return request<SchedulerDiagnostics>('/api/alerts/diagnostics');
  },

  async triggerTestReminder(minutes: 1 | 2): Promise<Alert> {
    return request<Alert>('/api/alerts/test-reminder', {
      method: 'POST',
      body: JSON.stringify({ minutes })
    });
  },

  // Notes
  async getNotes(): Promise<Note[]> {
    return request<Note[]>('/api/notes');
  },

  async createNote(data: {
    title: string;
    content: string;
    tags: string[];
    pinned?: boolean;
  }): Promise<Note> {
    return request<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    return request<Note>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async togglePinNote(id: string): Promise<Note> {
    return request<Note>(`/api/notes/${id}/pin`, {
      method: 'PATCH'
    });
  },

  async deleteNote(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  },

  // People
  async getPeople(): Promise<Person[]> {
    return request<Person[]>('/api/people');
  },

  async createPerson(data: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    notes: string;
    importantDate: string;
    reminderInfo: string;
  }): Promise<Person> {
    return request<Person>('/api/people', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePerson(id: string, data: Partial<Person>): Promise<Person> {
    return request<Person>(`/api/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deletePerson(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/api/people/${id}`, {
      method: 'DELETE'
    });
  },

  // History
  async getHistory(): Promise<HistoryItem[]> {
    return request<HistoryItem[]>('/api/history');
  },

  async clearHistory(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/history', {
      method: 'DELETE'
    });
  }
};

// Base64 helper for VAPID applicationServerKey
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
