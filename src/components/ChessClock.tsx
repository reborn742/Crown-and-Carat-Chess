import React from 'react';
import { PieceColor } from '../game/types';
import { Clock } from 'lucide-react';

interface ChessClockProps {
  whiteTime: number; // in seconds, -1 if untimed
  blackTime: number;
  activeColor: PieceColor;
  isGameActive: boolean;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  whiteTime,
  blackTime,
  activeColor,
  isGameActive,
}) => {
  if (whiteTime === -1) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-amber-200/50 font-serif">
        <Clock className="w-3.5 h-3.5" />
        <span>Untimed Royal Match</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWhiteActive = isGameActive && activeColor === 'w';
  const isBlackActive = isGameActive && activeColor === 'b';

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 select-none">
      {/* White Clock */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-300 ${
          isWhiteActive
            ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
            : 'bg-[#120a1c]/80 border-amber-500/20 opacity-75'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white border border-amber-400 shadow-[0_0_6px_#ffffff]" />
          <span className="font-serif text-xs text-amber-100 font-semibold">White</span>
        </div>
        <span
          className={`font-mono text-base sm:text-lg font-bold tracking-wider ${
            whiteTime <= 30 && whiteTime > 0
              ? 'text-red-400 animate-pulse'
              : 'text-amber-200'
          }`}
        >
          {formatTime(whiteTime)}
        </span>
      </div>

      {/* Black Clock */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-300 ${
          isBlackActive
            ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
            : 'bg-[#120a1c]/80 border-amber-500/20 opacity-75'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-800 border border-amber-400 shadow-[0_0_6px_#ff4d6d]" />
          <span className="font-serif text-xs text-amber-100 font-semibold">Black</span>
        </div>
        <span
          className={`font-mono text-base sm:text-lg font-bold tracking-wider ${
            blackTime <= 30 && blackTime > 0
              ? 'text-red-400 animate-pulse'
              : 'text-amber-200'
          }`}
        >
          {formatTime(blackTime)}
        </span>
      </div>
    </div>
  );
};
