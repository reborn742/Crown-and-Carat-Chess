import React, { useState, useCallback, useMemo } from 'react';
import { ActiveAnimation, BoardGrid, Move, PieceColor, Position, ThemeConfig, AnimationIntensity } from '../game/types';
import { Square } from './Square';
import { StonePatterns } from './StonePatterns';
import { ParticleSystem, ParticleSystemHandle } from './ParticleSystem';
import { AnimatedMovingPiece } from './AnimatedMovingPiece';
import { FILES, findKing, RANKS } from '../game/chessEngine';

interface BoardProps {
  board: BoardGrid;
  theme: ThemeConfig;
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate?: boolean;
  selectedPos: Position | null;
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  isFlipped: boolean;
  is3DTilted: boolean;
  isShaking?: boolean;
  intensity: AnimationIntensity;
  activeAnimation: ActiveAnimation | null;
  particleRef: React.RefObject<ParticleSystemHandle | null>;
  onAnimationComplete: () => void;
  onSquareClick: (pos: Position) => void;
  onMovePiece: (from: Position, to: Position) => void;
}

const BOARD_POSITIONS: Position[][] = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 8 }, (_, c) => ({ row: r, col: c }))
);

export const Board: React.FC<BoardProps> = ({
  board,
  theme,
  turn,
  isCheck,
  isCheckmate = false,
  selectedPos,
  legalMovesForSelected,
  lastMove,
  isFlipped,
  is3DTilted,
  isShaking = false,
  intensity,
  activeAnimation,
  particleRef,
  onAnimationComplete,
  onSquareClick,
  onMovePiece,
}) => {
  const [draggedPos, setDraggedPos] = useState<Position | null>(null);

  // Rows and Cols order based on flip
  const rowIndices = useMemo(() => (isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]), [isFlipped]);
  const colIndices = useMemo(() => (isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]), [isFlipped]);

  const kingPos = (isCheck || isCheckmate) ? findKing(board, turn) : null;

  // Handle Drag & Drop with stable callbacks
  const handleDragStart = useCallback(
    (e: React.DragEvent, pos: Position) => {
      if (activeAnimation) {
        e.preventDefault();
        return;
      }
      const piece = board[pos.row][pos.col];
      if (!piece || piece.color !== turn) {
        e.preventDefault();
        return;
      }
      setDraggedPos(pos);
      e.dataTransfer.setData('text/plain', `${pos.row},${pos.col}`);
      e.dataTransfer.effectAllowed = 'move';
    },
    [activeAnimation, board, turn]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPos: Position) => {
      e.preventDefault();
      if (draggedPos) {
        onMovePiece(draggedPos, targetPos);
        setDraggedPos(null);
      }
    },
    [draggedPos, onMovePiece]
  );

  // Determine squares along active travel path for sequenced soft illumination
  const isSquareAlongPath = (r: number, c: number) => {
    if (!activeAnimation) return false;
    const { fromCoord, toCoord } = activeAnimation;

    // Direct match
    if (r === toCoord.row && c === toCoord.col) return true;
    if (r === fromCoord.row && c === fromCoord.col) return true;

    // Intermediate squares
    const minR = Math.min(fromCoord.row, toCoord.row);
    const maxR = Math.max(fromCoord.row, toCoord.row);
    const minC = Math.min(fromCoord.col, toCoord.col);
    const maxC = Math.max(fromCoord.col, toCoord.col);

    // Straight orthogonal ray
    if (fromCoord.row === toCoord.row && r === fromCoord.row && c >= minC && c <= maxC) {
      return true;
    }
    if (fromCoord.col === toCoord.col && c === fromCoord.col && r >= minR && r <= maxR) {
      return true;
    }

    // Diagonal ray
    if (Math.abs(fromCoord.row - toCoord.row) === Math.abs(fromCoord.col - toCoord.col)) {
      if (Math.abs(r - fromCoord.row) === Math.abs(c - fromCoord.col)) {
        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
          return true;
        }
      }
    }

    return false;
  };

  // Border theme colors
  const isPlatinum = theme.id === 'emerald-pearl';
  const borderGradient = isPlatinum
    ? 'from-[#f1f5f9] via-[#94a3b8] to-[#475569]'
    : 'from-[#fef08a] via-[#d4af37] to-[#78350f]';
  const cornerGemColor =
    theme.id === 'diamond-ruby'
      ? 'from-[#ff0054] to-[#800f2f]'
      : theme.id === 'emerald-pearl'
      ? 'from-[#10b981] to-[#064e3b]'
      : 'from-[#0284c7] to-[#1e3a8a]';

  return (
    <div
      className={`relative mx-auto transition-transform duration-500 ease-out ${
        is3DTilted
          ? 'transform perspective-1000 rotate-x-[12deg] scale-[0.98]'
          : ''
      } ${isShaking ? 'animate-rumble' : ''}`}
      style={{
        perspective: is3DTilted ? '1200px' : 'none',
      }}
    >
      <StonePatterns themeId={theme.id} />

      {/* Ornate Grand Frame */}
      <div
        className={`relative p-3 sm:p-5 md:p-6 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.2)] bg-gradient-to-br ${borderGradient} border-2 border-[#fff7ed]/20`}
      >
        {/* Inner Carved Wood / Obsidian Chamfer */}
        <div
          className={`relative p-2 sm:p-3.5 rounded-xl bg-gradient-to-br ${theme.frameInner} shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_2px_4px_rgba(255,255,255,0.1)]`}
        >
          {/* Filigree Corner 1 (Top-Left) with Inlaid Gem */}
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20 pointer-events-none flex items-center justify-center">
            <div
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${cornerGemColor} shadow-[0_0_10px_rgba(255,255,255,0.6)] border border-amber-200/50 flex items-center justify-center animate-pulse`}
            >
              <div className="w-1 h-1 bg-white rounded-full opacity-80" />
            </div>
          </div>

          {/* Filigree Corner 2 (Top-Right) with Inlaid Gem */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 pointer-events-none flex items-center justify-center">
            <div
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${cornerGemColor} shadow-[0_0_10px_rgba(255,255,255,0.6)] border border-amber-200/50 flex items-center justify-center animate-pulse`}
            >
              <div className="w-1 h-1 bg-white rounded-full opacity-80" />
            </div>
          </div>

          {/* Filigree Corner 3 (Bottom-Left) with Inlaid Gem */}
          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 z-20 pointer-events-none flex items-center justify-center">
            <div
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${cornerGemColor} shadow-[0_0_10px_rgba(255,255,255,0.6)] border border-amber-200/50 flex items-center justify-center animate-pulse`}
            >
              <div className="w-1 h-1 bg-white rounded-full opacity-80" />
            </div>
          </div>

          {/* Filigree Corner 4 (Bottom-Right) with Inlaid Gem */}
          <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-20 pointer-events-none flex items-center justify-center">
            <div
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${cornerGemColor} shadow-[0_0_10px_rgba(255,255,255,0.6)] border border-amber-200/50 flex items-center justify-center animate-pulse`}
            >
              <div className="w-1 h-1 bg-white rounded-full opacity-80" />
            </div>
          </div>

          {/* Top File Labels (a - h) */}
          <div className="flex justify-between px-3 sm:px-4 pb-1 sm:pb-1.5 text-[10px] sm:text-xs font-serif font-semibold text-amber-200/70 select-none">
            {colIndices.map(c => (
              <span key={`top-${c}`} className="w-8 sm:w-12 md:w-14 text-center">
                {FILES[c]}
              </span>
            ))}
          </div>

          {/* Middle Row with Rank Labels and Chess Board */}
          <div className="flex items-center">
            {/* Left Rank Labels (1 - 8) */}
            <div className="flex flex-col justify-between py-2 sm:py-3 pr-1 sm:pr-2 text-[10px] sm:text-xs font-serif font-semibold text-amber-200/70 select-none">
              {rowIndices.map(r => (
                <span key={`left-${r}`} className="h-8 sm:h-12 md:h-14 flex items-center justify-center">
                  {RANKS[r]}
                </span>
              ))}
            </div>

            {/* The 8x8 Chess Playing Field */}
            <div
              className="relative w-[280px] h-[280px] sm:w-[416px] sm:h-[416px] md:w-[480px] md:h-[480px] lg:w-[520px] lg:h-[520px] grid grid-cols-8 grid-rows-8 border-2 border-amber-500/40 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            >
              {rowIndices.map(r =>
                colIndices.map(c => {
                  const pos = BOARD_POSITIONS[r][c];
                  const piece = board[r][c];
                  const isLight = (r + c) % 2 === 0;

                  const isSelected = selectedPos?.row === r && selectedPos?.col === c;
                  const legalMove = legalMovesForSelected.find(
                    m => m.to.row === r && m.to.col === c
                  );
                  const isLegalTarget = Boolean(legalMove);
                  const isCaptureTarget = Boolean(legalMove && legalMove.captured);

                  const isLastMoveFrom =
                    Boolean(lastMove && lastMove.from.row === r && lastMove.from.col === c);
                  const isLastMoveTo =
                    Boolean(lastMove && lastMove.to.row === r && lastMove.to.col === c);

                  const isKingCheckSquare =
                    Boolean(kingPos && kingPos.row === r && kingPos.col === c);

                  // Is this piece currently animating in the overlay?
                  const isAnimatingFrom =
                    Boolean(
                      activeAnimation &&
                        activeAnimation.fromCoord.row === r &&
                        activeAnimation.fromCoord.col === c
                    );

                  const isSecondaryAnimatingFrom =
                    Boolean(
                      activeAnimation?.secondaryMove &&
                        activeAnimation.secondaryMove.fromCoord.row === r &&
                        activeAnimation.secondaryMove.fromCoord.col === c
                    );

                  const isHidden = isAnimatingFrom || isSecondaryAnimatingFrom;
                  const isAlongPath = isSquareAlongPath(r, c);

                  return (
                    <Square
                      key={`${r}-${c}`}
                      pos={pos}
                      piece={piece}
                      isLight={isLight}
                      theme={theme}
                      isSelected={isSelected}
                      isLegalTarget={isLegalTarget}
                      isCaptureTarget={isCaptureTarget}
                      isLastMoveFrom={isLastMoveFrom}
                      isLastMoveTo={isLastMoveTo}
                      isKingInCheck={isKingCheckSquare}
                      isAlongTravelPath={isAlongPath}
                      isHidden={isHidden}
                      onSquareClick={onSquareClick}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  );
                })
              )}

              {/* Dynamic Traveling Piece Overlay */}
              {activeAnimation && (
                <AnimatedMovingPiece
                  animation={activeAnimation}
                  theme={theme}
                  particleRef={particleRef}
                  onComplete={onAnimationComplete}
                  isFlipped={isFlipped}
                />
              )}

              {/* High-Performance 60FPS Canvas Particle System */}
              <ParticleSystem ref={particleRef} intensity={intensity} />

              {/* Checkmate Dramatic Spotlight Overlay */}
              {isCheckmate && kingPos && (
                <div
                  className="absolute inset-0 pointer-events-none z-35 animate-fadeIn"
                  style={{
                    background: `radial-gradient(circle at ${
                      ((isFlipped ? 7 - kingPos.col : kingPos.col) + 0.5) * 12.5
                    }% ${
                      ((isFlipped ? 7 - kingPos.row : kingPos.row) + 0.5) * 12.5
                    }%, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.85) 75%)`,
                  }}
                />
              )}

              {/* Surface Reflection Gloss Overlay */}
              <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-70"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
                }}
              />
            </div>

            {/* Right Rank Labels (1 - 8) */}
            <div className="flex flex-col justify-between py-2 sm:py-3 pl-1 sm:pr-2 text-[10px] sm:text-xs font-serif font-semibold text-amber-200/70 select-none">
              {rowIndices.map(r => (
                <span key={`right-${r}`} className="h-8 sm:h-12 md:h-14 flex items-center justify-center">
                  {RANKS[r]}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom File Labels (a - h) */}
          <div className="flex justify-between px-3 sm:px-4 pt-1 sm:pt-1.5 text-[10px] sm:text-xs font-serif font-semibold text-amber-200/70 select-none">
            {colIndices.map(c => (
              <span key={`bottom-${c}`} className="w-8 sm:w-12 md:w-14 text-center">
                {FILES[c]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
