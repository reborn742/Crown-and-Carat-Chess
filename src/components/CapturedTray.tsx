import React from 'react';
import { CapturedPieces, Piece, ThemeConfig } from '../game/types';
import { GemPiece } from './GemPiece';
import { getMaterialAdvantage } from '../game/chessEngine';

interface CapturedTrayProps {
  captured: CapturedPieces;
  theme: ThemeConfig;
  forColor: 'w' | 'b'; // Which side's captured spoils we are showing
  playerName: string;
}

export const CapturedTray: React.FC<CapturedTrayProps> = ({
  captured,
  theme,
  forColor,
  playerName,
}) => {
  // If forColor is 'w', this player captured Black pieces (captured.b)
  // If forColor is 'b', this player captured White pieces (captured.w)
  const pieces = forColor === 'w' ? captured.b : captured.w;
  const oppColor = forColor === 'w' ? 'b' : 'w';

  const advantage = getMaterialAdvantage(captured);
  const diff = forColor === 'w' ? advantage.diff : -advantage.diff;

  // Sort pieces by value: Q, R, B, N, P
  const sortOrder: Record<string, number> = { q: 5, r: 4, b: 3, n: 2, p: 1 };
  const sortedPieces = [...pieces].sort((a, b) => sortOrder[b.type] - sortOrder[a.type]);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#120a1c]/80 border border-amber-500/20 rounded-lg backdrop-blur-sm min-h-[36px]">
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-[80%]">
        <span className="text-[11px] font-serif text-amber-200/80 font-medium shrink-0">
          {playerName}:
        </span>
        {sortedPieces.length === 0 ? (
          <span className="text-[10px] text-amber-100/30 italic">No spoils claimed</span>
        ) : (
          <div className="flex items-center -space-x-1.5">
            {sortedPieces.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform hover:scale-125 hover:z-20 drop-shadow-sm"
                title={`${oppColor === 'w' ? 'White' : 'Black'} ${p.type.toUpperCase()}`}
              >
                <GemPiece type={p.type} color={oppColor} theme={theme} />
              </div>
            ))}
          </div>
        )}
      </div>

      {diff > 0 && (
        <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm">
          +{diff}
        </span>
      )}
    </div>
  );
};
