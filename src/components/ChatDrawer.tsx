import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  PieceColor,
  ThemeConfig,
} from '../game/types';
import { soundEngine } from '../game/audio';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Smile,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Crown,
  Swords,
  Shield,
  Flame,
  CheckCheck,
  Download,
  AlertCircle,
} from 'lucide-react';

// SECURITY: chat images must be inline JPEG data URLs (what our own client produces).
// Anything else (external URLs = IP-tracking pixels, javascript:, svg, ...) is never rendered.
const isSafeChatImage = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith('data:image/jpeg;base64,');

interface ChatDrawerProps {
  roomId: string;
  playerId: string;
  playerColor: PieceColor | 'spectator';
  playerName: string;
  opponentName?: string;
  theme: ThemeConfig;
  messages: ChatMessage[];
  onSendMessage: (payload: { text?: string; imageUrl?: string; isReaction?: boolean }) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onEmojiReactionBurst?: (emoji: string) => void;
}

const QUICK_REACTIONS = [
  { emoji: '👑', label: 'Monarch' },
  { emoji: '💎', label: 'Brilliant' },
  { emoji: '⚔️', label: 'Attack' },
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '💀', label: 'Deadly' },
  { emoji: '🤯', label: 'Mindblown' },
  { emoji: '👏', label: 'Bravo' },
  { emoji: '🤝', label: 'Well Played' },
];

const ROYAL_PHRASES = [
  'Brilliant stroke! 💎',
  'Checkmate looms! ⚔️',
  'Honor to your crown! 👑',
  'A formidable defense! 🛡️',
  'A classic blunder... 💀',
  'Victory shall be mine! 🏆',
  'A duel of the century! 🌟',
  'Good luck, noble monarch! 🤝',
];

const EMOJI_CATEGORIES = [
  {
    name: 'Royal & Chess',
    icon: '👑',
    emojis: ['👑', '💎', '⚔️', '🛡️', '🏰', '🐴', '♟️', '🏆', '🤴', '👸', '⚜️', '🗡️', '🏹', '📜', '🎺', '🪙', '🕯️', '💍', '🔮', '🪄'],
  },
  {
    name: 'Hype & Banter',
    icon: '🔥',
    emojis: ['🔥', '🤯', '💀', '😱', '😈', '🍿', '👏', '🫡', '💯', '🤝', '🤩', '🚀', '⚡', '💥', '🎯', '🧊', '🥶', '🥵', '🧠', '🕶️'],
  },
  {
    name: 'Gems & Magic',
    icon: '✨',
    emojis: ['💎', '💍', '✨', '🌟', '💫', '💖', '🔮', '💠', '🔷', '🔶', '🔴', '🟣', '🟢', '🟡', '🌌', '🎆', '🎇', '🌠', '🪙', '🧿'],
  },
];

export function ChatDrawer({
  roomId,
  playerId,
  playerColor,
  playerName,
  opponentName,
  theme,
  messages,
  onSendMessage,
  isOpen,
  onToggleOpen,
  onEmojiReactionBurst,
}: ChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPhrases, setShowPhrases] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Compress image to fast lightweight base64 JPEG
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.82 quality (~80-120KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPendingImage(dataUrl);
        }
        setIsCompressing(false);
      };
      img.onerror = () => setIsCompressing(false);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setIsCompressing(false);
    reader.readAsDataURL(file);
  }, []);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clipboard paste support (Ctrl+V screenshot/image)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          break;
        }
      }
    }
  };

  // Drag and drop image
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const handleSend = () => {
    const textTrimmed = inputText.trim();
    if (!textTrimmed && !pendingImage) return;

    onSendMessage({
      text: textTrimmed || undefined,
      imageUrl: pendingImage || undefined,
      isReaction: false,
    });

    setInputText('');
    setPendingImage(null);
    setShowEmojiPicker(false);
    setShowPhrases(false);
  };

  const handleQuickReaction = (emoji: string) => {
    onSendMessage({
      text: emoji,
      isReaction: true,
    });
    onEmojiReactionBurst?.(emoji);
    soundEngine.playReactionPop();
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSelectPhrase = (phrase: string) => {
    onSendMessage({
      text: phrase,
      isReaction: false,
    });
    setShowPhrases(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Lightbox Modal for Shared Images */}
      {lightboxImage && isSafeChatImage(lightboxImage) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-amber-300 hover:text-white bg-black/60 rounded-full border border-amber-500/30 transition-all cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Shared in Royal Chamber"
              className="max-h-[82vh] max-w-full rounded-xl border-2 border-amber-500/50 shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={lightboxImage}
                download="royal-chess-capture.jpg"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-serif transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Save Image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Drawer (Slide-out or Docked) */}
      <div
        className={`fixed bottom-0 right-0 z-40 transition-all duration-300 ease-out flex flex-col ${
          isOpen
            ? 'w-full sm:w-[380px] md:w-[420px] h-[540px] sm:h-[600px] max-h-[88vh]'
            : 'w-auto h-auto'
        }`}
      >
        {!isOpen ? null : (
          <div
            className={`w-full h-full flex flex-col rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-none bg-stone-950/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl overflow-hidden transition-all duration-200 ${
              isDragOver ? 'ring-2 ring-amber-400 bg-stone-900/95' : ''
            }`}
            onDragOver={e => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border-b border-amber-500/30 select-none">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-lg border border-amber-300/40 text-stone-950">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-stone-950 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
                    Royal Chamber Dispatch
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h3>
                  <p className="text-[10px] text-stone-400 font-sans">
                    Room: <span className="text-amber-300 font-mono font-bold">{roomId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleOpen}
                  className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-serif transition-all cursor-pointer"
                  title="Back to Chessboard"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>← Back to Board</span>
                </button>
                <button
                  onClick={onToggleOpen}
                  title="Minimize dispatch"
                  className="p-1.5 text-stone-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick 1-Tap Reaction Bar */}
            <div className="px-3 py-1.5 bg-stone-900/80 border-b border-amber-500/20 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-serif text-amber-400/80 font-bold uppercase tracking-wider pl-1 shrink-0">
                React:
              </span>
              <div className="flex items-center gap-1">
                {QUICK_REACTIONS.map(qr => (
                  <button
                    key={qr.emoji}
                    onClick={() => handleQuickReaction(qr.emoji)}
                    title={qr.label}
                    className="p-1 hover:scale-125 active:scale-95 transition-transform text-base rounded-md hover:bg-amber-500/20 cursor-pointer"
                  >
                    {qr.emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPhrases(prev => !prev)}
                className="px-2 py-0.5 text-[10px] font-serif font-semibold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 shrink-0 cursor-pointer transition-all"
              >
                Phrases 📜
              </button>
            </div>

            {/* Royal Phrases Dropdown */}
            {showPhrases && (
              <div className="p-2 bg-stone-900 border-b border-amber-500/30 grid grid-cols-2 gap-1.5 animate-fadeIn text-xs">
                {ROYAL_PHRASES.map(phrase => (
                  <button
                    key={phrase}
                    onClick={() => handleSelectPhrase(phrase)}
                    className="text-left px-2.5 py-1.5 rounded-lg bg-stone-800/90 hover:bg-amber-500/20 border border-amber-500/20 text-stone-200 hover:text-amber-200 transition-all cursor-pointer font-serif text-[11px] truncate"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              ref={chatScrollRef}
              className="flex-1 p-3 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="font-serif text-amber-200 text-sm">The Royal Chamber is Open</p>
                  <p className="text-xs text-stone-400 max-w-[240px]">
                    Greet your opponent, exchange images, or send mindblowing gemstone reactions!
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === playerId;
                  const isWhite = msg.senderColor === 'w';
                  const isBlack = msg.senderColor === 'b';

                  if (msg.isReaction) {
                    // Reaction Message Presentation
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-center gap-2 ${
                          isMe ? 'justify-end' : 'justify-start'
                        } animate-scaleIn`}
                      >
                        <div
                          className={`px-3 py-1.5 rounded-full border shadow-lg flex items-center gap-2 ${
                            isMe
                              ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                              : 'bg-stone-800/80 border-stone-600/40 text-stone-200'
                          }`}
                        >
                          <span className="text-2xl animate-bounce">{msg.text}</span>
                          <span className="text-[10px] font-serif text-stone-400">
                            {isMe ? 'You reacted' : `${msg.senderName}`}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      } space-y-1 animate-fadeIn`}
                    >
                      {/* Sender Info Badge */}
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 px-1 font-serif">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isWhite
                              ? 'bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,0.8)]'
                              : isBlack
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-stone-300">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-stone-500 text-[9px]">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-xl backdrop-blur-md border ${
                          isMe
                            ? 'bg-gradient-to-br from-amber-950/70 via-amber-900/60 to-stone-900 border-amber-500/40 text-amber-100 rounded-tr-none'
                            : 'bg-gradient-to-br from-stone-800/90 to-stone-900/90 border-stone-600/40 text-stone-100 rounded-tl-none'
                        }`}
                      >
                        {/* Image Attachment (if present) */}
                        {isSafeChatImage(msg.imageUrl) && (
                          <div className="relative mb-2 rounded-xl overflow-hidden border border-amber-500/30 group">
                            <img
                              src={msg.imageUrl}
                              alt="Shared attachment"
                              className="max-h-56 w-auto object-cover rounded-lg cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                              onClick={() => setLightboxImage(msg.imageUrl || null)}
                            />
                            <button
                              onClick={() => setLightboxImage(msg.imageUrl || null)}
                              className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Full Screen View"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="text-sm font-sans whitespace-pre-wrap break-words leading-relaxed">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mindblowing Emoji Picker Overlay */}
            {showEmojiPicker && (
              <div className="bg-stone-900/95 border-t border-amber-500/30 p-2.5 animate-fadeIn">
                {/* Tabs */}
                <div className="flex border-b border-stone-800 pb-1.5 mb-2 gap-1">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={cat.name}
                      onClick={() => setActiveEmojiTab(idx)}
                      className={`flex-1 py-1 text-xs font-serif rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeEmojiTab === idx
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="hidden sm:inline">{cat.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 text-stone-400 hover:text-white rounded hover:bg-stone-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Emoji Grid */}
                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 scrollbar-thin">
                  {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      onClick={() => handleSelectEmoji(emoji)}
                      className="p-1.5 text-lg hover:scale-130 active:scale-95 hover:bg-amber-500/20 rounded-lg transition-transform text-center cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Preview Queue Bar */}
            {pendingImage && (
              <div className="px-3 py-2 bg-stone-900/90 border-t border-amber-500/30 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-400/50">
                    <img
                      src={pendingImage}
                      alt="Pending"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-serif text-amber-200 font-semibold block">
                      Image attached
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Ready to transmit to chamber
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPendingImage(null)}
                  className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Controls & Toolbar */}
            <div className="p-2.5 bg-stone-950 border-t border-amber-500/30">
              <div className="flex items-center gap-2">
                {/* Image Attach Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  title="Share image or photo (or paste from clipboard)"
                  className="p-2 rounded-xl border border-amber-500/30 bg-stone-900/90 hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 transition-all cursor-pointer relative group shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                  {isCompressing && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                      <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Emoji Picker Button */}
                <button
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  title="Royal Emojis"
                  className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    showEmojiPicker
                      ? 'border-amber-400 bg-amber-500/30 text-amber-100'
                      : 'border-amber-500/30 bg-stone-900/90 hover:bg-amber-500/20 text-amber-300'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Text Field */}
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    pendingImage
                      ? 'Add an optional royal caption...'
                      : 'Dispatch message or paste image...'
                  }
                  maxLength={600}
                  className="flex-1 bg-stone-900/90 border border-amber-500/30 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-sans"
                />

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() && !pendingImage}
                  title="Send message"
                  className="p-2 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-lg shadow-amber-950 flex items-center gap-1 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
