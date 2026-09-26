import express from 'express';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  saveDb,
  addHistoryRecord,
  addSchedulerLog,
  User,
  Task,
  Goal,
  Project,
  ShoppingItem,
  Alert,
  Note,
  Person
} from './server/db';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  AuthenticatedRequest
} from './server/auth';
import { startScheduler, getSchedulerDiagnostics } from './server/scheduler';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function main() {
  const app = express();
  app.use(express.json());

  // Start background notification scheduler
  startScheduler();

  // Public/Vite static assets (icons, manifest, etc.)
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // ==========================================
  // AUTH ROUTES
  // ==========================================

  app.post('/api/auth/guest', (req, res) => {
    const db = getDb();
    let guestUser = db.users.find((u) => u.email === 'guest@focusflow.local');
    if (!guestUser) {
      guestUser = {
        id: 'usr_guest',
        name: 'FocusFlow User',
        email: 'guest@focusflow.local',
        passwordHash: hashPassword('guest12345'),
        createdAt: new Date().toISOString()
      };
      db.users.push(guestUser);
      saveDb();
    }
    const token = generateToken(guestUser);
    res.json({
      user: { id: guestUser.id, name: guestUser.name, email: guestUser.email },
      token
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();

    if (db.users.some((u) => u.email === normalizedEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb();

    addHistoryRecord({
      userId: newUser.id,
      action: 'Account Created',
      entityType: 'auth',
      entityId: newUser.id,
      title: 'Welcome to FocusFlow',
      details: 'Account successfully registered and secured.'
    });

    const token = generateToken(newUser);
    res.json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
      token
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email === normalizedEmail);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ==========================================
  // TASKS
  // ==========================================

  app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const tasks = db.tasks.filter((t) => t.userId === req.user!.id);
    res.json(tasks);
  });

  app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const { title, description, dueDate, dueTime, priority, category, checklist } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const db = getDb();
    const formattedChecklist = Array.isArray(checklist)
      ? checklist.map((item: any) => ({
          id: 'chk_' + Math.random().toString(36).substring(2, 9),
          title: String(item.title || item).trim(),
          completed: Boolean(item.completed)
        }))
      : [];

    const newTask: Task = {
      id: 'tsk_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      title: title.trim(),
      description: (description || '').trim(),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      dueTime: dueTime || '',
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      completed: false,
      completedAt: null,
      category: (category || 'General').trim(),
      checklist: formattedChecklist,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tasks.unshift(newTask);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Task Created',
      entityType: 'task',
      entityId: newTask.id,
      title: newTask.title,
      details: `Due ${newTask.dueDate}${newTask.dueTime ? ' at ' + newTask.dueTime : ''} (${newTask.priority} priority)`
    });

    res.status(201).json(newTask);
  });

  app.put('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, description, dueDate, dueTime, priority, category, checklist } = req.body;

    const db = getDb();
    const task = db.tasks.find((t) => t.id === id && t.userId === req.user!.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (dueTime !== undefined) task.dueTime = dueTime;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category.trim();
    if (checklist !== undefined && Array.isArray(checklist)) {
      task.checklist = checklist.map((item: any) => ({
        id: item.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: String(item.title || '').trim(),
        completed: Boolean(item.completed)
      }));
    }
    task.updatedAt = new Date().toISOString();

    saveDb();
    res.json(task);
  });

  app.patch('/api/tasks/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const task = db.tasks.find((t) => t.id === id && t.userId === req.user!.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (!task.checklist) task.checklist = [];
    const item = task.checklist.find((c) => c.id === itemId);
    if (!item) return res.status(404).json({ error: 'Checklist item not found.' });

    item.completed = !item.completed;
    task.updatedAt = new Date().toISOString();
    saveDb();
    res.json(task);
  });

  app.post('/api/tasks/:id/checklist', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Checklist title is required.' });

    const db = getDb();
    const task = db.tasks.find((t) => t.id === id && t.userId === req.user!.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (!task.checklist) task.checklist = [];
    task.checklist.push({
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      completed: false
    });
    task.updatedAt = new Date().toISOString();
    saveDb();
    res.json(task);
  });

  app.delete('/api/tasks/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const task = db.tasks.find((t) => t.id === id && t.userId === req.user!.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (!task.checklist) task.checklist = [];
    task.checklist = task.checklist.filter((c) => c.id !== itemId);
    task.updatedAt = new Date().toISOString();
    saveDb();
    res.json(task);
  });

  app.patch('/api/tasks/:id/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const task = db.tasks.find((t) => t.id === id && t.userId === req.user!.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();

    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: task.completed ? 'Task Completed' : 'Task Reopened',
      entityType: 'task',
      entityId: task.id,
      title: task.title,
      details: task.completed ? `Completed on ${new Date().toLocaleDateString()}` : 'Marked active'
    });

    res.json(task);
  });

  app.delete('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.tasks.findIndex((t) => t.id === id && t.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found.' });

    const [deleted] = db.tasks.splice(index, 1);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Task Deleted',
      entityType: 'task',
      entityId: deleted.id,
      title: deleted.title
    });

    res.json({ success: true, id });
  });

  // ==========================================
  // GOALS
  // ==========================================

  app.get('/api/goals', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const goals = db.goals.filter((g) => g.userId === req.user!.id);
    res.json(goals);
  });

  app.post('/api/goals', requireAuth, (req: AuthenticatedRequest, res) => {
    const { title, description, targetDate, checklist } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Goal title is required.' });
    }

    const db = getDb();
    const formattedChecklist = Array.isArray(checklist)
      ? checklist.map((item: any) => ({
          id: 'chk_' + Math.random().toString(36).substring(2, 9),
          title: String(item.title || item).trim(),
          completed: Boolean(item.completed)
        }))
      : [];

    const newGoal: Goal = {
      id: 'gol_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      title: title.trim(),
      description: (description || '').trim(),
      targetDate: targetDate || '',
      checklist: formattedChecklist,
      status: 'active',
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.goals.unshift(newGoal);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Goal Created',
      entityType: 'goal',
      entityId: newGoal.id,
      title: newGoal.title,
      details: `${newGoal.checklist.length} milestone steps scheduled`
    });

    res.status(201).json(newGoal);
  });

  app.put('/api/goals/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, description, targetDate, checklist, status } = req.body;

    const db = getDb();
    const goal = db.goals.find((g) => g.id === id && g.userId === req.user!.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    if (title !== undefined) goal.title = title.trim();
    if (description !== undefined) goal.description = description.trim();
    if (targetDate !== undefined) goal.targetDate = targetDate;
    if (status !== undefined) {
      goal.status = status;
      goal.completedAt = status === 'completed' ? new Date().toISOString() : null;
    }
    if (checklist !== undefined && Array.isArray(checklist)) {
      goal.checklist = checklist.map((item: any) => ({
        id: item.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: String(item.title || '').trim(),
        completed: Boolean(item.completed)
      }));
    }
    goal.updatedAt = new Date().toISOString();

    saveDb();
    res.json(goal);
  });

  app.patch('/api/goals/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const goal = db.goals.find((g) => g.id === id && g.userId === req.user!.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    const item = goal.checklist.find((c) => c.id === itemId);
    if (!item) return res.status(404).json({ error: 'Checklist item not found.' });

    item.completed = !item.completed;
    goal.updatedAt = new Date().toISOString();

    // If all items completed, mark goal complete
    const allDone = goal.checklist.length > 0 && goal.checklist.every((c) => c.completed);
    if (allDone && goal.status !== 'completed') {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
      addHistoryRecord({
        userId: req.user!.id,
        action: 'Goal Completed',
        entityType: 'goal',
        entityId: goal.id,
        title: goal.title,
        details: 'All milestones completed!'
      });
    }

    saveDb();
    res.json(goal);
  });

  app.delete('/api/goals/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.goals.findIndex((g) => g.id === id && g.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Goal not found.' });

    const [deleted] = db.goals.splice(index, 1);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Goal Deleted',
      entityType: 'goal',
      entityId: deleted.id,
      title: deleted.title
    });

    res.json({ success: true, id });
  });

  // ==========================================
  // PROJECTS
  // ==========================================

  app.get('/api/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const projects = db.projects.filter((p) => p.userId === req.user!.id);
    res.json(projects);
  });

  app.post('/api/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const { title, description, targetDate, color, checklist, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const db = getDb();
    const formattedChecklist = Array.isArray(checklist)
      ? checklist.map((item: any) => ({
          id: 'chk_' + Math.random().toString(36).substring(2, 9),
          title: String(item.title || item).trim(),
          completed: Boolean(item.completed)
        }))
      : [];

    const newProject: Project = {
      id: 'prj_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      title: title.trim(),
      description: (description || '').trim(),
      targetDate: targetDate || '',
      status: ['active', 'completed', 'on_hold'].includes(status) ? status : 'active',
      color: color || '#6366F1',
      checklist: formattedChecklist,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.projects.unshift(newProject);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Project Created',
      entityType: 'project',
      entityId: newProject.id,
      title: newProject.title,
      details: `${newProject.checklist.length} sub-tasks registered`
    });

    res.status(201).json(newProject);
  });

  app.put('/api/projects/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, description, targetDate, status, color, checklist } = req.body;

    const db = getDb();
    const project = db.projects.find((p) => p.id === id && p.userId === req.user!.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (targetDate !== undefined) project.targetDate = targetDate;
    if (color !== undefined) project.color = color;
    if (status !== undefined) {
      project.status = status;
      project.completedAt = status === 'completed' ? new Date().toISOString() : null;
    }
    if (checklist !== undefined && Array.isArray(checklist)) {
      project.checklist = checklist.map((item: any) => ({
        id: item.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: String(item.title || '').trim(),
        completed: Boolean(item.completed)
      }));
    }
    project.updatedAt = new Date().toISOString();

    saveDb();
    res.json(project);
  });

  app.patch('/api/projects/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const project = db.projects.find((p) => p.id === id && p.userId === req.user!.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const item = project.checklist.find((c) => c.id === itemId);
    if (!item) return res.status(404).json({ error: 'Checklist item not found.' });

    item.completed = !item.completed;
    project.updatedAt = new Date().toISOString();

    const allDone = project.checklist.length > 0 && project.checklist.every((c) => c.completed);
    if (allDone && project.status !== 'completed') {
      project.status = 'completed';
      project.completedAt = new Date().toISOString();
      addHistoryRecord({
        userId: req.user!.id,
        action: 'Project Completed',
        entityType: 'project',
        entityId: project.id,
        title: project.title,
        details: 'All project deliverables marked finished!'
      });
    }

    saveDb();
    res.json(project);
  });

  app.delete('/api/projects/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.projects.findIndex((p) => p.id === id && p.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Project not found.' });

    const [deleted] = db.projects.splice(index, 1);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Project Deleted',
      entityType: 'project',
      entityId: deleted.id,
      title: deleted.title
    });

    res.json({ success: true, id });
  });

  // ==========================================
  // SHOPPING
  // ==========================================

  app.get('/api/shopping', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const items = db.shopping.filter((s) => s.userId === req.user!.id);
    res.json(items);
  });

  app.post('/api/shopping', requireAuth, (req: AuthenticatedRequest, res) => {
    const { name, quantity, price, category, notes, image, checklist } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }

    const db = getDb();
    const formattedChecklist = Array.isArray(checklist)
      ? checklist.map((item: any) => ({
          id: 'chk_' + Math.random().toString(36).substring(2, 9),
          title: String(item.title || item).trim(),
          completed: Boolean(item.completed)
        }))
      : [];

    const newItem: ShoppingItem = {
      id: 'shp_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      name: name.trim(),
      quantity: (quantity || '1').trim(),
      price: typeof price === 'number' ? price : price ? parseFloat(price) : null,
      category: (category || 'Groceries').trim(),
      purchased: false,
      notes: (notes || '').trim(),
      image: image ? String(image).trim() : null,
      checklist: formattedChecklist,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.shopping.unshift(newItem);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Shopping Item Added',
      entityType: 'shopping',
      entityId: newItem.id,
      title: newItem.name,
      details: `${newItem.quantity} ${newItem.category}`
    });

    res.status(201).json(newItem);
  });

  app.put('/api/shopping/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { name, quantity, price, category, notes, purchased, image, checklist } = req.body;

    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    if (name !== undefined) item.name = name.trim();
    if (quantity !== undefined) item.quantity = quantity.trim();
    if (price !== undefined) item.price = price !== null && price !== '' ? parseFloat(price) : null;
    if (category !== undefined) item.category = category.trim();
    if (notes !== undefined) item.notes = notes.trim();
    if (purchased !== undefined) item.purchased = Boolean(purchased);
    if (image !== undefined) item.image = image ? String(image).trim() : null;
    if (checklist !== undefined && Array.isArray(checklist)) {
      item.checklist = checklist.map((chk: any) => ({
        id: chk.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: String(chk.title || '').trim(),
        completed: Boolean(chk.completed)
      }));
    }
    item.updatedAt = new Date().toISOString();

    saveDb();
    res.json(item);
  });

  app.put('/api/shopping/:id/image', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { image } = req.body;
    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    item.image = image ? String(image).trim() : null;
    item.updatedAt = new Date().toISOString();
    saveDb();
    res.json(item);
  });

  app.delete('/api/shopping/:id/image', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    item.image = null;
    item.updatedAt = new Date().toISOString();
    saveDb();
    res.json(item);
  });

  app.post('/api/shopping/:id/checklist', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Checklist title is required.' });

    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    if (!item.checklist) item.checklist = [];
    item.checklist.push({
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      completed: false
    });
    item.updatedAt = new Date().toISOString();
    saveDb();
    res.json(item);
  });

  app.patch('/api/shopping/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    if (!item.checklist) item.checklist = [];
    const chk = item.checklist.find((c) => c.id === itemId);
    if (!chk) return res.status(404).json({ error: 'Checklist item not found.' });

    chk.completed = !chk.completed;
    item.updatedAt = new Date().toISOString();
    saveDb();
    res.json(item);
  });

  app.delete('/api/shopping/:id/checklist/:itemId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id, itemId } = req.params;
    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    if (!item.checklist) item.checklist = [];
    item.checklist = item.checklist.filter((c) => c.id !== itemId);
    item.updatedAt = new Date().toISOString();
    saveDb();
    res.json(item);
  });

  app.patch('/api/shopping/:id/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const item = db.shopping.find((s) => s.id === id && s.userId === req.user!.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    item.purchased = !item.purchased;
    item.updatedAt = new Date().toISOString();
    saveDb();

    if (item.purchased) {
      addHistoryRecord({
        userId: req.user!.id,
        action: 'Shopping Item Purchased',
        entityType: 'shopping',
        entityId: item.id,
        title: item.name,
        details: `Bought on ${new Date().toLocaleDateString()}`
      });
    }

    res.json(item);
  });

  app.post('/api/shopping/clear-purchased', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const initialCount = db.shopping.length;
    db.shopping = db.shopping.filter((s) => !(s.userId === req.user!.id && s.purchased));
    saveDb();
    res.json({ cleared: initialCount - db.shopping.length });
  });

  app.delete('/api/shopping/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.shopping.findIndex((s) => s.id === id && s.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Item not found.' });

    const [deleted] = db.shopping.splice(index, 1);
    saveDb();
    res.json({ success: true, id: deleted.id });
  });

  // ==========================================
  // ALERTS & NOTIFICATIONS
  // ==========================================

  app.get('/api/alerts', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const alerts = db.alerts.filter((a) => a.userId === req.user!.id);
    res.json(alerts);
  });

  app.post('/api/alerts', requireAuth, (req: AuthenticatedRequest, res) => {
    const { title, description, date, time, userTimezone, remindAtUtc: clientRemindAtUtc } = req.body;
    if (!title || !title.trim() || !date || !time) {
      return res.status(400).json({ error: 'Title, date, and time are required.' });
    }

    const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const [h, m] = String(time).replace('.', ':').split(':');
    const cleanTime = `${String(parseInt(h, 10) || 0).padStart(2, '0')}:${String(parseInt(m, 10) || 0).padStart(2, '0')}`;

    let remindAtUtc = clientRemindAtUtc;
    if (!remindAtUtc) {
      try {
        const localDateStr = `${date}T${cleanTime}:00`;
        const localTimeMs = new Date(localDateStr).getTime();
        if (isNaN(localTimeMs)) {
          remindAtUtc = new Date(Date.now() + 60000).toISOString();
        } else {
          remindAtUtc = new Date(localDateStr).toISOString();
        }
      } catch {
        remindAtUtc = new Date(Date.now() + 60000).toISOString();
      }
    }

    const db = getDb();
    const newAlert: Alert = {
      id: 'alt_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      title: title.trim(),
      description: (description || '').trim(),
      date,
      time: cleanTime,
      remindAtUtc,
      userTimezone: tz,
      status: 'pending',
      notifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.alerts.unshift(newAlert);
    saveDb();

    addSchedulerLog({
      type: 'info',
      message: `Scheduled alert "${newAlert.title}" for ${newAlert.date} ${newAlert.time} (UTC: ${newAlert.remindAtUtc})`,
      alertId: newAlert.id,
      userId: req.user!.id
    });

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Alert Scheduled',
      entityType: 'alert',
      entityId: newAlert.id,
      title: newAlert.title,
      details: `Scheduled for ${date} at ${time}`
    });

    res.status(201).json(newAlert);
  });

  app.put('/api/alerts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, description, date, time } = req.body;

    const db = getDb();
    const alert = db.alerts.find((a) => a.id === id && a.userId === req.user!.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    if (title !== undefined) alert.title = title.trim();
    if (description !== undefined) alert.description = description.trim();
    if (date !== undefined) alert.date = date;
    if (time !== undefined) alert.time = time;

    if (date || time) {
      try {
        const localDateStr = `${alert.date}T${alert.time}:00`;
        alert.remindAtUtc = new Date(localDateStr).toISOString();
        alert.status = 'pending'; // reset if rescheduled
        alert.notifiedAt = null;
      } catch {}
    }

    alert.updatedAt = new Date().toISOString();
    saveDb();
    res.json(alert);
  });

  app.patch('/api/alerts/:id/dismiss', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const alert = db.alerts.find((a) => a.id === id && a.userId === req.user!.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    alert.status = 'dismissed';
    alert.updatedAt = new Date().toISOString();
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Alert Dismissed',
      entityType: 'alert',
      entityId: alert.id,
      title: alert.title,
      details: 'Dismissed by user'
    });

    res.json(alert);
  });

  app.delete('/api/alerts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.alerts.findIndex((a) => a.id === id && a.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Alert not found.' });

    const [deleted] = db.alerts.splice(index, 1);
    saveDb();
    res.json({ success: true, id: deleted.id });
  });

  // VAPID Public key for frontend push subscription
  app.get('/api/alerts/vapid-key', (req, res) => {
    const db = getDb();
    res.json({ publicKey: db.vapidKeys.publicKey });
  });

  // Register push subscription
  app.post('/api/alerts/subscribe', requireAuth, (req: AuthenticatedRequest, res) => {
    let { subscription, userAgent } = req.body;
    if (!subscription && req.body.endpoint) {
      subscription = req.body;
    }
    if (typeof subscription === 'string') {
      try {
        subscription = JSON.parse(subscription);
      } catch {}
    }

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload.' });
    }

    const db = getDb();
    const existing = db.pushSubscriptions.find(
      (s) => s.endpoint === subscription.endpoint
    );

    if (existing) {
      existing.userId = req.user!.id;
      existing.keys = subscription.keys;
      existing.userAgent = userAgent || existing.userAgent;
    } else {
      db.pushSubscriptions.push({
        id: 'sub_' + Math.random().toString(36).substring(2, 10),
        userId: req.user!.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || 'Browser Device',
        createdAt: new Date().toISOString()
      });
    }

    saveDb();

    addSchedulerLog({
      type: 'info',
      message: `Device push subscription active for user ${req.user!.email}`,
      userId: req.user!.id
    });

    res.json({
      success: true,
      registeredDevices: db.pushSubscriptions.filter((s) => s.userId === req.user!.id).length
    });
  });

  // Test push notification dispatch immediately
  app.post('/api/alerts/test-push', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userSubs = db.pushSubscriptions.filter((s) => s.userId === req.user!.id);
    if (userSubs.length === 0) {
      return res.status(400).json({
        error: 'No active push device registered for your account. Please enable notifications first.'
      });
    }

    const payload = JSON.stringify({
      title: 'FocusFlow Alert: Test Notification',
      body: '🎉 Background Push is active! You will receive scheduled reminders even when the app is closed or your phone is locked.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/?tab=alerts' }
    });

    let delivered = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, payload, {
          TTL: 86400,
          urgency: 'high'
        });
        delivered++;
      } catch (err: any) {
        console.warn('Test push delivery failed:', err?.message || err);
      }
    }

    res.json({
      success: true,
      deliveredDevices: delivered,
      totalDevices: userSubs.length
    });
  });

  // Scheduler & Push Diagnostics
  app.get('/api/alerts/diagnostics', requireAuth, (req: AuthenticatedRequest, res) => {
    const diag = getSchedulerDiagnostics(req.user!.id);
    res.json(diag);
  });

  // Create real 1-minute or 2-minute test reminder
  app.post('/api/alerts/test-reminder', requireAuth, (req: AuthenticatedRequest, res) => {
    const delayMinutes = req.body.minutes === 2 ? 2 : 1;
    const targetDate = new Date(Date.now() + delayMinutes * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
    const timeStr = `${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;

    const db = getDb();
    const testAlert: Alert = {
      id: 'alt_test_' + Math.random().toString(36).substring(2, 9),
      userId: req.user!.id,
      title: `${delayMinutes}-Minute Test Alert`,
      description: `Testing FocusFlow Web Push notifications & scheduler (${delayMinutes}m test)`,
      date: dateStr,
      time: timeStr,
      remindAtUtc: targetDate.toISOString(),
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      status: 'pending',
      notifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.alerts.unshift(testAlert);
    saveDb();

    addSchedulerLog({
      type: 'info',
      message: `Enqueued ${delayMinutes}m test alert "${testAlert.title}" due at ${targetDate.toLocaleTimeString()}`,
      alertId: testAlert.id,
      userId: req.user!.id
    });

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Test Alert Scheduled',
      entityType: 'alert',
      entityId: testAlert.id,
      title: testAlert.title,
      details: `Scheduled for ${timeStr} (${delayMinutes} minute delay)`
    });

    res.status(201).json(testAlert);
  });

  // ==========================================
  // NOTES
  // ==========================================

  app.get('/api/notes', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const notes = db.notes.filter((n) => n.userId === req.user!.id);
    res.json(notes);
  });

  app.post('/api/notes', requireAuth, (req: AuthenticatedRequest, res) => {
    const { title, content, tags, pinned } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required.' });
    }

    const db = getDb();
    const newNote: Note = {
      id: 'not_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      title: title.trim(),
      content: (content || '').trim(),
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      pinned: Boolean(pinned),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.notes.unshift(newNote);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Note Created',
      entityType: 'note',
      entityId: newNote.id,
      title: newNote.title
    });

    res.status(201).json(newNote);
  });

  app.put('/api/notes/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { title, content, tags, pinned } = req.body;

    const db = getDb();
    const note = db.notes.find((n) => n.id === id && n.userId === req.user!.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (tags !== undefined && Array.isArray(tags)) {
      note.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (pinned !== undefined) note.pinned = Boolean(pinned);
    note.updatedAt = new Date().toISOString();

    saveDb();
    res.json(note);
  });

  app.patch('/api/notes/:id/pin', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const note = db.notes.find((n) => n.id === id && n.userId === req.user!.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    saveDb();
    res.json(note);
  });

  app.delete('/api/notes/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.notes.findIndex((n) => n.id === id && n.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Note not found.' });

    const [deleted] = db.notes.splice(index, 1);
    saveDb();
    res.json({ success: true, id: deleted.id });
  });

  // ==========================================
  // PEOPLE (CONTACTS)
  // ==========================================

  app.get('/api/people', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const people = db.people.filter((p) => p.userId === req.user!.id);
    res.json(people);
  });

  app.post('/api/people', requireAuth, (req: AuthenticatedRequest, res) => {
    const { name, phone, email, relationship, notes, importantDate, reminderInfo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Contact name is required.' });
    }

    const db = getDb();
    const newPerson: Person = {
      id: 'ppl_' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.id,
      name: name.trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      relationship: (relationship || 'Contact').trim(),
      notes: (notes || '').trim(),
      importantDate: (importantDate || '').trim(),
      reminderInfo: (reminderInfo || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.people.unshift(newPerson);
    saveDb();

    addHistoryRecord({
      userId: req.user!.id,
      action: 'Contact Added',
      entityType: 'person',
      entityId: newPerson.id,
      title: newPerson.name,
      details: newPerson.relationship
    });

    res.status(201).json(newPerson);
  });

  app.put('/api/people/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { name, phone, email, relationship, notes, importantDate, reminderInfo } = req.body;

    const db = getDb();
    const person = db.people.find((p) => p.id === id && p.userId === req.user!.id);
    if (!person) return res.status(404).json({ error: 'Contact not found.' });

    if (name !== undefined) person.name = name.trim();
    if (phone !== undefined) person.phone = phone.trim();
    if (email !== undefined) person.email = email.trim();
    if (relationship !== undefined) person.relationship = relationship.trim();
    if (notes !== undefined) person.notes = notes.trim();
    if (importantDate !== undefined) person.importantDate = importantDate.trim();
    if (reminderInfo !== undefined) person.reminderInfo = reminderInfo.trim();
    person.updatedAt = new Date().toISOString();

    saveDb();
    res.json(person);
  });

  app.delete('/api/people/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.people.findIndex((p) => p.id === id && p.userId === req.user!.id);
    if (index === -1) return res.status(404).json({ error: 'Contact not found.' });

    const [deleted] = db.people.splice(index, 1);
    saveDb();
    res.json({ success: true, id: deleted.id });
  });

  // ==========================================
  // HISTORY
  // ==========================================

  app.get('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userHistory = db.history.filter((h) => h.userId === req.user!.id);
    res.json(userHistory);
  });

  app.delete('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.history = db.history.filter((h) => h.userId !== req.user!.id);
    saveDb();
    res.json({ success: true });
  });

  // ==========================================
  // VITE DEV SERVER / PROD STATIC SERVE
  // ==========================================

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FocusFlow server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal server startup error:', err);
});
