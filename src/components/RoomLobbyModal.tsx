import React, { useState, useEffect } from 'react';
import { PieceColor, RoomData, ThemeId } from '../game/types';
import { THEMES } from '../game/themes';
import {
  apiCreateRoom,
  apiJoinRoom,
  saveRoomSession,
  normalizeRoomCode,
} from '../game/roomClient';
import { soundEngine } from '../game/audio';
import {
  Crown,
  Copy,
  Check,
  Share2,
  Users,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Radio,
  Clock,
  Swords,
  ClipboardPaste,
} from 'lucide-react';
import {
  WhatsAppIcon,
  TelegramIcon,
  MessengerIcon,
  SnapchatIcon,
} from './SocialShareIcons';

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme: ThemeId;
  defaultClockMinutes: number;
  initialRoomCode?: string; // If navigated with ?room=CODE
  onEnterRoom: (session: {
    roomId: string;
    token: string;
    playerId: string;
    color: PieceColor | 'spectator';
    isHost: boolean;
    room: RoomData;
  }) => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  onClose,
  initialTheme,
  defaultClockMinutes,
  initialRoomCode,
  onEnterRoom,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(
    initialRoomCode ? 'join' : 'create'
  );

  // Create room options
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('w');
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme);
  const [clockMinutes, setClockMinutes] = useState<number>(defaultClockMinutes);
  const [hostName, setHostName] = useState<string>('White Monarch');

  // Creation / Join state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{
    roomId: string;
    token: string;
    playerId: string;
    color: PieceColor;
    room: RoomData;
  } | null>(null);

  // Join state
  const [joinInput, setJoinInput] = useState<string>(initialRoomCode || '');
  const [guestName, setGuestName] = useState<string>('Imperial Challenger');

  // Copy feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    if (initialRoomCode) {
      setJoinInput(initialRoomCode);
      setTab('join');
    }
  }, [initialRoomCode]);

  if (!isOpen) return null;

  // Compute invite URL
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentRoomId = createdRoom?.roomId || '';
  const inviteUrl = currentRoomId
    ? `${appOrigin}/?room=${encodeURIComponent(currentRoomId)}`
    : '';

  const shareText = `👑 You are cordially challenged to a Royal Chess Match at Crown & Carat!
Chamber Code: ${currentRoomId}
Enter the Chamber here: ${inviteUrl}`;

  // Handle Room Creation
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiCreateRoom({
        preferredColor,
        themeId,
        clockMinutes,
        hostName: hostName.trim() || 'Royal Host',
      });

      setCreatedRoom({
        roomId: data.roomId,
        token: data.playerToken,
        playerId: data.playerId,
        color: data.playerColor,
        room: data.room,
      });
      saveRoomSession({
        roomId: data.roomId,
        token: data.playerToken,
        playerId: data.playerId,
        color: data.playerColor,
        isHost: true,
      });
      soundEngine.playLanding('k');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create Royal Chamber');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Room Joining
  const handleJoinRoom = async () => {
    if (!joinInput.trim()) {
      setErrorMsg('Please enter a Royal Chamber code or invite link');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Extract code if user pasted full URL
      let codeToJoin = joinInput.trim();
      if (codeToJoin.includes('room=')) {
        try {
          codeToJoin = new URL(codeToJoin).searchParams.get('room') || codeToJoin;
        } catch {
          // not a URL: fall through and validate as a plain code
        }
      }
      const validCode = normalizeRoomCode(codeToJoin.replace(/^#/, ''));
      if (!validCode) {
        setErrorMsg('That is not a valid chamber code. It looks like ROYAL-8X9B2F.');
        return;
      }
      codeToJoin = validCode;

      const data = await apiJoinRoom(codeToJoin, {
        name: guestName.trim() || 'Imperial Challenger',
      });

      saveRoomSession({
        roomId: data.roomId,
        token: data.playerToken,
        playerId: data.playerId,
        color: data.playerColor,
        isHost: false,
      });

      soundEngine.playFirstMove();
      onEnterRoom({
        roomId: data.roomId,
        token: data.playerToken,
        playerId: data.playerId,
        color: data.playerColor,
        isHost: false,
        room: data.room,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to join Chamber. Check code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Paste from Clipboard
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJoinInput(text.trim());
        }
      }
    } catch {
      // Permission denied or unavailable
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    soundEngine.playPickup();
    setTimeout(() => setCopiedLink(false), 2400);
  };

  // Copy Code
  const handleCopyCode = () => {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId);
    setCopiedCode(true);
    soundEngine.playPickup();
    setTimeout(() => setCopiedCode(false), 2400);
  };

  // Social Shares
  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(
      `👑 Join my Royal Chess Match in Chamber ${currentRoomId}!`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareMessenger = () => {
    // Messenger sharing with native app intent & web dialog fallback
    const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(inviteUrl)}`;
    const webFallback = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
      inviteUrl
    )}&app_id=291494419107518&redirect_uri=${encodeURIComponent(inviteUrl)}`;

    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = messengerUrl;
      setTimeout(() => {
        window.open(webFallback, '_blank', 'noopener,noreferrer');
      }, 500);
    } else {
      window.open(webFallback, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShareSnapchat = () => {
    const snapUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(inviteUrl)}`;
    window.open(snapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Crown & Carat Chess Duel',
          text: `👑 Join my Royal Chess Match in Chamber ${currentRoomId}!`,
          url: inviteUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const activeThemeConfig = THEMES[themeId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c122e]/98 via-[#130a21]/98 to-[#090410]/98 border-2 border-[#d4af37] rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(212,175,55,0.4)] backdrop-blur-2xl text-left overflow-y-auto max-h-[92vh]">
        {/* Filigree corner accents */}
        <div className="absolute top-3 left-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute top-3 right-10 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 left-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>
        <div className="absolute bottom-3 right-4 text-[#d4af37] text-sm font-serif opacity-70">❖</div>

        {/* Top Navigation Bar with Back and Close */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={createdRoom ? () => setCreatedRoom(null) : onClose}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-200 text-xs font-serif transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{createdRoom ? '← Back to Setup' : '← Back to Menu'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full border border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-200 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-gradient-to-b from-amber-400/20 to-amber-700/30 border border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <Users className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300">
              Two Player Royal Duel
            </h2>
            <p className="font-serif text-xs text-amber-300/70 tracking-wider">
              Create an online chamber, share invite link, or join a friend
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {!createdRoom && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-amber-500/20 rounded-2xl mb-5">
            <button
              onClick={() => {
                setTab('create');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl font-serif text-xs font-semibold transition-all ${
                tab === 'create'
                  ? 'bg-amber-500/25 border border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'text-amber-200/60 hover:text-amber-100'
              }`}
            >
              Create Chamber
            </button>
            <button
              onClick={() => {
                setTab('join');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl font-serif text-xs font-semibold transition-all ${
                tab === 'join'
                  ? 'bg-amber-500/25 border border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'text-amber-200/60 hover:text-amber-100'
              }`}
            >
              Join Chamber
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-serif flex items-center gap-2">
            <span className="text-red-400 font-bold">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: CREATE ROOM */}
        {tab === 'create' && !createdRoom && (
          <div className="space-y-4">
            {/* Host Color Choice */}
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
                1. Your Royal Allegiance (Color)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'w', label: 'White Diamond (1st Move)' },
                  { id: 'b', label: 'Imperial Ruby (2nd Move)' },
                  { id: 'random', label: 'Random Coin Toss' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreferredColor(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      preferredColor === opt.id
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-serif text-xs font-semibold">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chess Clock Options */}
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                2. Chess Clock Limit
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

            {/* Theme Selection */}
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
                3. Gemstone & Board Theme
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
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-black/30 border-amber-500/20 text-amber-200/60 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-serif text-xs font-bold text-amber-100 truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-amber-300/60 truncate">{t.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action: Create Chamber */}
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full mt-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d4af37] hover:from-[#fef08a] hover:via-[#f59e0b] hover:to-[#fef08a] text-[#120a1c] font-serif font-bold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Forging Royal Chamber...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 fill-current" />
                  Create Chamber & Generate Invite Link
                </>
              )}
            </button>
          </div>
        )}

        {/* ACTIVE CREATED ROOM & SHARING VIEW */}
        {createdRoom && (
          <div className="space-y-4 animate-fadeIn">
            {/* Room Created Banner */}
            <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-transparent border border-amber-500/30">
              <span className="text-[11px] font-serif uppercase tracking-widest text-amber-300 font-bold">
                Royal Chamber Created
              </span>
              <div className="flex items-center justify-center gap-3 my-2">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-100 tracking-wider">
                  {currentRoomId}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 transition-all cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Waiting status indicator */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-amber-400/30 text-xs text-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-serif">Awaiting challenger to enter chamber...</span>
              </div>
            </div>

            {/* Direct Invite Link */}
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1 uppercase tracking-wider">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs font-mono focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Options */}
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                Share Chamber With Opponent
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-white font-serif text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/50 text-white font-serif text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
                  <span>Telegram</span>
                </button>

                {/* Messenger */}
                <button
                  onClick={handleShareMessenger}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0084FF]/20 hover:bg-[#0084FF]/30 border border-[#0084FF]/50 text-white font-serif text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <MessengerIcon className="w-4 h-4 text-[#0084FF]" />
                  <span>Messenger</span>
                </button>

                {/* Snapchat */}
                <button
                  onClick={handleShareSnapchat}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FFFC00]/20 hover:bg-[#FFFC00]/30 border border-[#FFFC00]/50 text-white font-serif text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <SnapchatIcon className="w-4 h-4 text-[#FFFC00]" />
                  <span>Snapchat</span>
                </button>
              </div>

              {/* Native / More share */}
              <button
                onClick={handleNativeShare}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-serif font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>More Share Options (SMS, Discord, AirDrop...)</span>
              </button>
            </div>

            {/* Launch Action */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  onEnterRoom({
                    roomId: createdRoom.roomId,
                    token: createdRoom.token,
                    playerId: createdRoom.playerId,
                    color: createdRoom.color,
                    isHost: true,
                    room: createdRoom.room,
                  });
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d4af37] hover:from-[#fef08a] hover:via-[#f59e0b] hover:to-[#fef08a] text-[#120a1c] font-serif font-bold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Board as Host</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCreatedRoom(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-500/30 bg-stone-900/80 hover:bg-amber-500/10 text-amber-300 font-serif font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>← Back to Chamber Configuration</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: JOIN ROOM */}
        {tab === 'join' && !createdRoom && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Enter Chamber Code or Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. ROYAL-8X9B2F or paste URL"
                  value={joinInput}
                  onChange={e => setJoinInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleJoinRoom();
                  }}
                  className="flex-1 py-3 px-3.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-sm font-mono placeholder:text-amber-400/30 focus:outline-none focus:border-amber-400 uppercase"
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="p-3 rounded-xl bg-black/40 hover:bg-white/10 border border-amber-500/30 text-amber-200 transition-all cursor-pointer"
                  title="Paste from Clipboard"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] font-serif text-amber-300/60 mt-1">
                Enter the 6-character code shared by your friend, or paste their invite URL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
                Your Challenger Title
              </label>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Imperial Challenger"
                className="w-full py-2.5 px-3.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs font-serif placeholder:text-amber-400/30 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="sm:w-1/3 py-3 px-4 rounded-xl border border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-200 font-serif font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>← Back</span>
              </button>

              <button
                onClick={handleJoinRoom}
                disabled={isLoading || !joinInput.trim()}
                className="sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d4af37] hover:from-[#fef08a] hover:via-[#f59e0b] hover:to-[#fef08a] text-[#120a1c] font-serif font-bold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Entering Royal Chamber...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    Enter Royal Chamber
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
