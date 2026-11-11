import React, { useEffect, useRef } from 'react';
import { Move } from '../game/types';
import { ScrollText } from 'lucide-react';

interface MoveHistoryProps {
  history: Move[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Group moves into pairs (White move, Black move)
  const movePairs: { num: number; white: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i].san || '...',
      black: history[i + 1]?.san,
    });
  }

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div className="flex flex-col h-full bg-[#120a1c]/90 border border-amber-500/30 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-amber-950/40 border-b border-amber-500/20">
        <div className="flex items-center gap-1.5 text-amber-200">
          <ScrollText className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-serif text-xs font-semibold tracking-wider">CHRONICLE OF MOVES</span>
        </div>
        <span className="text-[10px] text-amber-300/60 font-mono">
          {history.length} {history.length === 1 ? 'ply' : 'plies'}
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs max-h-[160px] sm:max-h-[220px]"
      >
        {movePairs.length === 0 ? (
          <div className="text-center py-6 text-amber-100/40 italic font-serif text-xs">
            The board awaits the opening royal stroke
          </div>
        ) : (
          movePairs.map((pair, idx) => {
            const isLatest = idx === movePairs.length - 1;
            return (
              <div
                key={pair.num}
                className={`flex items-center justify-between px-2.5 py-1 rounded text-amber-100/90 ${
                  isLatest ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5'
                }`}
              >
                <span className="w-8 text-amber-400/60 font-serif text-[11px] font-semibold">
                  {pair.num}.
                </span>
                <span className="flex-1 text-left font-medium text-amber-100">
                  {pair.white}
                </span>
                <span className="flex-1 text-left font-medium text-amber-200/80">
                  {pair.black || ''}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
