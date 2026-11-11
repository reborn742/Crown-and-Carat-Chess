import React from 'react';
import { PieceColor, PieceType, ThemeConfig } from '../game/types';

interface GemPieceProps {
  type: PieceType;
  color: PieceColor;
  theme: ThemeConfig;
  isSelected?: boolean;
  isCheck?: boolean;
  className?: string;
}

const GemPieceComponent: React.FC<GemPieceProps> = ({
  type,
  color,
  theme,
  isSelected = false,
  isCheck = false,
  className = '',
}) => {
  const isLight = color === 'w';
  const palette = isLight ? theme.lightPieceColors : theme.darkPieceColors;
  const uniquePrefix = `gem-${theme.id}-${color}-${type}`;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-200 select-none ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      } ${className}`}
    >
      {/* 3D Drop shadow under piece */}
      <div
        className="absolute bottom-1 w-3/4 h-2.5 rounded-full blur-[3.5px] opacity-70 pointer-events-none"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 70%)'
            : 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/* Selected glowing aura */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-full blur-md animate-pulse pointer-events-none"
          style={{
            background: isLight
              ? 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(103,232,249,0.5) 60%, transparent 80%)'
              : `radial-gradient(circle, ${palette.coreGlow} 0%, ${palette.refraction} 60%, transparent 80%)`,
          }}
        />
      )}

      {/* King in Check pulsing danger aura */}
      {isCheck && type === 'k' && (
        <div className="absolute inset-0 rounded-full blur-lg animate-ping opacity-80 bg-red-600 pointer-events-none" />
      )}

      <svg
        viewBox="0 0 100 100"
        className="w-[92%] h-[92%] drop-shadow-[0_5px_8px_rgba(0,0,0,0.6)] overflow-visible"
      >
        <defs>
          {/* Main gem gradient */}
          <linearGradient id={`${uniquePrefix}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.baseStart} />
            <stop offset="45%" stopColor={palette.coreGlow} />
            <stop offset="100%" stopColor={palette.baseEnd} />
          </linearGradient>

          {/* Facet Light Gradient */}
          <linearGradient id={`${uniquePrefix}-facet-light`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={palette.facetHighlight} stopOpacity="0.95" />
            <stop offset="60%" stopColor={palette.baseStart} stopOpacity="0.75" />
            <stop offset="100%" stopColor={palette.coreGlow} stopOpacity="0.5" />
          </linearGradient>

          {/* Facet Shadow Gradient */}
          <linearGradient id={`${uniquePrefix}-facet-dark`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.facetShadow} stopOpacity="0.85" />
            <stop offset="60%" stopColor={palette.baseEnd} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#05020a" stopOpacity="0.8" />
          </linearGradient>

          {/* Prismatic Rainbow Refraction & Chromatic Dispersion */}
          <linearGradient id={`${uniquePrefix}-dispersion`} x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="25%" stopColor="#67e8f9" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#f472b6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.7" />
          </linearGradient>

          {/* Warm Fire Refraction */}
          <linearGradient id={`${uniquePrefix}-refraction`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={palette.refraction} stopOpacity="0.6" />
            <stop offset="50%" stopColor={palette.facetHighlight} stopOpacity="0.85" />
            <stop offset="100%" stopColor={palette.coreGlow} stopOpacity="0.5" />
          </linearGradient>

          {/* Specular White Glint */}
          <linearGradient id={`${uniquePrefix}-glint`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          {/* Pedestal metallic gold trim */}
          <linearGradient id={`${uniquePrefix}-metal`} x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Platinum metallic trim */}
          <linearGradient id={`${uniquePrefix}-platinum`} x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* KING: Elaborate 5-Arched Crown with Stepped Facets & Cross     */}
        {/* ============================================================== */}
        {type === 'k' && (
          <g>
            {/* Multi-tiered Pedestal */}
            <path
              d="M 18 87 L 82 87 L 77 93 L 23 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 22 81 L 78 81 L 82 87 L 18 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 25 76 L 75 76 L 78 81 L 22 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* Inlaid Pedestal Gems */}
            <circle cx="32" cy="84" r="1.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.5" />
            <circle cx="50" cy="84" r="2.2" fill={palette.coreGlow} stroke={palette.stroke} strokeWidth="0.5" />
            <circle cx="68" cy="84" r="1.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.5" />

            {/* Royal Crown Silhouette */}
            <path
              d="M 25 76 L 16 43 L 34 57 L 50 28 L 66 57 L 84 43 L 75 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Individual Facets: Crown Center Peak */}
            <polygon points="50,28 34,57 50,65" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="50,28 66,57 50,65" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.5" />
            <polygon points="50,28 44,48 50,56 56,48" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.8" />

            {/* Crown Flank Peaks (Left & Right) */}
            <polygon points="16,43 34,57 25,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="16,43 28,52 23,65" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />
            <polygon points="84,43 66,57 75,76" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="84,43 72,52 77,65" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.5" />

            {/* Crown Base Facet Grid */}
            <polygon points="34,57 50,65 50,76 25,76" fill={`url(#${uniquePrefix}-refraction)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="66,57 50,65 50,76 75,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />

            {/* Crown Center Oval Cabochon & Setting */}
            <ellipse cx="50" cy="65" rx="7" ry="5.5" fill={`url(#${uniquePrefix}-dispersion)`} stroke={palette.stroke} strokeWidth="0.8" />
            <ellipse cx="48.5" cy="63.5" rx="3.5" ry="2" fill="#ffffff" opacity="0.85" />

            {/* Maltese Imperial Cross Finial */}
            <path
              d="M 48 10 H 52 V 28 H 48 Z M 41 16 H 59 V 20 H 41 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            {/* Center Diamond on Cross */}
            <polygon points="50,15 53,18 50,21 47,18" fill="#ffffff" stroke={palette.stroke} strokeWidth="0.5" />

            {/* Jewels on Crown Peaks */}
            <circle cx="16" cy="43" r="3.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />
            <circle cx="15" cy="41.5" r="1.3" fill="#ffffff" />
            <circle cx="50" cy="28" r="4.8" fill={`url(#${uniquePrefix}-dispersion)`} stroke={palette.stroke} strokeWidth="0.8" />
            <circle cx="48.5" cy="26" r="1.6" fill="#ffffff" />
            <circle cx="84" cy="43" r="3.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />
            <circle cx="83" cy="41.5" r="1.3" fill="#ffffff" />

            {/* Brilliant cut glint sparkle */}
            <path d="M 50 12 L 51 15 L 54 15 L 51.5 17 L 52.5 20 L 50 18 L 47.5 20 L 48.5 17 L 46 15 L 49 15 Z" fill="#ffffff" opacity="0.9" />
          </g>
        )}

        {/* ============================================================== */}
        {/* QUEEN: Jeweled Coronet with 7 Faceted Spires & Teardrop Gems  */}
        {/* ============================================================== */}
        {type === 'q' && (
          <g>
            {/* Pedestal */}
            <path
              d="M 20 87 L 80 87 L 75 93 L 25 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 24 81 L 76 81 L 80 87 L 20 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 26 76 L 74 76 L 76 81 L 24 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* 7-Point Coronet Body */}
            <path
              d="M 26 76 L 15 39 L 30 54 L 38 31 L 50 49 L 62 31 L 70 54 L 85 39 L 74 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Faceted Spire Triangles */}
            <polygon points="15,39 30,54 26,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="15,39 24,48 20,62" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />

            <polygon points="30,54 38,31 44,61" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="38,31 50,49 44,61" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="38,31 44,45 35,47" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.8" />

            <polygon points="50,49 62,31 56,61" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="62,31 70,54 56,61" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="62,31 56,45 65,47" fill={`url(#${uniquePrefix}-refraction)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.8" />

            <polygon points="70,54 85,39 74,76" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="85,39 76,48 80,62" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.5" />

            {/* Center Basin Facets & Rainbow Dispersion Arc */}
            <polygon points="44,61 56,61 50,76" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.8" />
            <polygon points="30,54 44,61 50,76 26,76" fill={`url(#${uniquePrefix}-refraction)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="70,54 56,61 50,76 74,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />

            {/* Pearls / Briolette Gems on Tips */}
            <circle cx="15" cy="37" r="3.4" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />
            <circle cx="38" cy="29" r="3.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />
            <circle cx="50" cy="18" r="5.6" fill={`url(#${uniquePrefix}-dispersion)`} stroke={palette.stroke} strokeWidth="0.9" />
            <circle cx="48.5" cy="16" r="1.8" fill="#ffffff" />
            <circle cx="62" cy="29" r="3.8" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />
            <circle cx="85" cy="37" r="3.4" fill={palette.facetHighlight} stroke={palette.stroke} strokeWidth="0.6" />

            {/* Center Jewel Cluster on Band */}
            <polygon points="50,62 55,67 50,72 45,67" fill="#ffffff" stroke={palette.stroke} strokeWidth="0.6" />
          </g>
        )}

        {/* ============================================================== */}
        {/* BISHOP: Cathedral Mitre with Cleft Slash & Inner Gem Core     */}
        {/* ============================================================== */}
        {type === 'b' && (
          <g>
            {/* Pedestal */}
            <path
              d="M 24 87 L 76 87 L 71 93 L 29 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 28 81 L 72 81 L 76 87 L 24 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 31 76 L 69 76 L 72 81 L 28 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* Mitre Teardrop Shell */}
            <path
              d="M 31 76 C 22 62 22 43 42 24 C 46 19 50 14 50 14 C 50 14 54 19 58 24 C 78 43 78 62 69 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Faceted Cuts along Mitre Contour */}
            <path
              d="M 50 20 C 40 34 32 50 33 76 L 50 76 Z"
              fill={`url(#${uniquePrefix}-facet-light)`}
              stroke="#ffffff"
              strokeWidth="0.4"
              strokeOpacity="0.65"
            />
            <path
              d="M 50 20 C 60 34 68 50 67 76 L 50 76 Z"
              fill={`url(#${uniquePrefix}-facet-dark)`}
              stroke="#ffffff"
              strokeWidth="0.4"
              strokeOpacity="0.65"
            />

            {/* Outer Flank Facets */}
            <polygon points="50,20 33,48 42,65 50,76" fill={`url(#${uniquePrefix}-dispersion)`} opacity="0.6" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />
            <polygon points="50,20 67,48 58,65 50,76" fill={`url(#${uniquePrefix}-refraction)`} opacity="0.5" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />

            {/* Diagonal Slash cut revealing glowing inner gem core */}
            <path
              d="M 42 36 L 59 47"
              stroke={palette.stroke}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 43 37 L 58 46"
              stroke={`url(#${uniquePrefix}-dispersion)`}
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Bishop Finial Cabochon */}
            <circle cx="50" cy="12" r="4.5" fill={`url(#${uniquePrefix}-dispersion)`} stroke={palette.stroke} strokeWidth="0.8" />
            <circle cx="48.5" cy="10.5" r="1.5" fill="#ffffff" />

            {/* Center facet vertical cut line */}
            <line x1="50" y1="20" x2="50" y2="76" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
          </g>
        )}

        {/* ============================================================== */}
        {/* KNIGHT: Sculptural Faceted Horse Head with Geometric Mane     */}
        {/* ============================================================== */}
        {type === 'n' && (
          <g>
            {/* Pedestal */}
            <path
              d="M 21 87 L 79 87 L 74 93 L 26 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 25 81 L 75 81 L 79 87 L 21 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 28 76 L 72 76 L 75 81 L 25 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* Knight Silhouette Body */}
            <path
              d="M 31 76 C 29 68 27 60 32 52 C 35 47 31 42 25 38 C 21 35 19 40 17 40 C 15 40 15 32 24 26 C 31 21 43 20 51 22 C 53 16 55 14 57 14 C 59 14 59 19 60 22 C 69 25 74 33 76 46 C 78 56 74 68 71 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Stepped Geometric Mane Facets */}
            <polygon points="57,14 65,24 51,22" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="65,24 72,36 60,33" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.8" />
            <polygon points="72,36 76,50 64,48" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="76,50 74,68 65,62" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="74,68 71,76 60,72" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />

            {/* Cheek & Jaw Facets */}
            <polygon points="36,32 48,28 44,44 31,44" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.75" />
            <polygon points="44,44 58,40 54,58 39,60" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.8" />
            <polygon points="39,60 54,58 58,72 35,74" fill={`url(#${uniquePrefix}-refraction)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="31,44 39,60 35,74 31,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />

            {/* Muzzle Facets */}
            <polygon points="24,26 36,32 31,44 21,35" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />
            <polygon points="21,35 31,44 25,38 17,40" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.6" />

            {/* Marquise-Cut Eye Gem */}
            <path
              d="M 35 33 Q 38 31 41 33 Q 38 36 35 33 Z"
              fill="#ffffff"
              stroke={palette.stroke}
              strokeWidth="0.6"
            />
            <circle cx="38" cy="33" r="1.1" fill={palette.coreGlow} />
          </g>
        )}

        {/* ============================================================== */}
        {/* ROOK: Fortress Keep with Beveled Crenellations & Window        */}
        {/* ============================================================== */}
        {type === 'r' && (
          <g>
            {/* Pedestal */}
            <path
              d="M 20 87 L 80 87 L 75 93 L 25 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 24 81 L 76 81 L 80 87 L 20 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 27 76 L 73 76 L 76 81 L 24 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* Tower Pillar Silhouette */}
            <path
              d="M 30 76 L 33 42 L 67 42 L 70 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Tower Wall Bevel Facets */}
            <polygon points="30,76 33,42 42,42 40,76" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="42,42 58,42 57,76 40,76" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.8" />
            <polygon points="58,42 67,42 70,76 57,76" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />

            {/* Castle Battlement / Parapet */}
            <path
              d="M 23 42 L 23 22 L 33 22 L 33 30 L 44 30 L 44 22 L 56 22 L 56 30 L 67 30 L 67 22 L 77 22 L 77 42 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Parapet Crenellation Facets */}
            <rect x="25" y="24" width="7" height="16" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />
            <rect x="46" y="24" width="8" height="16" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.8" />
            <rect x="68" y="24" width="7" height="16" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.7" />

            {/* Corbel Trim Band */}
            <path d="M 23 42 L 77 42 L 75 45 L 25 45 Z" fill={palette.stroke} />

            {/* Arched Jewel Core Window */}
            <path
              d="M 46 54 C 46 50 54 50 54 54 L 54 66 L 46 66 Z"
              fill={`url(#${uniquePrefix}-dispersion)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            {/* Window Cross Glint */}
            <line x1="50" y1="51" x2="50" y2="66" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.9" />
            <line x1="46" y1="58" x2="54" y2="58" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.9" />
          </g>
        )}

        {/* ============================================================== */}
        {/* PAWN: Rose-Cut Faceted Orb with Concentric Crystal Facets     */}
        {/* ============================================================== */}
        {type === 'p' && (
          <g>
            {/* Pedestal Base */}
            <path
              d="M 26 87 L 74 87 L 70 93 L 30 93 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 30 81 L 70 81 L 74 87 L 26 87 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />
            <path
              d="M 33 76 L 67 76 L 70 81 L 30 81 Z"
              fill={theme.id === 'emerald-pearl' ? `url(#${uniquePrefix}-platinum)` : `url(#${uniquePrefix}-metal)`}
              stroke={palette.stroke}
              strokeWidth="0.8"
            />

            {/* Pedestal Stem with Facet Splines */}
            <path
              d="M 37 76 C 35 64 42 52 42 48 L 58 48 C 58 52 65 64 63 76 Z"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />
            <path d="M 37 76 C 35 64 42 52 42 48 L 50 48 L 50 76 Z" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.5" />
            <path d="M 50 48 L 58 48 C 58 52 65 64 63 76 L 50 76 Z" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.6" />

            {/* Collar Beaded Ring */}
            <ellipse cx="50" cy="48" rx="13" ry="3.8" fill={palette.stroke} />
            <ellipse cx="50" cy="48" rx="11" ry="2.6" fill={`url(#${uniquePrefix}-dispersion)`} />

            {/* Rose-Cut Geodesic Gem Orb */}
            <circle
              cx="50"
              cy="31"
              r="17"
              fill={`url(#${uniquePrefix}-base)`}
              stroke={palette.stroke}
              strokeWidth="1.2"
            />

            {/* Concentric Facet Geometry (Table, Kites, Triangles) */}
            {/* Center Table Facet */}
            <polygon
              points="50,21 58,26 58,36 50,41 42,36 42,26"
              fill={`url(#${uniquePrefix}-dispersion)`}
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeOpacity="0.85"
            />

            {/* Upper Star Facets */}
            <polygon points="50,14 50,21 42,26 37,19" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.75" />
            <polygon points="50,14 58,26 50,21" fill={`url(#${uniquePrefix}-glint)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.9" />
            <polygon points="50,14 63,19 58,26" fill={`url(#${uniquePrefix}-facet-light)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.75" />

            {/* Lateral Kite Facets */}
            <polygon points="37,19 42,26 42,36 33,31" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="63,19 67,31 58,36 58,26" fill={`url(#${uniquePrefix}-refraction)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />

            {/* Lower Pavilion Facets */}
            <polygon points="42,36 50,41 46,47 37,43" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />
            <polygon points="50,41 58,36 63,43 54,47" fill={`url(#${uniquePrefix}-dispersion)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.7" />
            <polygon points="50,41 54,47 46,47" fill={`url(#${uniquePrefix}-facet-dark)`} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.6" />

            {/* Brilliant Specular Light Glint */}
            <ellipse cx="44" cy="24" rx="3.5" ry="1.8" fill="#ffffff" opacity="0.9" transform="rotate(-30 44 24)" />
          </g>
        )}

        {/* Animated Prismatic Specular Sparkle Stars */}
        <g className="animate-pulse" style={{ animationDuration: '2.5s' }}>
          <path
            d="M 68 23 L 69.5 27 L 73.5 28.5 L 69.5 30 L 68 34 L 66.5 30 L 62.5 28.5 L 66.5 27 Z"
            fill="#ffffff"
            opacity="0.95"
          />
          <circle cx="68" cy="28.5" r="1.2" fill="#ffffff" />
        </g>
        <g className="animate-pulse" style={{ animationDuration: '3.8s', animationDelay: '1.2s' }}>
          <path
            d="M 32 45 L 33 47.5 L 35.5 48.5 L 33 49.5 L 32 52 L 31 49.5 L 28.5 48.5 L 31 47.5 Z"
            fill="#ffffff"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
};

export const GemPiece = React.memo(GemPieceComponent);
