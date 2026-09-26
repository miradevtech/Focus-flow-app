import React, { useState, useEffect } from 'react';
import { Clock, ArrowRight, Zap } from 'lucide-react';

interface TimePicker24Props {
  value: string; // "HH:mm" e.g. "18:07" or "19:47"
  onChange: (time: string) => void;
  className?: string;
  label?: string;
}

export const TimePicker24: React.FC<TimePicker24Props> = ({
  value,
  onChange,
  className = '',
  label = 'Time (24-Hour Format)'
}) => {
  // Current local time
  const [nowTimeStr, setNowTimeStr] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateNow = () => {
      const d = new Date();
      setNowTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    updateNow();
    const interval = setInterval(updateNow, 10000);
    return () => clearInterval(interval);
  }, []);

  // Normalize incoming value strictly to 2-digit HH:mm
  const normalized = (value || '12:00').replace('.', ':');
  const [hRaw, mRaw] = normalized.includes(':') ? normalized.split(':') : ['12', '00'];

  const hourNum = parseInt(hRaw, 10) || 0;
  const minuteNum = parseInt(mRaw, 10) || 0;

  const currentHour = String(Math.min(23, Math.max(0, hourNum))).padStart(2, '0');
  const currentMinute = String(Math.min(59, Math.max(0, minuteNum))).padStart(2, '0');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`);
  };

  // Quick set helper: Add minutes to right now
  const handleAddMinutesFromNow = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    onChange(`${h}:${m}`);
  };

  // Friendly name for 24h hours (00 to 23)
  const getHourDescriptor = (h: number): string => {
    if (h === 0) return '00:00 (Midnight)';
    if (h === 12) return '12:00 (Noon)';
    if (h >= 1 && h <= 5) return `${String(h).padStart(2, '0')}:00 (Night)`;
    if (h >= 6 && h <= 11) return `${String(h).padStart(2, '0')}:00 (Morning)`;
    if (h >= 13 && h <= 17) return `${String(h).padStart(2, '0')}:00 (Afternoon)`;
    if (h >= 18 && h <= 21) return `${String(h).padStart(2, '0')}:00 (Evening)`;
    return `${String(h).padStart(2, '0')}:00 (Night)`;
  };

  // Check if user selected morning hour (1..11) while it's evening right now
  const nowHour = new Date().getHours();
  const isMorningHourSelected = hourNum >= 1 && hourNum <= 11;
  const eveningCounterpart = hourNum + 12; // e.g. 7 -> 19

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{label}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">
              Current: <strong className="text-white font-mono">{nowTimeStr}</strong>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/40 text-indigo-300 font-bold">
              {currentHour}:{currentMinute}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Hour Select 00 - 23 */}
        <div className="relative">
          <label className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Hour (00 to 23)</label>
          <select
            value={currentHour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {hours.map((h) => (
              <option key={h} value={h} className="bg-zinc-900 text-white font-mono">
                {getHourDescriptor(parseInt(h, 10))}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Select 00 - 59 */}
        <div className="relative">
          <label className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Minute (00 to 59)</label>
          <select
            value={currentMinute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {minutes.map((m) => (
              <option key={m} value={m} className="bg-zinc-900 text-white font-mono">
                :{m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Helpful Smart Notice: Did you mean evening? */}
      {nowHour >= 12 && isMorningHourSelected && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs animate-in fade-in">
          <div className="text-amber-200">
            <span className="font-semibold text-amber-300">{currentHour}:{currentMinute}</span> is morning. Did you mean evening?
          </div>
          <button
            type="button"
            onClick={() => onChange(`${String(eveningCounterpart).padStart(2, '0')}:${currentMinute}`)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-all flex items-center gap-1 shrink-0 text-[11px]"
          >
            <span>Set to {eveningCounterpart}:{currentMinute}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Offset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
          <Zap className="w-3 h-3 text-indigo-400" />
          Quick add:
        </span>
        <button
          type="button"
          onClick={() => handleAddMinutesFromNow(2)}
          className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-zinc-800 active:scale-95 transition-all"
        >
          +2 min
        </button>
        <button
          type="button"
          onClick={() => handleAddMinutesFromNow(5)}
          className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-zinc-800 active:scale-95 transition-all"
        >
          +5 min
        </button>
        <button
          type="button"
          onClick={() => handleAddMinutesFromNow(15)}
          className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-zinc-800 active:scale-95 transition-all"
        >
          +15 min
        </button>
        <button
          type="button"
          onClick={() => handleAddMinutesFromNow(60)}
          className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-zinc-800 active:scale-95 transition-all"
        >
          +1 hr
        </button>
      </div>
    </div>
  );
};
