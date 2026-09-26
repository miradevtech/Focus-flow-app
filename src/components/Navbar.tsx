import React from 'react';
import { TabType } from '../types';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  FolderKanban,
  ShoppingCart,
  Bell,
  FileText,
  Users,
  History as HistoryIcon
} from 'lucide-react';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'people', label: 'People', icon: Users },
  { id: 'history', label: 'History', icon: HistoryIcon }
];

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-950/90 border-r border-zinc-900/80 p-6 shrink-0 sticky top-0 h-screen select-none">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            FF
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight">FocusFlow</h1>
            <p className="text-xs text-zinc-400">Productivity Workspace</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-white shadow-lg shadow-blue-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile & Tablet Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-900/80 px-2 py-2 shadow-2xl">
        <div className="flex items-center justify-between max-w-md mx-auto overflow-x-auto no-scrollbar gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-1 rounded-xl transition-all ${
                  isActive ? 'text-blue-400 bg-blue-600/10' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium tracking-tight truncate max-w-[60px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
