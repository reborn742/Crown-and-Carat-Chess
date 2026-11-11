import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AnimationIntensity, PieceColor, PieceType, Position, ThemeConfig } from '../game/types';

export interface ParticleSystemHandle {
  emitCapture: (xPct: number, yPct: number, color: PieceColor, theme: ThemeConfig, isQueen?: boolean) => void;
  emitTravelSparkle: (xPct: number, yPct: number, pieceType: PieceType, color: PieceColor, theme: ThemeConfig) => void;
  emitLanding: (xPct: number, yPct: number, pieceType: PieceType, color: PieceColor, theme: ThemeConfig) => void;
  emitCastlingThread: (x1Pct: number, y1Pct: number, x2Pct: number, y2Pct: number, theme: ThemeConfig) => void;
  emitPromotionBurst: (xPct: number, yPct: number, color: PieceColor, theme: ThemeConfig) => void;
  emitBoardWake: () => void;
  emitCheckPulse: (xPct: number, yPct: number) => void;
  emitBrilliantBadge: (xPct: number, yPct: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'shard' | 'spark' | 'diamond' | 'orb' | 'star';
  bounceCount?: number;
  targetX?: number; // For shards flying to tray
  targetY?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  lineWidth: number;
  isSweep?: boolean; // Queen capture board sweep
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ThreadBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingBadge {
  x: number;
  y: number;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
}

interface Props {
  intensity: AnimationIntensity;
}

export const ParticleSystem = forwardRef<ParticleSystemHandle, Props>(({ intensity }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const threadsRef = useRef<ThreadBeam[]>([]);
  const badgesRef = useRef<FloatingBadge[]>([]);
  const wakeLoopRef = useRef<() => void>(() => {});

  // Scale particle counts by intensity and screen size
  const getScaleMultiplier = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const base = isMobile ? 0.5 : 1.0;
    if (intensity === 'minimal') return base * 0.35;
    if (intensity === 'normal') return base * 0.8;
    return base * 1.25; // epic
  };

  useImperativeHandle(ref, () => ({
    emitCapture(xPct, yPct, color, theme, isQueen = false) {
      if (intensity === 'minimal') return;
      wakeLoopRef.current();
      const palette = color === 'w' ? theme.lightPieceColors : theme.darkPieceColors;
      const colors = [
        palette.baseStart,
        palette.facetHighlight,
        palette.coreGlow,
        palette.refraction,
        '#ffffff',
      ];

      const mult = getScaleMultiplier();
      const count = Math.round((isQueen ? 48 : 26) * mult);

      // Shockwave ring
      shockwavesRef.current.push({
        x: xPct,
        y: yPct,
        radius: 4,
        maxRadius: isQueen ? 220 : 80,
        color: palette.coreGlow,
        alpha: 0.9,
        life: 0,
        maxLife: isQueen ? 45 : 25,
        lineWidth: isQueen ? 6 : 3,
        isSweep: isQueen,
      });

      // Gem Shards
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (isQueen ? 3 : 2) + Math.random() * (isQueen ? 7 : 5);
        const shapes: ('shard' | 'spark' | 'diamond')[] = ['shard', 'spark', 'diamond'];

        // 15% of shards fly toward player tray
        const flyToTray = Math.random() < 0.15;
        const targetY = color === 'w' ? 102 : -2;
        const targetX = 50 + (Math.random() - 0.5) * 60;

        particlesRef.current.push({
          x: xPct,
          y: yPct,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (flyToTray ? 3 : 1.5),
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
          size: 3 + Math.random() * (isQueen ? 10 : 7),
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: flyToTray ? 55 : (35 + Math.random() * 25),
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          bounceCount: 0,
          targetX: flyToTray ? targetX : undefined,
          targetY: flyToTray ? targetY : undefined,
        });
      }
    },

    emitTravelSparkle(xPct, yPct, pieceType, color, theme) {
      if (intensity === 'minimal') return;
      wakeLoopRef.current();
      const palette = color === 'w' ? theme.lightPieceColors : theme.darkPieceColors;

      // Color trail based on piece type
      let colorSample = palette.facetHighlight;
      if (pieceType === 'b') {
        // Rainbow sparkle for Bishop
        const rainbow = ['#38bdf8', '#67e8f9', '#f472b6', '#c084fc', '#fbbf24'];
        colorSample = rainbow[Math.floor(Math.random() * rainbow.length)];
      } else if (pieceType === 'q') {
        // Crown sparkle for Queen
        colorSample = Math.random() > 0.5 ? '#fde047' : palette.coreGlow;
      } else if (pieceType === 'k') {
        colorSample = '#ffd700';
      }

      particlesRef.current.push({
        x: xPct + (Math.random() - 0.5) * 3,
        y: yPct + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8 - 0.4,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        size: 2 + Math.random() * 4,
        color: colorSample,
        alpha: 0.9,
        life: 0,
        maxLife: 15 + Math.random() * 10,
        shape: pieceType === 'q' ? 'star' : 'spark',
      });
    },

    emitLanding(xPct, yPct, pieceType, color, theme) {
      if (intensity === 'minimal') return;
      wakeLoopRef.current();
      const palette = color === 'w' ? theme.lightPieceColors : theme.darkPieceColors;

      // Ground ripple
      ripplesRef.current.push({
        x: xPct,
        y: yPct,
        radius: 4,
        maxRadius: pieceType === 'k' || pieceType === 'q' ? 40 : 25,
        color: pieceType === 'k' ? '#ffd700' : palette.coreGlow,
        alpha: 0.8,
        life: 0,
        maxLife: 16,
      });

      // Tiny pop sparks
      const count = pieceType === 'n' || pieceType === 'r' ? 8 : 5;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.2;
        particlesRef.current.push({
          x: xPct,
          y: yPct,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.6,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          size: 2 + Math.random() * 3,
          color: palette.facetHighlight,
          alpha: 1,
          life: 0,
          maxLife: 14 + Math.random() * 8,
          shape: 'spark',
        });
      }
    },

    emitCastlingThread(x1Pct, y1Pct, x2Pct, y2Pct, theme) {
      wakeLoopRef.current();
      threadsRef.current.push({
        x1: x1Pct,
        y1: y1Pct,
        x2: x2Pct,
        y2: y2Pct,
        color: '#ffd700',
        alpha: 1.0,
        life: 0,
        maxLife: 28,
      });
    },

    emitPromotionBurst(xPct, yPct, color, theme) {
      wakeLoopRef.current();
      const palette = color === 'w' ? theme.lightPieceColors : theme.darkPieceColors;
      const rainbow = ['#ffd700', '#67e8f9', '#f472b6', '#38bdf8', '#ffffff'];

      // Rising spiral burst
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 4;
        const speed = 1.5 + Math.random() * 3.0;
        particlesRef.current.push({
          x: xPct,
          y: yPct,
          vx: Math.cos(angle) * speed,
          vy: -2 - Math.random() * 3.5,
          rot: Math.random() * Math.PI * 2,
          vRot: 0.2,
          size: 2.5 + Math.random() * 4,
          color: rainbow[i % rainbow.length],
          alpha: 1,
          life: 0,
          maxLife: 30 + Math.random() * 15,
          shape: 'star',
        });
      }

      shockwavesRef.current.push({
        x: xPct,
        y: yPct,
        radius: 5,
        maxRadius: 60,
        color: palette.coreGlow,
        alpha: 0.9,
        life: 0,
        maxLife: 24,
        lineWidth: 3.5,
      });
    },

    emitBoardWake() {
      wakeLoopRef.current();
      shockwavesRef.current.push({
        x: 50,
        y: 50,
        radius: 10,
        maxRadius: 240,
        color: '#ffd700',
        alpha: 0.75,
        life: 0,
        maxLife: 35,
        lineWidth: 4,
        isSweep: true,
      });
    },

    emitCheckPulse(xPct, yPct) {
      wakeLoopRef.current();
      shockwavesRef.current.push({
        x: xPct,
        y: yPct,
        radius: 8,
        maxRadius: 50,
        color: '#ef4444',
        alpha: 0.9,
        life: 0,
        maxLife: 22,
        lineWidth: 3,
      });
    },

    emitBrilliantBadge(xPct, yPct) {
      wakeLoopRef.current();
      badgesRef.current.push({
        x: xPct,
        y: yPct,
        alpha: 1,
        scale: 0.3,
        life: 0,
        maxLife: 55,
      });
    },
  }));

  // 60FPS RAF Render Loop (sleeps automatically when zero particles active)
  useEffect(() => {
    let animId: number | null = null;
    let isRunning = false;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        isRunning = false;
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isRunning = false;
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      const hasEntities =
        threadsRef.current.length > 0 ||
        shockwavesRef.current.length > 0 ||
        ripplesRef.current.length > 0 ||
        particlesRef.current.length > 0 ||
        badgesRef.current.length > 0;

      if (!hasEntities) {
        ctx.clearRect(0, 0, w, h);
        isRunning = false;
        animId = null;
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Castling Beam Threads
      for (let i = threadsRef.current.length - 1; i >= 0; i--) {
        const th = threadsRef.current[i];
        th.life++;
        th.alpha = Math.max(0, 1 - th.life / th.maxLife);
        if (th.life >= th.maxLife) {
          threadsRef.current.splice(i, 1);
          continue;
        }

        const px1 = (th.x1 / 100) * w;
        const py1 = (th.y1 / 100) * h;
        const px2 = (th.x2 / 100) * w;
        const py2 = (th.y2 / 100) * h;

        ctx.save();
        ctx.strokeStyle = th.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = th.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = th.color;

        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.quadraticCurveTo((px1 + px2) / 2, (py1 + py2) / 2 - 25, px2, py2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw Stone Ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rip = ripplesRef.current[i];
        rip.life++;
        rip.radius += (rip.maxRadius - rip.radius) * 0.12;
        rip.alpha = Math.max(0, 1 - rip.life / rip.maxLife);

        if (rip.life >= rip.maxLife) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        const px = (rip.x / 100) * w;
        const py = (rip.y / 100) * h;

        ctx.save();
        ctx.strokeStyle = rip.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = rip.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = rip.color;
        ctx.beginPath();
        ctx.arc(px, py, rip.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw Shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.life++;
        sw.radius += (sw.maxRadius - sw.radius) * (sw.isSweep ? 0.08 : 0.15);
        sw.alpha = Math.max(0, 1 - sw.life / sw.maxLife);

        if (sw.life >= sw.maxLife) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        const px = (sw.x / 100) * w;
        const py = (sw.y / 100) * h;

        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth * (1 - sw.life / sw.maxLife);
        ctx.globalAlpha = sw.alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = sw.color;
        ctx.beginPath();
        ctx.arc(px, py, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw Particles (shards, sparks, stars)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        // Target attraction for flying tray shards
        if (p.targetX !== undefined && p.targetY !== undefined) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.vx += dx * 0.003;
          p.vy += dy * 0.003;
        }

        p.x += p.vx * (100 / w);
        p.y += p.vy * (100 / h);
        p.vy += 0.12; // gravity
        p.rot += p.vRot;

        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.65, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.65, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'shard') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.3);
          ctx.lineTo(p.size * 0.55, p.size * 0.7);
          ctx.lineTo(-p.size * 0.35, p.size * 0.5);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(p.size, 0);
          ctx.moveTo(0, -p.size);
          ctx.lineTo(0, p.size);
          ctx.stroke();
        } else {
          // Spark / orb
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1, p.size * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 5. Draw Brilliant Move Badges
      for (let i = badgesRef.current.length - 1; i >= 0; i--) {
        const b = badgesRef.current[i];
        b.life++;
        b.scale += (1 - b.scale) * 0.15;
        if (b.life > b.maxLife * 0.6) {
          b.alpha = Math.max(0, 1 - (b.life - b.maxLife * 0.6) / (b.maxLife * 0.4));
        }

        if (b.life >= b.maxLife) {
          badgesRef.current.splice(i, 1);
          continue;
        }

        const px = (b.x / 100) * w;
        const py = (b.y / 100) * h - (b.life * 0.4);

        ctx.save();
        ctx.translate(px, py);
        ctx.scale(b.scale, b.scale);
        ctx.globalAlpha = b.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#fbbf24';

        // Little brilliant jewel badge
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    const wakeLoop = () => {
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(render);
      }
    };
    wakeLoopRef.current = wakeLoop;

    return () => {
      if (animId) cancelAnimationFrame(animId);
      wakeLoopRef.current = () => {};
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={700}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
});

ParticleSystem.displayName = 'ParticleSystem';
