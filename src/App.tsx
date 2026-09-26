import React, { useState, useEffect } from 'react';
import {
  User,
  TabType,
  Task,
  Goal,
  Project,
  ShoppingItem,
  Alert,
  Note,
  Person,
  HistoryItem
} from './types';
import { api, getStoredToken } from './api/client';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { QuickAddModal } from './components/QuickAddModal';
import { HomeView } from './components/HomeView';
import { TasksView } from './components/TasksView';
import { GoalsView } from './components/GoalsView';
import { ProjectsView } from './components/ProjectsView';
import { ShoppingView } from './components/ShoppingView';
import { AlertsView } from './components/AlertsView';
import { NotesView } from './components/NotesView';
import { PeopleView } from './components/PeopleView';
import { HistoryView } from './components/HistoryView';
import { Logo } from './components/Logo';
import { Smartphone, X, Download } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showAtsModal, setShowAtsModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      const dismissed = sessionStorage.getItem('focusflow_ats_dismissed');
      if (!dismissed) {
        setShowAtsModal(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismissAts = () => {
    setShowAtsModal(false);
    sessionStorage.setItem('focusflow_ats_dismissed', 'true');
  };

  const handleInstallClick = () => {
    alert('To add to Home Screen:\n• iPhone (Safari): Tap the Share button at the bottom and select "Add to Home Screen".\n• Android (Chrome): Tap the three dots menu in the top right and select "Add to Home screen" or "Install app".');
    setShowAtsModal(false);
    sessionStorage.setItem('focusflow_ats_dismissed', 'true');
  };

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Check auth on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      api
        .guestLogin()
        .then((res) => {
          setUser(res.user);
          fetchAllData();
        })
        .catch((err) => {
          console.error('Guest login failed', err);
        })
        .finally(() => {
          setLoadingAuth(false);
        });
      return;
    }

    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        fetchAllData();
      })
      .catch(() => {
        api.logout();
        api
          .guestLogin()
          .then((res) => {
            setUser(res.user);
            fetchAllData();
          })
          .finally(() => setLoadingAuth(false));
      })
      .finally(() => {
        setLoadingAuth(false);
      });
  }, []);

  const fetchAllData = async () => {
    try {
      const [t, g, p, s, a, n, pe, h] = await Promise.all([
        api.getTasks(),
        api.getGoals(),
        api.getProjects(),
        api.getShopping(),
        api.getAlerts(),
        api.getNotes(),
        api.getPeople(),
        api.getHistory()
      ]);
      setTasks(t);
      setGoals(g);
      setProjects(p);
      setShoppingItems(s);
      setAlerts(a);
      setNotes(n);
      setPeople(pe);
      setHistory(h);
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  };

  const handleLogout = () => {
    api.logout();
    api.guestLogin().then((res) => {
      setUser(res.user);
      fetchAllData();
    });
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await api.updateTask(id, { completed, completedAt: completed ? new Date().toISOString() : null });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAuth || showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300">
        <div className="space-y-6 max-w-sm w-full flex flex-col items-center">
          <Logo size={72} className="w-20 h-20 animate-bounce" />
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              FocusFlow Pro
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Your Productivity & Focus Command Center</p>
          </div>
          <div className="w-48 bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  const currentUser = user || { id: 'usr_guest', name: 'FocusFlow User', email: 'guest@focusflow.local' };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header
          user={currentUser}
          currentTab={currentTab}
          onLogout={handleLogout}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onNavigate={setCurrentTab}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {currentTab === 'home' && (
            <HomeView
              tasks={tasks}
              goals={goals}
              projects={projects}
              shoppingItems={shoppingItems}
              alerts={alerts}
              notes={notes}
              people={people}
              onNavigate={setCurrentTab}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onToggleTask={handleToggleTask}
            />
          )}
          {currentTab === 'tasks' && (
            <TasksView tasks={tasks} onRefresh={fetchAllData} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          )}
          {currentTab === 'goals' && (
            <GoalsView goals={goals} onRefresh={fetchAllData} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          )}
          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              onRefresh={fetchAllData}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}
          {currentTab === 'shopping' && (
            <ShoppingView
              shoppingItems={shoppingItems}
              onRefresh={fetchAllData}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}
          {currentTab === 'alerts' && (
            <AlertsView alerts={alerts} onRefresh={fetchAllData} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          )}
          {currentTab === 'notes' && (
            <NotesView notes={notes} onRefresh={fetchAllData} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          )}
          {currentTab === 'people' && (
            <PeopleView people={people} onRefresh={fetchAllData} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
          )}
          {currentTab === 'history' && <HistoryView history={history} />}
        </main>
      </div>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={fetchAllData}
        defaultType={currentTab}
      />

      {/* Add to Home Screen Prompt Modal */}
      {showAtsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-center space-y-4">
            <button
              onClick={handleDismissAts}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-xl bg-zinc-800/50"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Add to Home Screen</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Install FocusFlow Pro for lightning-fast access, offline support, and full-screen app experience!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDismissAts}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
              >
                Maybe Later
              </button>
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Add to Home Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
