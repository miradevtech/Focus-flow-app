import React from 'react';
import { HistoryItem } from '../types';
import { History as HistoryIcon, Clock, CheckCircle2 } from 'lucide-react';

interface HistoryViewProps {
  history: HistoryItem[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Activity History</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Chronological record of completed tasks, goals, projects, and activities.</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white mb-1">No history records yet</h3>
          <p className="text-xs text-zinc-400">Completed tasks and actions will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{item.action}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.details}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
