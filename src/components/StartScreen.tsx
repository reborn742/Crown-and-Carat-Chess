import React from 'react';
import { AiDifficulty, GameMode, ThemeId } from '../game/types';
import { THEMES } from '../game/themes';
import { GemPiece } from './GemPiece';
import { Crown, Play, Bot, Clock, Sparkles, Users, ArrowLeft } from 'lucide-react';

interface StartScreenProps {
  onStartGame: (config: {
    mode: GameMode;
    difficulty: AiDifficulty;
    themeId: ThemeId;
    clockMinutes: number;
  }) => void;
  onOpenRoomLobby: () => void;
  initialTheme: ThemeId;
  canResume?: boolean;
  onResume?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  onOpenRoomLobby,
  initialTheme,
  canResume = false,
  onResume,
}) => {
  const [mode, setMode] = React.useState<GameMode>('room');
  const [difficulty, setDifficulty] = React.useState<AiDifficulty>('medium');
  const [themeId, setThemeId] = React.useState<ThemeId>(initialTheme);
  const [clockMinutes, setClockMinutes] = React.useState<number>(10);

  const activeTheme = THEMES[themeId];

  const handleLaunch = () => {
    if (mode === 'room') {
      onOpenRoomLobby();
      return;
    }
    onStartGame({
      mode,
      difficulty,
      themeId,
      clockMinutes,
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 z-20">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#1c122e]/95 via-[#120a1f]/95 to-[#090410]/95 border-2 border-[#d4af37] rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(212,175,55,0.35)] backdrop-blur-xl text-center">
        {/* Filigree corner accents */}
        <div className="absolute top-3 left-4 text-[#d4af37] text-lg font-serif opacity-70">❖</div>
        <div className="absolute top-3 right-4 text-[#d4af37] text-lg font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 left-4 text-[#d4af37] text-lg font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 right-4 text-[#d4af37] text-lg font-serif opacity-70">❖</div>

        {/* Back / Resume Active Match Banner */}
        {canResume && onResume && (
          <div className="mb-4 p-2.5 rounded-2xl bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-600/30 border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-between gap-3 text-left">
            <div className="pl-2">
              <span className="text-[11px] font-serif font-bold text-amber-200 block">
                Match in Progress
              </span>
              <span className="text-[10px] text-amber-300/80">
                Your royal duel is waiting on the board
              </span>
            </div>
            <button
              onClick={onResume}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-stone-950" />
              <span>← Back to Match</span>
            </button>
          </div>
        )}

        {/* Crown Badge */}
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-b from-amber-400/20 to-amber-700/30 border border-amber-400/50 mb-3 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
          <Crown className="w-8 h-8 text-amber-300 drop-shadow-md" />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 tracking-wider">
          CROWN & CARAT
        </h1>
        <p className="font-serif text-xs uppercase tracking-[0.3em] text-amber-400/80 mt-1 mb-5">
          The Precious Stone Chess Championship
        </p>

        {/* Luminous Piece Showcase */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-3 my-2 border-y border-amber-500/20 bg-black/30 rounded-xl">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
              <GemPiece type="k" color="w" theme={activeTheme} />
            </div>
            <span className="text-[11px] font-serif text-amber-200 mt-1 font-semibold">
              {activeTheme.lightPieceName}
            </span>
          </div>

          <div className="text-amber-400/40 font-serif text-lg font-bold">VS</div>

          <div className="flex flex-col items-center">
            <div className="w-14 h-14 drop-shadow-[0_0_12px_rgba(255,77,109,0.5)]">
              <GemPiece type="q" color="b" theme={activeTheme} />
            </div>
            <span className="text-[11px] font-serif text-amber-200 mt-1 font-semibold">
              {activeTheme.darkPieceName}
            </span>
          </div>
        </div>

        {/* Game Mode */}
        <div className="mt-5 text-left space-y-4">
          <div>
            <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
              1. Choose Game Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('room')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-serif font-semibold transition-all ${
                  mode === 'room'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4 text-amber-400" />
                Two Players (Online Room)
              </button>

              <button
                type="button"
                onClick={() => setMode('pvc')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-serif font-semibold transition-all ${
                  mode === 'pvc'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                }`}
              >
                <Bot className="w-4 h-4 text-amber-400" />
                Player vs Computer
              </button>
            </div>
            {mode === 'room' && (
              <p className="text-[11px] font-serif text-amber-300/80 mt-1.5 ml-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Creates an online chamber with invite link & instant sharing to WhatsApp, Telegram, Messenger & Snapchat!
              </p>
            )}
            {mode === 'pvc' && (
              <p className="text-[11px] font-serif text-amber-300/80 mt-1.5 ml-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Powered locally by Stockfish 19 WASM in your browser (no external APIs or keys).
              </p>
            )}
          </div>

          {/* AI Difficulty if PvC */}
          {mode === 'pvc' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-serif font-bold text-amber-200 uppercase tracking-wider">
                  2. Stockfish Skill Level
                </label>
                <span className="text-[10px] text-amber-400/80 font-mono">
                  {difficulty === 'easy'
                    ? 'Skill 2 (~300ms)'
                    : difficulty === 'medium'
                    ? 'Skill 10 (~800ms)'
                    : 'Skill 20 (~1500ms)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as AiDifficulty[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl border text-xs font-serif capitalize font-semibold transition-all ${
                      difficulty === d
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Theme Selection */}
          <div>
            <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
              {mode === 'pvc' ? '3.' : '2.'} Gemstone & Board Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['diamond-ruby', 'emerald-pearl', 'sapphire-topaz'] as ThemeId[]).map(id => {
                const t = THEMES[id];
                const isSelected = themeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: t.lightPieceColors.baseStart }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: t.darkPieceColors.baseStart }}
                      />
                    </div>
                    <div className="font-serif text-xs font-bold text-amber-100 truncate">
                      {t.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chess Clock Options */}
          <div>
            <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
              {mode === 'pvc' ? '4.' : '3.'} Chess Clock Limit
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mins: 0, label: 'Untimed' },
                { mins: 5, label: '5 Mins' },
                { mins: 10, label: '10 Mins' },
                { mins: 15, label: '15 Mins' },
              ].map(opt => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setClockMinutes(opt.mins)}
                  className={`py-2 rounded-xl border text-xs font-serif font-semibold transition-all ${
                    clockMinutes === opt.mins
                      ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <button
          onClick={handleLaunch}
          className="w-full mt-7 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d4af37] hover:from-[#fef08a] hover:via-[#f59e0b] hover:to-[#fef08a] text-[#120a1c] font-serif font-bold text-base tracking-widest uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          Enter Royal Match
        </button>
      </div>
    </div>
  );
};
