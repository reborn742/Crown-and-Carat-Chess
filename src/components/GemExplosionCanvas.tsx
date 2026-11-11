import React, { useEffect, useRef } from 'react';
import { PieceColor, ThemeConfig } from '../game/types';

export interface ParticleEffectTrigger {
  id: string;
  x: number; // percentage 0-100 across board
  y: number; // percentage 0-100 across board
  color: PieceColor;
  theme: ThemeConfig;
}

interface Shard {
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
  shape: 'shard' | 'spark' | 'diamond';
}

interface Props {
  effects: ParticleEffectTrigger[];
  onComplete: (id: string) => void;
}

export const GemExplosionCanvas: React.FC<Props> = ({ effects, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shardsRef = useRef<Map<string, Shard[]>>(new Map());

  // Spawn shards when a new effect arrives
  useEffect(() => {
    effects.forEach(eff => {
      if (!shardsRef.current.has(eff.id)) {
        const palette = eff.color === 'w' ? eff.theme.lightPieceColors : eff.theme.darkPieceColors;
        const colors = [
          palette.baseStart,
          palette.facetHighlight,
          palette.coreGlow,
          palette.refraction,
          '#ffffff',
        ];

        const shards: Shard[] = [];
        const count = 36;

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.8 + Math.random() * 4.5;
          const shapes: ('shard' | 'spark' | 'diamond')[] = ['shard', 'spark', 'diamond'];

          shards.push({
            x: eff.x,
            y: eff.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5, // slight upward burst
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.25,
            size: 4 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            life: 0,
            maxLife: 45 + Math.random() * 25,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }

        shardsRef.current.set(eff.id, shards);
      }
    });
  }, [effects]);

  // Animation frame loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      shardsRef.current.forEach((shards, id) => {
        let aliveCount = 0;

        shards.forEach(s => {
          s.life++;
          if (s.life < s.maxLife) {
            aliveCount++;
            s.x += s.vx * (100 / w);
            s.y += s.vy * (100 / h);
            s.vy += 0.08; // gravity
            s.rot += s.vRot;
            s.alpha = Math.max(0, 1 - s.life / s.maxLife);

            // Draw shard
            const px = (s.x / 100) * w;
            const py = (s.y / 100) * h;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(s.rot);
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = s.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = s.color;

            if (s.shape === 'diamond') {
              ctx.beginPath();
              ctx.moveTo(0, -s.size);
              ctx.lineTo(s.size * 0.6, 0);
              ctx.lineTo(0, s.size);
              ctx.lineTo(-s.size * 0.6, 0);
              ctx.closePath();
              ctx.fill();
            } else if (s.shape === 'shard') {
              ctx.beginPath();
              ctx.moveTo(0, -s.size * 1.2);
              ctx.lineTo(s.size * 0.5, s.size * 0.7);
              ctx.lineTo(-s.size * 0.3, s.size * 0.5);
              ctx.closePath();
              ctx.fill();
            } else {
              // Spark
              ctx.strokeStyle = s.color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(-s.size, 0);
              ctx.lineTo(s.size, 0);
              ctx.moveTo(0, -s.size);
              ctx.lineTo(0, s.size);
              ctx.stroke();
            }

            ctx.restore();
          }
        });

        if (aliveCount === 0) {
          shardsRef.current.delete(id);
          onComplete(id);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
};
