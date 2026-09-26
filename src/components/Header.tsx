import React from 'react';
import { User, TabType } from '../types';
import { Bell } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  user: User;
  currentTab: TabType;
  onLogout: () => void;
  onOpenQuickAdd?: () => void;
  onNavigate: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate
}) => {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getTabTitle = (tab: TabType): string => {
    switch (tab) {
      case 'home':
        return 'Dashboard';
      case 'tasks':
        return 'Tasks & To-Dos';
      case 'goals':
        return 'Personal Goals';
      case 'projects':
        return 'Projects';
      case 'shopping':
        return 'Shopping Lists';
      case 'alerts':
        return 'Reminders & Alerts';
      case 'notes':
        return 'Notes & Ideas';
      case 'people':
        return 'People & Contacts';
      case 'history':
        return 'Activity History';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-955 px-4 sm:px-8 pt-10 sm:pt-4 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Logo size={36} className="w-9 h-9" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">{todayStr}</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
            {getTabTitle(currentTab)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onNavigate('alerts')}
          className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
          title="Reminders & Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </button>
      </div>
    </header>
  );
};
