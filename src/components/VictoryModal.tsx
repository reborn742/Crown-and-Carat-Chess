import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, ThemeConfig } from '../game/types';
import { soundEngine } from '../game/audio';
import { Crown, Sparkles, RotateCcw, Eye, ArrowLeft, Home } from 'lucide-react';

interface VictoryModalProps {
  gameState: GameState;
  theme: ThemeConfig;
  timeoutWinner?: 'w' | 'b';
  onPlayAgain: () => void;
  onDismiss: () => void;
  onReturnToMenu?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  theme,
  timeoutWinner,
  onPlayAgain,
  onDismiss,
  onReturnToMenu,
}) => {
  const winner = timeoutWinner || gameState.winner;

  useEffect(() => {
    soundEngine.playVictory();

    // Fire luxurious jewel confetti burst
    const colors = [
      '#ffd700', // Gold
      '#ff4d6d', // Ruby crimson
      '#67e8f9', // Diamond cyan
      '#2dd4bf', // Emerald teal
      '#f59e0b', // Topaz amber
      '#ffffff', // Diamond white
    ];

    const end = Date.now() + 2500;
    const interval: NodeJS.Timeout = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 40,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: Math.random() * 0.4 + 0.3,
          y: Math.random() * 0.4 + 0.2,
        },
        colors,
        shapes: ['square', 'circle'],
        scalar: 1.2,
        ticks: 200,
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  let title = 'ROYAL VICTORY';
  let subtitle = '';
  let crownColor = 'text-amber-400';

  if (timeoutWinner) {
    title = `${timeoutWinner === 'w' ? 'White' : 'Black'} Triumphs`;
    subtitle = 'Opponent elapsed all allotted royal sand';
  } else if (gameState.resignedBy) {
    if (gameState.resignedBy === 'w') {
      title = `${theme.darkPieceName} Victorious`;
      subtitle = 'White yielded the Crown by honorable Resignation';
      crownColor = 'text-red-400';
    } else {
      title = `${theme.lightPieceName} Ascendant`;
      subtitle = 'Black yielded the Crown by honorable Resignation';
      crownColor = 'text-amber-400';
    }
  } else if (gameState.isCheckmate) {
    if (winner === 'w') {
      title = `${theme.lightPieceName} Ascendant`;
      subtitle = 'White delivers glorious Checkmate';
    } else {
      title = `${theme.darkPieceName} Victorious`;
      subtitle = 'Black delivers devastating Checkmate';
      crownColor = 'text-red-400';
    }
  } else if (gameState.isStalemate) {
    title = 'Stalemate Partition';
    subtitle = 'Neither side can advance; a bloodless peace';
  } else if (gameState.isDraw) {
    title = 'Imperial Truce';
    if (gameState.drawReason === 'mutual-agreement') {
      subtitle = 'Both monarchs agreed to an honorable peaceful draw';
    } else if (gameState.drawReason === 'threefold') {
      subtitle = 'Draw declared by threefold repetition';
    } else if (gameState.drawReason === 'fifty-move') {
      subtitle = 'Draw declared by the 50-move decree';
    } else if (gameState.drawReason === 'insufficient-material') {
      subtitle = 'Draw by insufficient material to conquer';
    } else {
      subtitle = 'The monarchs agree to a draw';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1e1333] via-[#120a1f] to-[#0a0512] border-2 border-[#d4af37] rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(212,175,55,0.4)]">
        {/* Filigree corner accents */}
        <div className="absolute top-3 left-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute top-3 right-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 left-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 right-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>

        <div className="inline-flex p-4 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-900/30 border border-amber-400/50 mb-3 shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-bounce">
          <Crown className={`w-10 h-10 ${crownColor}`} />
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 tracking-wider">
          {title}
        </h2>
        <p className="font-serif text-xs text-amber-200/80 mt-1 mb-5 italic">
          {subtitle}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-black/40 border border-amber-500/20 rounded-xl mb-6 text-left">
          <div>
            <span className="block text-[10px] font-serif uppercase tracking-wider text-amber-400/60">
              Total Moves
            </span>
            <span className="font-mono text-base font-bold text-amber-100">
              {gameState.fullmoveNumber} full moves ({gameState.history.length} plies)
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-serif uppercase tracking-wider text-amber-400/60">
              Ending Verdict
            </span>
            <span className="font-serif text-sm font-bold text-amber-300 capitalize">
              {gameState.resignedBy
                ? 'Resignation'
                : gameState.isCheckmate
                ? 'Checkmate'
                : gameState.isStalemate
                ? 'Stalemate'
                : gameState.drawReason === 'mutual-agreement'
                ? 'Mutual Draw'
                : 'Truce'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d4af37] hover:from-[#fef08a] hover:via-[#f59e0b] hover:to-[#fef08a] text-[#120a1c] font-serif font-bold text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Play Again
          </button>

          <button
            onClick={onDismiss}
            className="py-3 px-4 rounded-xl border border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-200 font-serif font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Review Board
          </button>
        </div>

        {onReturnToMenu && (
          <button
            onClick={onReturnToMenu}
            className="w-full mt-3 py-2.5 px-4 rounded-xl border border-amber-500/30 bg-stone-900/80 hover:bg-amber-500/10 text-amber-300 font-serif font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>← Back to Main Menu</span>
          </button>
        )}
      </div>
    </div>
  );
};
