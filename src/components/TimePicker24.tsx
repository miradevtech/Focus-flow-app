import React from 'react';
import { Clock } from 'lucide-react';

interface TimePicker24Props {
  value: string; // "HH:mm" e.g. "18:07"
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
  // Normalize incoming value (e.g., "18.07" or "6:07" -> "18:07" or "06:07")
  const normalized = (value || '12:00').replace('.', ':');
  const [hStr, mStr] = normalized.includes(':') ? normalized.split(':') : ['12', '00'];

  const currentHour = (parseInt(hStr, 10) || 0).toString().padStart(2, '0');
  const currentMinute = (parseInt(mStr, 10) || 0).toString().padStart(2, '0');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`);
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace('.', ':');
    onChange(raw);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{label}</span>
          </label>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/40 text-indigo-300 font-bold">
            {currentHour}:{currentMinute} (24h)
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Hour Select 00 - 23 */}
        <div className="relative">
          <label className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Hour (00 - 23)</label>
          <select
            value={currentHour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {hours.map((h) => (
              <option key={h} value={h} className="bg-zinc-900 text-white font-mono">
                {h}:00
              </option>
            ))}
          </select>
        </div>

        {/* Minute Select 00 - 59 */}
        <div className="relative">
          <label className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Minute (00 - 59)</label>
          <select
            value={currentMinute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {minutes.map((m) => (
              <option key={m} value={m} className="bg-zinc-900 text-white">
                :{m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick 24h Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-zinc-500">Quick set:</span>
        {[
          { label: '08:00', val: '08:00' },
          { label: '12:00', val: '12:00' },
          { label: '14:00', val: '14:00' },
          { label: '18:00', val: '18:00' },
          { label: '18:07', val: '18:07' },
          { label: '20:00', val: '20:00' },
          { label: '22:00', val: '22:00' }
        ].map((p) => (
          <button
            key={p.val}
            type="button"
            onClick={() => onChange(p.val)}
            className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
              normalized === p.val
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
