import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25 ${className}`}>
      <div className="w-full h-full bg-[#12141C] rounded-[14px] flex items-center justify-center">
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-indigo-400"
        >
          <circle cx="12" cy="12" r="9" className="text-purple-500/30" stroke="currentColor" />
          <circle cx="12" cy="12" r="5" className="text-indigo-400" stroke="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-pink-400" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" className="text-indigo-400/80" />
        </svg>
      </div>
    </div>
  );
};
