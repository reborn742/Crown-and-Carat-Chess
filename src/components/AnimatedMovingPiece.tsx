import React, { useEffect, useRef, useMemo } from 'react';
import { ActiveAnimation, ThemeConfig } from '../game/types';
import { GemPiece } from './GemPiece';
import { ParticleSystemHandle } from './ParticleSystem';
import { soundEngine } from '../game/audio';

interface Props {
  animation: ActiveAnimation;
  theme: ThemeConfig;
  particleRef: React.RefObject<ParticleSystemHandle | null>;
  onComplete: () => void;
  isFlipped: boolean;
}

export const AnimatedMovingPiece: React.FC<Props> = ({
  animation,
  theme,
  particleRef,
  onComplete,
  isFlipped,
}) => {
  const primaryElRef = useRef<HTMLDivElement | null>(null);
  const secondaryElRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const hasLandedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { fromCoord, toCoord, move, duration } = animation;
  const piece = move.piece;

  // Stable percentage coordinates
  const startPct = useMemo(() => {
    const c = isFlipped ? 7 - fromCoord.col : fromCoord.col;
    const r = isFlipped ? 7 - fromCoord.row : fromCoord.row;
    return {
      x: ((c + 0.5) / 8) * 100,
      y: ((r + 0.5) / 8) * 100,
    };
  }, [fromCoord.col, fromCoord.row, isFlipped]);

  const endPct = useMemo(() => {
    const c = isFlipped ? 7 - toCoord.col : toCoord.col;
    const r = isFlipped ? 7 - toCoord.row : toCoord.row;
    return {
      x: ((c + 0.5) / 8) * 100,
      y: ((r + 0.5) / 8) * 100,
    };
  }, [toCoord.col, toCoord.row, isFlipped]);

  // Secondary move percentage coordinates (for Castling)
  const secondaryCoords = useMemo(() => {
    if (!animation.secondaryMove) return null;
    const sFrom = animation.secondaryMove.fromCoord;
    const sTo = animation.secondaryMove.toCoord;
    const sFromC = isFlipped ? 7 - sFrom.col : sFrom.col;
    const sFromR = isFlipped ? 7 - sFrom.row : sFrom.row;
    const sToC = isFlipped ? 7 - sTo.col : sTo.col;
    const sToR = isFlipped ? 7 - sTo.row : sTo.row;
    return {
      start: { x: ((sFromC + 0.5) / 8) * 100, y: ((sFromR + 0.5) / 8) * 100 },
      end: { x: ((sToC + 0.5) / 8) * 100, y: ((sToR + 0.5) / 8) * 100 },
    };
  }, [animation.secondaryMove, isFlipped]);

  // Play flight whoosh on start
  useEffect(() => {
    soundEngine.playGlideWhoosh(Math.max(0.12, duration / 1000));
  }, [duration]);

  // Direct GPU-accelerated RAF animation loop without React state re-render thrash
  useEffect(() => {
    let lastSparkleTime = 0;
    const arcHeight = piece.type === 'n' ? 32 : piece.type === 'p' ? 10 : 7;
    const deltaX = endPct.x - startPct.x;
    const maxTilt = piece.type === 'n' ? (deltaX > 0 ? 10 : -10) : (deltaX > 0 ? 5 : -5);

    const animate = (timestamp: number) => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = timestamp;
      }
      const elapsed = timestamp - startTimestampRef.current;
      const rawProgress = Math.min(1, elapsed / duration);

      // Custom easing per piece:
      let eased = rawProgress;
      if (piece.type === 'n') {
        eased =
          rawProgress < 0.5
            ? 2 * rawProgress * rawProgress
            : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;
      } else if (piece.type === 'q' || piece.type === 'b') {
        eased = 1 - Math.pow(1 - rawProgress, 3); // easeOutCubic
      } else {
        eased = 1 - Math.pow(1 - rawProgress, 2); // easeOutQuad
      }

      // Compute primary coordinates and 3D arc
      const curX = startPct.x + (endPct.x - startPct.x) * eased;
      const curY = startPct.y + (endPct.y - startPct.y) * eased;
      const zOffset = -Math.sin(eased * Math.PI) * arcHeight;
      const currentTilt = Math.sin(eased * Math.PI) * maxTilt;
      const scale = 1 + Math.sin(eased * Math.PI) * 0.12;

      // Update primary element directly via DOM style
      if (primaryElRef.current) {
        primaryElRef.current.style.left = `${curX}%`;
        primaryElRef.current.style.top = `${curY}%`;
        primaryElRef.current.style.transform = `translate3d(-50%, -50%, 0) translate3d(0, ${zOffset}px, 0) rotate(${currentTilt}deg) scale(${scale})`;
      }

      // Update secondary piece for Castling if present
      if (secondaryCoords && secondaryElRef.current) {
        const secX = secondaryCoords.start.x + (secondaryCoords.end.x - secondaryCoords.start.x) * eased;
        const secY = secondaryCoords.start.y + (secondaryCoords.end.y - secondaryCoords.start.y) * eased;
        const secZ = -Math.sin(eased * Math.PI) * 8;
        secondaryElRef.current.style.left = `${secX}%`;
        secondaryElRef.current.style.top = `${secY}%`;
        secondaryElRef.current.style.transform = `translate3d(-50%, -50%, 0) translate3d(0, ${secZ}px, 0)`;
      }

      // Emit travel sparkles throttled to every 30ms
      if (timestamp - lastSparkleTime > 30 && rawProgress < 0.95) {
        lastSparkleTime = timestamp;
        particleRef.current?.emitTravelSparkle(curX, curY, piece.type, piece.color, theme);
      }

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (!hasLandedRef.current) {
          hasLandedRef.current = true;
          // Trigger landing audio and particle ripple
          soundEngine.playLanding(piece.type);
          particleRef.current?.emitLanding(endPct.x, endPct.y, piece.type, piece.color, theme);

          if (animation.isCapture) {
            particleRef.current?.emitCapture(
              endPct.x,
              endPct.y,
              move.captured!.color,
              theme,
              animation.isQueenCapture
            );
          }

          if (animation.isPromotion) {
            soundEngine.playPromotion();
            particleRef.current?.emitPromotionBurst(endPct.x, endPct.y, piece.color, theme);
          }

          if (animation.isBrilliant) {
            particleRef.current?.emitBrilliantBadge(endPct.x, endPct.y);
          }

          onCompleteRef.current();
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    duration,
    piece,
    startPct,
    endPct,
    secondaryCoords,
    animation,
    move,
    theme,
    particleRef,
  ]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
      {/* Primary Moving Piece */}
      <div
        ref={primaryElRef}
        className="absolute w-[12.5%] h-[12.5%] will-change-transform"
        style={{
          left: `${startPct.x}%`,
          top: `${startPct.y}%`,
          transform: 'translate3d(-50%, -50%, 0)',
        }}
      >
        <GemPiece
          type={animation.isPromotion && animation.promotionType ? animation.promotionType : piece.type}
          color={piece.color}
          theme={theme}
          isSelected={false}
        />
      </div>

      {/* Synchronized Secondary Moving Piece for Castling */}
      {animation.secondaryMove && secondaryCoords && (
        <div
          ref={secondaryElRef}
          className="absolute w-[12.5%] h-[12.5%] will-change-transform"
          style={{
            left: `${secondaryCoords.start.x}%`,
            top: `${secondaryCoords.start.y}%`,
            transform: 'translate3d(-50%, -50%, 0)',
          }}
        >
          <GemPiece
            type={animation.secondaryMove.piece.type}
            color={animation.secondaryMove.piece.color}
            theme={theme}
            isSelected={false}
          />
        </div>
      )}
    </div>
  );
};
