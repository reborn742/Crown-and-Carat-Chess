import React from 'react';
import { PieceColor, PieceType, ThemeConfig } from '../game/types';
import { GemPiece } from './GemPiece';

interface PromotionDialogProps {
  color: PieceColor;
  theme: ThemeConfig;
  onSelect: (type: PieceType) => void;
  onCancel?: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  color,
  theme,
  onSelect,
  onCancel,
}) => {
  const pieces: { type: PieceType; label: string }[] = [
    { type: 'q', label: 'Imperial Queen' },
    { type: 'r', label: 'Castle Rook' },
    { type: 'b', label: 'Mitre Bishop' },
    { type: 'n', label: 'Royal Knight' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1c122c] via-[#120a1f] to-[#0a0512] border-2 border-[#d4af37] rounded-2xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.4)] text-center">
        {/* Filigree corner accents */}
        <div className="absolute top-2 left-2 text-[#d4af37] text-xs font-serif opacity-70">❖</div>
        <div className="absolute top-2 right-2 text-[#d4af37] text-xs font-serif opacity-70">❖</div>
        <div className="absolute bottom-2 left-2 text-[#d4af37] text-xs font-serif opacity-70">❖</div>
        <div className="absolute bottom-2 right-2 text-[#d4af37] text-xs font-serif opacity-70">❖</div>

        <h3 className="font-serif text-2xl font-bold text-amber-200 tracking-wider mb-1">
          Pawn Ascendancy
        </h3>
        <p className="text-xs text-amber-100/70 mb-5 font-sans">
          Select the gemstone artifact to bestow upon your promoted pawn
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {pieces.map(p => (
            <button
              key={p.type}
              onClick={() => onSelect(p.type)}
              className="group relative flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-500/30 bg-white/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 mb-1.5">
                <GemPiece type={p.type} color={color} theme={theme} />
              </div>
              <span className="font-serif text-sm font-semibold text-amber-100 group-hover:text-amber-300">
                {p.label}
              </span>
              <span className="text-[10px] text-amber-300/60 uppercase tracking-widest mt-0.5">
                {p.type === 'q' ? 'Supreme' : p.type === 'r' ? 'Fortress' : p.type === 'b' ? 'Zealot' : 'Steed'}
              </span>
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-xl border border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-300/80 hover:text-amber-200 text-xs font-serif font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>← Back / Cancel Move</span>
          </button>
        )}
      </div>
    </div>
  );
};
