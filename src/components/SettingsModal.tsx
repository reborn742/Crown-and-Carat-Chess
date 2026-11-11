import React from 'react';
import { AnimationIntensity, ThemeId } from '../game/types';
import { THEMES } from '../game/themes';
import { soundEngine } from '../game/audio';
import { Volume2, VolumeX, Sparkles, Layers, Sliders, X, Check, ArrowLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  intensity: AnimationIntensity;
  onChangeIntensity: (val: AnimationIntensity) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  is3DTilted: boolean;
  onToggle3D: () => void;
  themeId: ThemeId;
  onSetTheme: (id: ThemeId) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  intensity,
  onChangeIntensity,
  isMuted,
  onToggleMute,
  volume,
  onChangeVolume,
  is3DTilted,
  onToggle3D,
  themeId,
  onSetTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1c122c] via-[#120a1f] to-[#0a0512] border-2 border-[#d4af37] rounded-3xl p-6 shadow-[0_0_60px_rgba(212,175,55,0.35)] text-left">
        {/* Top Header with Back Button */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-200 text-xs font-serif transition-all cursor-pointer"
            aria-label="Back to match"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>← Back</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full border border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-200 transition-all cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-amber-100">Royal Chambers</h3>
            <p className="text-xs text-amber-200/60 font-sans">Visual & Acoustic Aesthetics</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Animation Intensity */}
          <div>
            <label className="block text-xs font-serif font-bold text-amber-200 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>Animation Intensity</span>
              <span className="text-[10px] text-amber-400/80 font-sans capitalize">{intensity}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['minimal', 'normal', 'epic'] as AnimationIntensity[]).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onChangeIntensity(lvl)}
                  className={`py-2 px-3 rounded-xl border text-xs font-serif capitalize font-semibold transition-all ${
                    intensity === lvl
                      ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-amber-300/50 mt-1 italic">
              {intensity === 'minimal'
                ? 'High performance, essential glides only.'
                : intensity === 'normal'
                ? 'Balanced arcs, sparkles, and gem fracture physics.'
                : 'Grand cinema: Queen sweeps, shockwaves, and golden trails.'}
            </p>
          </div>

          {/* Sound Volume & Mute */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                Crystal Chimes Volume
              </label>
              <button
                onClick={onToggleMute}
                className="text-xs font-serif text-amber-300 hover:underline cursor-pointer"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => {
                  onChangeVolume(parseFloat(e.target.value));
                  if (isMuted) onToggleMute();
                }}
                className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-xs font-mono text-amber-200 w-9 text-right">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* 3D Perspective Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <div>
                <span className="block text-xs font-serif font-bold text-amber-100">3D Surface Tilt</span>
                <span className="block text-[10px] text-amber-200/50">Subtle natural board perspective</span>
              </div>
            </div>
            <button
              onClick={onToggle3D}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                is3DTilted ? 'bg-amber-500' : 'bg-black/50 border border-amber-500/30'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  is3DTilted ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-xs font-serif font-bold text-amber-200 mb-2 uppercase tracking-wider">
              Gemstone & Board Material
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['diamond-ruby', 'emerald-pearl', 'sapphire-topaz'] as ThemeId[]).map(id => {
                const t = THEMES[id];
                const isSelected = themeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => onSetTheme(id)}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-black/30 border-amber-500/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/50"
                        style={{ backgroundColor: t.lightPieceColors.baseStart }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/50"
                        style={{ backgroundColor: t.darkPieceColors.baseStart }}
                      />
                    </div>
                    <span className="text-[10px] font-serif font-medium text-amber-100 text-center truncate w-full">
                      {id === 'diamond-ruby' ? 'Diamond' : id === 'emerald-pearl' ? 'Emerald' : 'Sapphire'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/40 via-amber-500/50 to-amber-600/40 border border-amber-400/50 text-amber-100 font-serif font-semibold text-xs tracking-wider uppercase hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
          <span>← Back to Match</span>
        </button>
      </div>
    </div>
  );
};
