import React from 'react';
import { BoardSquare, Move, PieceColor, Position, ThemeConfig } from '../game/types';
import { GemPiece } from './GemPiece';
import { posToSquare } from '../game/chessEngine';

interface SquareProps {
  pos: Position;
  piece: BoardSquare;
  isLight: boolean;
  theme: ThemeConfig;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCaptureTarget: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isKingInCheck: boolean;
  isAlongTravelPath?: boolean;
  isHidden?: boolean;
  onSquareClick: (pos: Position) => void;
  onDragStart?: (e: React.DragEvent, pos: Position) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, pos: Position) => void;
}

const SquareComponent: React.FC<SquareProps> = ({
  pos,
  piece,
  isLight,
  theme,
  isSelected,
  isLegalTarget,
  isCaptureTarget,
  isLastMoveFrom,
  isLastMoveTo,
  isKingInCheck,
  isAlongTravelPath = false,
  isHidden = false,
  onSquareClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const sqName = posToSquare(pos);
  const isLastMove = isLastMoveFrom || isLastMoveTo;

  // Pattern fill depending on theme and square color
  let patternId = 'marble-gold-veins';
  if (theme.id === 'diamond-ruby') {
    patternId = isLight ? 'marble-gold-veins' : 'obsidian-gold-flecks';
  } else if (theme.id === 'emerald-pearl') {
    patternId = isLight ? 'marble-gold-veins' : 'malachite-waves';
  } else {
    patternId = isLight ? 'marble-gold-veins' : 'sodalite-bands';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${sqName} ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : 'empty'}`}
      onClick={() => onSquareClick(pos)}
      onDragOver={onDragOver}
      onDrop={e => onDrop && onDrop(e, pos)}
      className={`relative w-full h-full flex items-center justify-center cursor-pointer overflow-hidden transition-colors duration-100 select-none ${
        isLight ? theme.lightSquareStyle : theme.darkSquareStyle
      } ${
        isSelected
          ? 'ring-2 ring-amber-300 ring-inset shadow-[inset_0_0_20px_rgba(251,191,36,0.7)]'
          : ''
      } ${
        isLastMove
          ? 'bg-amber-400/25 shadow-[inset_0_0_14px_rgba(251,191,36,0.5)]'
          : ''
      } ${
        isAlongTravelPath
          ? 'bg-amber-300/30 shadow-[inset_0_0_18px_rgba(253,224,71,0.6)] animate-pulse'
          : ''
      }`}
    >
      {/* Stone Texture SVG Pattern Overlay with organic offset per tile */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity ${
          isLight ? 'opacity-85' : 'opacity-75'
        }`}
        style={{
          transform: `rotate(${((pos.row * 90 + pos.col * 45) % 360)}deg) scale(${1 + ((pos.row + pos.col) % 3) * 0.08})`,
          transformOrigin: 'center center',
        }}
      >
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Subtle stone bevel borders */}
      <div className="absolute inset-0 border border-black/15 pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.15)]" />

      {/* Polished Glass Clear-Coat Gloss Sheen */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
        }}
      />

      {/* Piece on Square with spring pick-up, floating bob, and elongated shadow */}
      {piece && !isHidden && (
        <div
          draggable={true}
          onDragStart={e => onDragStart && onDragStart(e, pos)}
          className={`relative w-full h-full flex items-center justify-center z-10 cursor-grab active:cursor-grabbing transition-transform duration-150 ease-out ${
            isSelected
              ? '-translate-y-3.5 scale-115 drop-shadow-[0_20px_22px_rgba(0,0,0,0.7)] animate-floatBob z-20'
              : 'hover:scale-105'
          }`}
        >
          <GemPiece
            type={piece.type}
            color={piece.color}
            theme={theme}
            isSelected={isSelected}
            isCheck={isKingInCheck && piece.type === 'k'}
          />
        </div>
      )}

      {/* Legal Move Indicator: Gem Dot for empty target */}
      {isLegalTarget && !piece && (
        <div className="absolute z-20 flex items-center justify-center pointer-events-none">
          <div
            className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
            style={{
              backgroundColor: theme.primaryAccent,
              color: theme.primaryAccent,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-0.5 opacity-90" />
          </div>
        </div>
      )}

      {/* Legal Move Indicator: Radiant Gem Ring for capture target */}
      {isCaptureTarget && (
        <div className="absolute inset-1 rounded-full z-20 pointer-events-none border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse" />
      )}
    </div>
  );
};

export const Square = React.memo(SquareComponent, (prev, next) => {
  return (
    prev.pos.row === next.pos.row &&
    prev.pos.col === next.pos.col &&
    prev.piece?.id === next.piece?.id &&
    prev.piece?.type === next.piece?.type &&
    prev.piece?.color === next.piece?.color &&
    prev.isLight === next.isLight &&
    prev.theme.id === next.theme.id &&
    prev.isSelected === next.isSelected &&
    prev.isLegalTarget === next.isLegalTarget &&
    prev.isCaptureTarget === next.isCaptureTarget &&
    prev.isLastMoveFrom === next.isLastMoveFrom &&
    prev.isLastMoveTo === next.isLastMoveTo &&
    prev.isKingInCheck === next.isKingInCheck &&
    prev.isAlongTravelPath === next.isAlongTravelPath &&
    prev.isHidden === next.isHidden &&
    prev.onSquareClick === next.onSquareClick
  );
});
