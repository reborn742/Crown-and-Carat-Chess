import React, { useState } from 'react';
import { AiDifficulty, GameMode, ThemeId } from '../game/types';
import { THEMES } from '../game/themes';
import {
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  Sparkles,
  Swords,
  Bot,
  Layers,
  Clock,
  Sliders,
  Users,
  Flag,
  Handshake,
  ArrowLeft,
} from 'lucide-react';

interface ControlsProps {
  mode: GameMode;
  difficulty: AiDifficulty;
  themeId: ThemeId;
  isMuted: boolean;
  is3DTilted: boolean;
  clockMinutes: number; // 0 for untimed, 5, 10, 15
  canUndo: boolean;
  isAiThinking: boolean;
  roomId?: string | null;
  hasStarted?: boolean;
  isGameOver?: boolean;
  isDrawOfferedByMe?: boolean;
  engineName?: string;
  onReturnToMenu?: () => void;
  onOpenSettings?: () => void;
  onOpenRoomLobby?: () => void;
  onToggleChat?: () => void;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onSetMode: (mode: GameMode) => void;
  onSetDifficulty: (diff: AiDifficulty) => void;
  onSetTheme: (themeId: ThemeId) => void;
  onToggleSound: () => void;
  onToggle3D: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
  onNewGame: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  mode,
  difficulty,
  themeId,
  isMuted,
  is3DTilted,
  clockMinutes,
  canUndo,
  isAiThinking,
  roomId,
  hasStarted = true,
  isGameOver = false,
  isDrawOfferedByMe = false,
  engineName = 'Stockfish 19 Lite WASM',
  onReturnToMenu,
  onOpenSettings,
  onOpenRoomLobby,
  onToggleChat,
  onResign,
  onOfferDraw,
  onSetMode,
  onSetDifficulty,
  onSetTheme,
  onToggleSound,
  onToggle3D,
  onFlipBoard,
  onUndo,
  onNewGame,
}) => {
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[#120a1c]/90 border border-amber-500/30 rounded-xl shadow-xl backdrop-blur-md">
      {/* Top Bar: Action Buttons */}
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo || isAiThinking}
          title="Undo Move"
          aria-label="Undo move"
          className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-amber-500/20 bg-white/5 hover:bg-amber-500/10 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-amber-200"
        >
          <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[9px] font-serif font-semibold">Undo</span>
        </button>

        <button
          onClick={onFlipBoard}
          title="Flip Board Orientation"
          aria-label="Flip board"
          className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-amber-500/20 bg-white/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all text-amber-200"
        >
          <RefreshCw className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[9px] font-serif font-semibold">Flip</span>
        </button>

        <button
          onClick={onToggle3D}
          title="Toggle 3D Surface Tilt"
          aria-label="Toggle 3D perspective"
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-amber-200 ${
            is3DTilted
              ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'border-amber-500/20 bg-white/5 hover:bg-amber-500/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5 mb-0.5" />
          <span className="text-[9px] font-serif font-semibold">3D Tilt</span>
        </button>

        <button
          onClick={onToggleSound}
          title={isMuted ? 'Unmute Crystal Chimes' : 'Mute Crystal Chimes'}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-amber-500/20 bg-white/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all text-amber-200"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 mb-0.5 text-red-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 mb-0.5 text-amber-300" />
          )}
          <span className="text-[9px] font-serif font-semibold">
            {isMuted ? 'Muted' : 'Sound'}
          </span>
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Settings & Intensity"
            aria-label="Open settings"
            className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-amber-500/20 bg-white/5 hover:bg-amber-500/10 hover:border-amber-400 transition-all text-amber-200"
          >
            <Sliders className="w-3.5 h-3.5 mb-0.5 text-amber-300" />
            <span className="text-[9px] font-serif font-semibold">Tune</span>
          </button>
        )}

        <button
          onClick={onNewGame}
          title="Start Fresh Game"
          aria-label="Start new game"
          className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-amber-400/50 bg-gradient-to-b from-amber-600/30 to-amber-900/50 hover:from-amber-500/40 hover:to-amber-800/60 transition-all text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 mb-0.5 text-amber-300" />
          <span className="text-[9px] font-serif font-semibold">New</span>
        </button>
      </div>

      {/* Resignation Confirmation Banner */}
      {showResignConfirm && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-stone-900/90 to-rose-950/90 border border-rose-500/40 text-center animate-fadeIn space-y-2">
          <p className="font-serif text-xs text-rose-200 font-semibold flex items-center justify-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            Yield the Crown by Resignation?
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setShowResignConfirm(false);
                onResign?.();
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-serif text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Confirm Resign 🏳️
            </button>
            <button
              onClick={() => setShowResignConfirm(false)}
              className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-serif text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draw Offer Confirmation Banner */}
      {showDrawConfirm && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-stone-900/90 to-amber-950/90 border border-amber-500/40 text-center animate-fadeIn space-y-2">
          <p className="font-serif text-xs text-amber-200 font-semibold flex items-center justify-center gap-1.5">
            <Handshake className="w-3.5 h-3.5 text-amber-400" />
            Offer a Mutual Draw to Opponent?
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setShowDrawConfirm(false);
                onOfferDraw?.();
              }}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Send Draw Offer 🤝
            </button>
            <button
              onClick={() => setShowDrawConfirm(false)}
              className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-serif text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* In-Game Verdict Actions: Resign and Draw Offer */}
      {hasStarted && !isGameOver && !showResignConfirm && !showDrawConfirm && (
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-amber-500/20">
          <button
            onClick={() => setShowResignConfirm(true)}
            title="Concede the Match (Resign)"
            className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 hover:border-rose-400 text-rose-300 font-serif text-[11px] font-semibold transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Resign 🏳️</span>
          </button>

          {mode === 'room' && onOfferDraw ? (
            <button
              onClick={() => setShowDrawConfirm(true)}
              disabled={isDrawOfferedByMe}
              title={
                isDrawOfferedByMe
                  ? "Draw offer sent. Awaiting opponent's response..."
                  : "Offer a Peaceful Draw to Opponent"
              }
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border text-[11px] font-serif font-semibold transition-all cursor-pointer ${
                isDrawOfferedByMe
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-300/80 cursor-wait'
                  : 'border-amber-500/30 bg-amber-950/30 hover:bg-amber-900/50 hover:border-amber-400 text-amber-200'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 text-amber-400" />
              <span>{isDrawOfferedByMe ? 'Draw Offered...' : 'Offer Draw 🤝'}</span>
            </button>
          ) : (
            <div className="flex items-center justify-center text-[10px] font-serif text-amber-300/60 italic">
              Duel in Progress
            </div>
          )}
        </div>
      )}

      {/* Mode & Difficulty Selector */}
      <div className="flex flex-col gap-2 pt-1 border-t border-amber-500/20">
        <div className="flex items-center justify-between text-xs text-amber-200/80 font-serif">
          <div className="flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Game Mode</span>
          </div>

          <div className="flex rounded-lg overflow-hidden border border-amber-500/30 p-0.5 bg-black/40">
            <button
              onClick={() => {
                if (mode === 'room' && onOpenRoomLobby) {
                  onOpenRoomLobby();
                } else if (onOpenRoomLobby) {
                  onOpenRoomLobby();
                } else {
                  onSetMode('room');
                }
              }}
              className={`px-2 py-1 text-[11px] font-serif font-medium rounded transition-all flex items-center gap-1 ${
                mode === 'room'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                  : 'text-amber-100/60 hover:text-amber-200'
              }`}
            >
              <Users className="w-3 h-3" />
              Room
            </button>
            <button
              onClick={() => onSetMode('pvc')}
              className={`px-2.5 py-1 text-[11px] font-serif font-medium rounded transition-all flex items-center gap-1 ${
                mode === 'pvc'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                  : 'text-amber-100/60 hover:text-amber-200'
              }`}
            >
              <Bot className="w-3 h-3" />
              Vs AI
            </button>
          </div>
        </div>

        {mode === 'room' && roomId && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-amber-200 font-bold">{roomId}</span>
            </div>
            <div className="flex items-center gap-2">
              {onToggleChat && (
                <button
                  onClick={onToggleChat}
                  className="text-[10px] font-serif uppercase tracking-wider text-amber-300 hover:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/30 transition-all cursor-pointer"
                >
                  💬 Dispatch
                </button>
              )}
              {onOpenRoomLobby && (
                <button
                  onClick={onOpenRoomLobby}
                  className="text-[10px] font-serif uppercase tracking-wider text-amber-300 hover:text-amber-100 underline cursor-pointer"
                >
                  Invite Link
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'pvc' && (
          <div className="flex flex-col gap-1 pl-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-serif text-amber-300/70">Skill Level:</span>
              <div className="flex gap-1">
                {(['easy', 'medium', 'hard'] as AiDifficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => onSetDifficulty(d)}
                    className={`px-2 py-0.5 text-[10px] font-serif uppercase tracking-wider rounded border transition-all ${
                      difficulty === d
                        ? 'bg-amber-500/30 text-amber-100 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : 'bg-black/20 text-amber-200/50 border-amber-500/20 hover:text-amber-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-amber-400/60 font-sans">
              <span>Engine:</span>
              <span className="text-amber-300 font-medium truncate max-w-[150px]">{engineName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Theme Switcher */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-amber-500/20">
        <div className="flex items-center justify-between text-xs text-amber-200/80 font-serif">
          <span className="font-semibold">Gemstone Set & Board</span>
          <span className="text-[10px] text-amber-400/60 font-sans">
            {THEMES[themeId].name}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(['diamond-ruby', 'emerald-pearl', 'sapphire-topaz'] as ThemeId[]).map(id => {
            const t = THEMES[id];
            const isSelected = themeId === id;
            return (
              <button
                key={id}
                onClick={() => onSetTheme(id)}
                className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-black/30 border-amber-500/20 hover:border-amber-400/50 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: t.lightPieceColors.baseStart }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
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

      {/* Direct Back to Menu Navigation */}
      {onReturnToMenu && (
        <button
          onClick={onReturnToMenu}
          className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-amber-500/30 bg-stone-900/80 hover:bg-amber-500/15 text-amber-200 hover:text-amber-100 font-serif text-xs font-semibold tracking-wide transition-all shadow-sm hover:border-amber-400/60 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>← Back to Main Menu</span>
        </button>
      )}
    </div>
  );
};
