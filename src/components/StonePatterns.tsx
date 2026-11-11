import React from 'react';
import { ThemeId } from '../game/types';

export const StonePatterns: React.FC<{ themeId: ThemeId }> = ({ themeId }) => {
  return (
    <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
      <defs>
        {/* Soft Stone Noise / Crystal Filter */}
        <filter id="stone-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.8
                    0 0 0 0 0.75
                    0 0 0 0 0.65
                    0 0 0 0.08 0"
          />
        </filter>

        {/* ========================================================= */}
        {/* REALISTIC CALACATTA & CARRARA GOLD MARBLE VEINS (240x240) */}
        {/* Organic meandering faults, smoky halos, and gold veins   */}
        {/* ========================================================= */}
        <pattern id="marble-gold-veins" width="240" height="240" patternUnits="userSpaceOnUse">
          {/* Subtle natural stone clouding / smoky quartz bed */}
          <path
            d="M 10 30 C 50 10 90 40 140 25 C 190 10 220 50 235 90 C 250 130 210 170 170 185 C 130 200 90 180 50 205 C 10 230 -10 190 5 140 C 20 90 -30 50 10 30 Z"
            fill="rgba(195, 185, 170, 0.12)"
          />
          <path
            d="M 60 80 C 110 60 160 90 190 130 C 220 170 180 220 130 225 C 80 230 40 190 35 140 C 30 90 10 100 60 80 Z"
            fill="rgba(215, 205, 190, 0.18)"
          />

          {/* Broad soft smoky mineral halos (shadow of the deep vein fissures) */}
          <path
            d="M -10 50 Q 35 45 70 75 T 135 110 T 180 165 T 255 190"
            stroke="rgba(160, 150, 140, 0.25)"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 -10 Q 110 40 135 110 T 150 190 T 195 255"
            stroke="rgba(170, 160, 145, 0.22)"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 135 110 Q 90 135 50 170 T -5 210"
            stroke="rgba(160, 150, 135, 0.18)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />

          {/* Secondary Mineral Fractures (cool slate / soft taupe) */}
          <path
            d="M -10 50 C 20 48 45 60 70 75 C 95 90 115 95 135 110 C 155 125 170 145 180 165 C 190 185 220 185 255 190"
            stroke="rgba(140, 130, 120, 0.45)"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 -10 C 95 20 110 55 135 110 C 145 135 145 160 150 190 C 155 220 175 235 195 255"
            stroke="rgba(145, 135, 125, 0.4)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 135 110 C 115 120 95 135 70 155 C 45 175 20 195 -5 210"
            stroke="rgba(150, 140, 130, 0.35)"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />

          {/* Tertiary Feathering Capillaries & Micro-cracks */}
          <path
            d="M 70 75 C 65 65 50 60 40 50 M 70 75 C 75 85 90 95 95 110 M 135 110 C 140 95 150 85 165 80 M 135 110 C 130 125 110 135 105 150 M 180 165 C 175 180 160 190 155 205 M 180 165 C 195 160 210 155 225 150 M 150 190 C 160 185 175 180 185 175 M 150 190 C 140 200 130 215 125 230"
            stroke="rgba(165, 155, 140, 0.3)"
            strokeWidth="0.9"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 15 130 C 25 135 40 145 50 150 M 200 70 C 185 85 175 90 165 80 M 30 180 C 45 175 60 185 70 190"
            stroke="rgba(175, 165, 150, 0.25)"
            strokeWidth="0.75"
            fill="none"
          />

          {/* Master Golden Calacatta Seams (warm gold core with metallic sheen) */}
          <path
            d="M -10 50 C 20 48 45 60 70 75 C 95 90 115 95 135 110 C 155 125 170 145 180 165 C 190 185 220 185 255 190"
            stroke="#cfa845"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 80 -10 C 95 20 110 55 135 110 C 145 135 145 160 150 190 C 155 220 175 235 195 255"
            stroke="#d4af37"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 135 110 C 115 120 95 135 70 155 C 45 175 20 195 -5 210"
            stroke="#e0bc4e"
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Intricate Gold Vein Capillaries & Leaf Inclusions */}
          <path
            d="M 70 75 C 65 65 50 60 40 50 M 135 110 C 140 95 150 85 165 80 M 180 165 C 195 160 210 155 225 150 M 150 190 C 140 200 130 215 125 230"
            stroke="#f0cf65"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Prismatic Specular White Vein Highlight (light hitting crystal quartz vein wall) */}
          <path
            d="M -9 49 C 21 47 46 59 71 74 C 96 89 116 94 136 109 C 156 124 171 144 181 164 C 191 184 221 184 256 189"
            stroke="#ffffff"
            strokeWidth="0.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M 81 -9 C 96 21 111 56 136 111 C 146 136 146 161 151 191 C 156 221 176 236 196 256"
            stroke="#ffffff"
            strokeWidth="0.45"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Micro Pyrite crystals in the matrix */}
          <circle cx="72" cy="74" r="1.3" fill="#ffe07d" opacity="0.9" />
          <circle cx="136" cy="109" r="1.5" fill="#f5c842" opacity="0.95" />
          <circle cx="181" cy="164" r="1.2" fill="#ffe891" opacity="0.85" />
          <circle cx="42" cy="51" r="0.9" fill="#e5bb38" opacity="0.8" />
          <circle cx="164" cy="81" r="1.1" fill="#ffe07d" opacity="0.85" />
          <circle cx="126" cy="229" r="1" fill="#f5c842" opacity="0.8" />
        </pattern>

        {/* ========================================================= */}
        {/* DEEP MIDNIGHT OBSIDIAN WITH GOLD PYRITE DUST (200x200)   */}
        {/* Volcanic black glass with cosmic auroral swirls & flecks */}
        {/* ========================================================= */}
        <pattern id="obsidian-gold-flecks" width="200" height="200" patternUnits="userSpaceOnUse">
          {/* Internal chatoyant mineral flows */}
          <path
            d="M 0 40 Q 60 20 100 60 T 200 80 M 0 120 Q 50 160 120 130 T 200 170"
            stroke="rgba(147, 51, 234, 0.16)"
            strokeWidth="18"
            fill="none"
          />
          <path
            d="M 20 0 Q 60 80 40 140 T 100 200 M 130 0 Q 110 70 160 130 T 150 200"
            stroke="rgba(59, 130, 246, 0.14)"
            strokeWidth="14"
            fill="none"
          />

          {/* Delicate metallic fracture streams */}
          <path
            d="M 0 95 C 40 85 75 110 115 90 C 155 70 180 95 200 105"
            stroke="rgba(251, 191, 36, 0.45)"
            strokeWidth="1.2"
            fill="none"
            strokeDasharray="4 2 8 3"
          />
          <path
            d="M 70 0 C 85 45 60 90 85 140 C 95 160 120 185 130 200"
            stroke="rgba(245, 158, 11, 0.35)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="5 3 2 4"
          />

          {/* Golden Pyrite Crystal Cluster Specks */}
          <circle cx="28" cy="35" r="1.4" fill="#fef08a" opacity="0.9" />
          <circle cx="31" cy="38" r="0.8" fill="#f59e0b" opacity="0.8" />
          <circle cx="112" cy="45" r="1.6" fill="#fbbf24" opacity="0.95" />
          <circle cx="115" cy="48" r="0.9" fill="#fef08a" opacity="0.75" />
          <circle cx="165" cy="115" r="1.5" fill="#fde047" opacity="0.9" />
          <circle cx="75" cy="145" r="1.8" fill="#f59e0b" opacity="0.85" />
          <circle cx="72" cy="142" r="1" fill="#ffffff" opacity="0.95" />
          <circle cx="145" cy="175" r="1.3" fill="#fef08a" opacity="0.85" />
          <circle cx="185" cy="55" r="1.2" fill="#f59e0b" opacity="0.7" />
          <circle cx="45" cy="180" r="1.4" fill="#fbbf24" opacity="0.8" />
        </pattern>

        {/* ========================================================= */}
        {/* VERDANT COLOMBIAN MALACHITE & JADE RINGS (200x200)        */}
        {/* ========================================================= */}
        <pattern id="malachite-waves" width="200" height="200" patternUnits="userSpaceOnUse">
          <ellipse cx="60" cy="70" rx="90" ry="60" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="8" fill="none" />
          <ellipse cx="60" cy="70" rx="70" ry="45" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="6" fill="none" />
          <ellipse cx="60" cy="70" rx="50" ry="30" stroke="rgba(5, 150, 105, 0.35)" strokeWidth="4" fill="none" />
          <ellipse cx="60" cy="70" rx="30" ry="18" stroke="rgba(110, 231, 183, 0.4)" strokeWidth="2.5" fill="none" />
          <ellipse cx="60" cy="70" rx="14" ry="8" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />

          <ellipse cx="170" cy="160" rx="80" ry="50" stroke="rgba(16, 185, 129, 0.22)" strokeWidth="7" fill="none" />
          <ellipse cx="170" cy="160" rx="55" ry="32" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="5" fill="none" />
          <ellipse cx="170" cy="160" rx="35" ry="20" stroke="rgba(110, 231, 183, 0.35)" strokeWidth="3" fill="none" />
        </pattern>

        {/* ========================================================= */}
        {/* CELESTIAL ROYAL SODALITE & AGATE (200x200)                */}
        {/* ========================================================= */}
        <pattern id="sodalite-bands" width="200" height="200" patternUnits="userSpaceOnUse">
          <path
            d="M 0 30 Q 70 80 120 40 T 200 90 M 0 130 Q 80 90 140 160 T 200 140"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="10"
            fill="none"
          />
          <path
            d="M 0 30 Q 70 80 120 40 T 200 90"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M 0 130 Q 80 90 140 160 T 200 140"
            stroke="rgba(125, 211, 252, 0.5)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="85" cy="55" r="1.4" fill="#fcd34d" opacity="0.85" />
          <circle cx="155" cy="145" r="1.6" fill="#fef08a" opacity="0.9" />
          <circle cx="35" cy="170" r="1.2" fill="#38bdf8" opacity="0.8" />
        </pattern>
      </defs>
    </svg>
  );
};
