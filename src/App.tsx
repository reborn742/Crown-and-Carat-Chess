import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveAnimation,
  AnimationIntensity,
  AiDifficulty,
  CapturedPieces,
  ChatMessage,
  GameMode,
  GameState,
  Move,
  PieceColor,
  PieceType,
  Position,
  RoomData,
  ThemeId,
} from './game/types';
import {
  getInitialGameState,
  getLegalMovesForPosition,
  makeMove,
  undoLastMove,
  getCapturedPieces,
  PIECE_VALUES,
} from './game/chessEngine';
import { stockfishEngine, getComputerMove, EngineInfoUpdate } from './engine/stockfishWorker';
import { soundEngine } from './game/audio';
import { THEMES } from './game/themes';
import {
  RoomSocketController,
  saveRoomSession,
  loadSavedRoomSession,
  normalizeRoomCode,
} from './game/roomClient';
import { Board } from './components/Board';
import { MoveHistory } from './components/MoveHistory';
import { CapturedTray } from './components/CapturedTray';
import { ChessClock } from './components/ChessClock';
import { Controls } from './components/Controls';
import { StartScreen } from './components/StartScreen';
import { PromotionDialog } from './components/PromotionDialog';
import { VictoryModal } from './components/VictoryModal';
import { SettingsModal } from './components/SettingsModal';
import { RoomLobbyModal } from './components/RoomLobbyModal';
import { ChatDrawer } from './components/ChatDrawer';
import { ParticleSystemHandle } from './components/ParticleSystem';
import {
  Crown,
  Sparkles,
  Home,
  ArrowLeft,
  ShieldAlert,
  Sliders,
  Users,
  Share2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  MessageSquare,
  Handshake,
  Flag,
  AlertCircle,
  X,
} from 'lucide-react';

export default function App() {
  // Check if autostart query param is present
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  // Check if room query param is present
  // Only well-formed chamber codes are accepted from the URL (anything else is ignored).
  const initialUrlRoom =
    typeof window !== 'undefined'
      ? normalizeRoomCode(new URLSearchParams(window.location.search).get('room') || '')
      : null;

  const [hasStarted, setHasStarted] = useState<boolean>(isAutostart);
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position;
    to: Position;
    captured?: Move['captured'];
    isCastle?: Move['isCastle'];
  } | null>(null);

  // Settings & Modes
  const [gameMode, setGameMode] = useState<GameMode>(initialUrlRoom ? 'room' : 'room');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [themeId, setThemeId] = useState<ThemeId>('diamond-ruby');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [is3DTilted, setIs3DTilted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.getMuted());
  const [volume, setVolume] = useState<number>(() => soundEngine.getVolume());
  const [intensity, setIntensity] = useState<AnimationIntensity>('epic');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Room Lobby & Online Multiplayer State
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(Boolean(initialUrlRoom));
  const [urlRoomCode, setUrlRoomCode] = useState<string | undefined>(
    initialUrlRoom ? initialUrlRoom.toUpperCase() : undefined
  );
  const [activeRoomSession, setActiveRoomSession] = useState<{
    roomId: string;
    token: string;
    playerId: string;
    color: PieceColor | 'spectator';
    isHost: boolean;
    room: RoomData;
  } | null>(null);
  const [isOpponentConnected, setIsOpponentConnected] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [rematchToast, setRematchToast] = useState<string | null>(null);
  const [copiedHeaderLink, setCopiedHeaderLink] = useState<boolean>(false);
  const [drawOfferToast, setDrawOfferToast] = useState<{ byId: string; byColor: PieceColor } | null>(null);
  const [drawDeclinedNotice, setDrawDeclinedNotice] = useState<string | null>(null);
  const [myDrawOfferSent, setMyDrawOfferSent] = useState<boolean>(false);

  // Real-Time Chat & Emoji Reactions State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [emojiBursts, setEmojiBursts] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const isChatOpenRef = useRef(isChatOpen);
  isChatOpenRef.current = isChatOpen;

  const triggerEmojiBurst = useCallback((emoji: string) => {
    const burstCount = 6;
    const items = Array.from({ length: burstCount }).map((_, i) => ({
      id: `burst_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      left: 15 + Math.random() * 70, // % across screen width
    }));
    setEmojiBursts(prev => [...prev, ...items]);
    setTimeout(() => {
      setEmojiBursts(prev => prev.filter(b => !items.some(it => it.id === b.id)));
    }, 2400);
  }, []);

  const roomSocketRef = useRef<RoomSocketController | null>(null);
  const isLocalMoveInitiatedRef = useRef<boolean>(false);

  // Animation & Cinematic State
  const [activeAnimation, setActiveAnimation] = useState<ActiveAnimation | null>(null);
  const [pendingCommittedMove, setPendingCommittedMove] = useState<Move | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const particleRef = useRef<ParticleSystemHandle | null>(null);

  // Clock
  const [clockMinutes, setClockMinutes] = useState<number>(10);
  const [whiteTime, setWhiteTime] = useState<number>(10 * 60);
  const [blackTime, setBlackTime] = useState<number>(10 * 60);
  const [timeoutWinner, setTimeoutWinner] = useState<'w' | 'b' | null>(null);

  // AI & Stockfish Engine State
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [engineSearchInfo, setEngineSearchInfo] = useState<EngineInfoUpdate | null>(null);
  const [engineNotice, setEngineNotice] = useState<{ reason: string; engineName: string } | null>(null);
  const [engineName, setEngineName] = useState<string>(stockfishEngine.getEngineName());
  const [isVictoryDismissed, setIsVictoryDismissed] = useState<boolean>(false);

  const activeTheme = THEMES[themeId];
  const capturedPieces: CapturedPieces = getCapturedPieces(gameState.history);
  const lastMove: Move | null =
    gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;

  const isGameOver =
    Boolean(timeoutWinner) ||
    Boolean(gameState.winner) ||
    Boolean(gameState.resignedBy) ||
    gameState.isCheckmate ||
    gameState.isStalemate ||
    gameState.isDraw;

  // Background floating stars
  const starsRef = useRef<{ x: number; y: number; delay: number; size: number }[]>([]);
  if (starsRef.current.length === 0) {
    for (let i = 0; i < 40; i++) {
      starsRef.current.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 8,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  // Clock countdown timer (local tick)
  useEffect(() => {
    if (!hasStarted || isGameOver || clockMinutes === 0) return;

    const timer = setInterval(() => {
      if (gameState.turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            setTimeoutWinner('b');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            setTimeoutWinner('w');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isGameOver, clockMinutes, gameState.turn]);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isFlippedRef = useRef(isFlipped);
  isFlippedRef.current = isFlipped;

  const activeThemeRef = useRef(activeTheme);
  activeThemeRef.current = activeTheme;

  const activeAnimationRef = useRef<ActiveAnimation | null>(activeAnimation);
  activeAnimationRef.current = activeAnimation;

  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;

  const isAiThinkingRef = useRef(isAiThinking);
  isAiThinkingRef.current = isAiThinking;

  const pendingCommittedMoveRef = useRef<Move | null>(null);
  const triggerComputerMoveRef = useRef<(state: GameState) => void>(() => {});

  // Subscribe to Stockfish engine status and fallback notices
  useEffect(() => {
    const unsubInfo = stockfishEngine.addInfoListener(info => {
      setEngineSearchInfo(prev => ({ ...prev, ...info }));
    });
    const unsubStatus = stockfishEngine.addStatusListener(name => {
      setEngineName(name);
    });
    const unsubFallback = stockfishEngine.addFallbackListener(notice => {
      setEngineNotice(notice);
      setEngineName(notice.engineName);
    });
    return () => {
      unsubInfo();
      unsubStatus();
      unsubFallback();
    };
  }, []);

  // Launch Magical Piece Movement Animation
  const startPieceAnimation = useCallback(
    (move: Move) => {
      // Is this the first move of the match?
      if (gameStateRef.current.history.length === 0) {
        soundEngine.playFirstMove();
        particleRef.current?.emitBoardWake();
      }

      // Check if move is Brilliant (e.g. piece takes higher value or delivers checkmate)
      const isBrilliant = Boolean(
        (move.captured &&
          PIECE_VALUES[move.captured.type] >= PIECE_VALUES[move.piece.type] &&
          move.piece.type !== 'q') ||
          (move.san && move.san.includes('#'))
      );

      // Snappy, silky-smooth tournament-grade animation speed (150-195ms)
      let animDuration = 160;
      if (move.piece.type === 'n') animDuration = 195; // swift spring leap
      if (move.piece.type === 'k') animDuration = 175; // royal glide
      if (move.piece.type === 'r') animDuration = 150; // sharp slide
      if (intensity === 'minimal') animDuration = 90;

      // In PvC mode, if White is moving, trigger Stockfish evaluation immediately in parallel
      if (
        gameMode === 'pvc' &&
        gameStateRef.current.turn === 'w' &&
        !isGameOverRef.current
      ) {
        const anticipatedState = makeMove(gameStateRef.current, move);
        if (
          anticipatedState.turn === 'b' &&
          !anticipatedState.isCheckmate &&
          !anticipatedState.isDraw
        ) {
          triggerComputerMoveRef.current(anticipatedState);
        }
      }

      // Handle Castling secondary rook
      let secondaryMove: ActiveAnimation['secondaryMove'];
      if (move.isCastle === 'kingside') {
        const rank = move.from.row;
        const rook = gameStateRef.current.board[rank][7];
        if (rook) {
          secondaryMove = {
            fromCoord: { col: 7, row: rank },
            toCoord: { col: 5, row: rank },
            piece: rook,
          };
          // Castling light thread between king and rook
          const kCol = isFlippedRef.current ? 7 - move.from.col : move.from.col;
          const rCol = isFlippedRef.current ? 0 : 7;
          const kRow = isFlippedRef.current ? 7 - move.from.row : move.from.row;
          particleRef.current?.emitCastlingThread(
            ((kCol + 0.5) / 8) * 100,
            ((kRow + 0.5) / 8) * 100,
            ((rCol + 0.5) / 8) * 100,
            ((kRow + 0.5) / 8) * 100,
            activeThemeRef.current
          );
        }
      } else if (move.isCastle === 'queenside') {
        const rank = move.from.row;
        const rook = gameStateRef.current.board[rank][0];
        if (rook) {
          secondaryMove = {
            fromCoord: { col: 0, row: rank },
            toCoord: { col: 3, row: rank },
            piece: rook,
          };
        }
      }

      const isQueenCapture = Boolean(move.captured && move.captured.type === 'q');

      // Trigger rumble for Rook or Queen capture
      if (move.piece.type === 'r' || isQueenCapture) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 240);
      }

      setPendingCommittedMove(move);
      pendingCommittedMoveRef.current = move;
      setActiveAnimation({
        id: `move-${Date.now()}`,
        move,
        startTime: Date.now(),
        duration: animDuration,
        fromCoord: { col: move.from.col, row: move.from.row },
        toCoord: { col: move.to.col, row: move.to.row },
        secondaryMove,
        isCapture: Boolean(move.captured),
        isQueenCapture,
        isPromotion: Boolean(move.promotion),
        promotionType: move.promotion,
        isCastle: move.isCastle,
        isEnPassant: move.isEnPassant,
        isBrilliant,
      });

      setSelectedPos(null);
      setLegalMovesForSelected([]);
    },
    [intensity, gameMode]
  );

  // Complete animation & synchronize with game state and server
  const handleAnimationComplete = useCallback(() => {
    const completedMove =
      pendingCommittedMoveRef.current ||
      pendingCommittedMove ||
      activeAnimationRef.current?.move;

    // Always clear active animation to guarantee UI is never locked
    setActiveAnimation(null);
    setPendingCommittedMove(null);
    pendingCommittedMoveRef.current = null;

    if (!completedMove) return;

    setGameState(curr => {
      const nextState = makeMove(curr, completedMove);
      gameStateRef.current = nextState;
      if (nextState.isCheck && !nextState.isCheckmate) {
        soundEngine.playHeartbeat();
        const kingPos = nextState.turn === 'w' ? { row: 7, col: 4 } : { row: 0, col: 4 };
        const kCol = isFlippedRef.current ? 7 - kingPos.col : kingPos.col;
        const kRow = isFlippedRef.current ? 7 - kingPos.row : kingPos.row;
        particleRef.current?.emitCheckPulse(
          ((kCol + 0.5) / 8) * 100,
          ((kRow + 0.5) / 8) * 100
        );
      } else if (nextState.isCheckmate) {
        soundEngine.playVictory();
      }
      return nextState;
    });

    // If this move was initiated by the local user, send it to the server room
    if (isLocalMoveInitiatedRef.current && gameMode === 'room' && roomSocketRef.current) {
      roomSocketRef.current.sendMove(completedMove);
    }
    isLocalMoveInitiatedRef.current = false;
  }, [pendingCommittedMove, gameMode]);

  const startPieceAnimationRef = useRef(startPieceAnimation);
  startPieceAnimationRef.current = startPieceAnimation;

  // Real-Time Room Controller Connection
  useEffect(() => {
    if (!activeRoomSession || gameMode !== 'room') {
      roomSocketRef.current?.destroy();
      roomSocketRef.current = null;
      return;
    }

    const { roomId, token, playerId, color } = activeRoomSession;
    const socket = new RoomSocketController(roomId, token);
    roomSocketRef.current = socket;

    socket.onConnectionChange = connected => {
      setIsSocketConnected(connected);
    };

    socket.onRoomState = room => {
      // Update opponent presence
      const opp = color === 'w' ? room.blackPlayer : room.whitePlayer;
      setIsOpponentConnected(Boolean(opp?.connected));

      // Reconcile clocks if provided
      if (room.whiteTime >= 0) setWhiteTime(room.whiteTime);
      if (room.blackTime >= 0) setBlackTime(room.blackTime);

      // Reconcile board state if ahead of client
      if (
        room.gameState &&
        room.gameState.history.length > gameStateRef.current.history.length &&
        !pendingCommittedMove
      ) {
        const nextMove = room.gameState.history[gameStateRef.current.history.length];
        if (nextMove) {
          isLocalMoveInitiatedRef.current = false;
          startPieceAnimationRef.current(nextMove);
        } else {
          setGameState(room.gameState);
        }
      }

      // Sync room chat messages
      if (room.messages && room.messages.length > 0) {
        setChatMessages(room.messages);
      }

      // Reconcile status and verdicts
      if (room.status === 'finished') {
        if (room.resignedById) {
          const resignedColor = room.whitePlayer?.id === room.resignedById ? 'w' : 'b';
          const winnerColor = resignedColor === 'w' ? 'b' : 'w';
          setGameState(prev => ({
            ...prev,
            winner: winnerColor,
            resignedBy: resignedColor,
          }));
          setIsVictoryDismissed(false);
        } else if (room.gameState.isDraw) {
          setGameState(prev => ({
            ...prev,
            isDraw: true,
            drawReason: room.gameState.drawReason || 'mutual-agreement',
            winner: 'draw',
          }));
          setIsVictoryDismissed(false);
        }
      }

      // Check draw offers
      if (room.drawOfferBy && room.drawOfferBy !== playerId) {
        setDrawOfferToast({
          byId: room.drawOfferBy,
          byColor: color === 'w' ? 'b' : 'w',
        });
      } else if (!room.drawOfferBy) {
        setDrawOfferToast(null);
        setMyDrawOfferSent(false);
      } else if (room.drawOfferBy === playerId) {
        setMyDrawOfferSent(true);
      }
    };

    socket.onMatchResigned = payload => {
      const { resignedColor, winner } = payload;
      setDrawOfferToast(null);
      setMyDrawOfferSent(false);
      setGameState(prev => ({
        ...prev,
        winner,
        resignedBy: resignedColor,
      }));
      setIsVictoryDismissed(false);
      soundEngine.playLanding('k');
    };

    socket.onDrawOffered = payload => {
      if (payload.byId !== playerId) {
        setDrawOfferToast(payload);
        soundEngine.playPickup();
      } else {
        setMyDrawOfferSent(true);
      }
    };

    socket.onDrawAccepted = () => {
      setDrawOfferToast(null);
      setMyDrawOfferSent(false);
      setGameState(prev => ({
        ...prev,
        isDraw: true,
        drawReason: 'mutual-agreement',
        winner: 'draw',
      }));
      setIsVictoryDismissed(false);
      soundEngine.playLanding('k');
    };

    socket.onDrawDeclined = payload => {
      setDrawOfferToast(null);
      setMyDrawOfferSent(false);
      if (payload.byId !== playerId) {
        setDrawDeclinedNotice('Challenger declined the draw offer. The royal duel continues! ⚔️');
        setTimeout(() => setDrawDeclinedNotice(null), 4500);
        soundEngine.playPickup();
      }
    };

    socket.onChatMessage = message => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (message.senderId !== playerId) {
        if (message.isReaction) {
          soundEngine.playReactionPop();
          triggerEmojiBurst(message.text || '👑');
        } else {
          soundEngine.playMessageChime();
        }

        if (!isChatOpenRef.current) {
          setUnreadChatCount(prev => prev + 1);
        }
      }
    };

    socket.onMoveMade = payload => {
      const { move, whiteTime: wt, blackTime: bt } = payload;
      if (wt >= 0) setWhiteTime(wt);
      if (bt >= 0) setBlackTime(bt);

      // If this move is already the last move on client or currently animating, ignore
      const currHist = gameStateRef.current.history;
      const last = currHist.length > 0 ? currHist[currHist.length - 1] : null;
      const isSameAsLast =
        last &&
        last.from.row === move.from.row &&
        last.from.col === move.from.col &&
        last.to.row === move.to.row &&
        last.to.col === move.to.col;

      if (!isSameAsLast && (!pendingCommittedMove || pendingCommittedMove !== move)) {
        isLocalMoveInitiatedRef.current = false;
        startPieceAnimationRef.current(move);
      }
    };

    socket.onPlayerJoined = (player, room) => {
      soundEngine.playLanding('k');
      setIsOpponentConnected(true);
      particleRef.current?.emitBoardWake();
    };

    socket.onPresenceUpdate = (wConn, bConn) => {
      const oppConn = color === 'w' ? bConn : wConn;
      setIsOpponentConnected(oppConn);
    };

    socket.onRematchOffered = byId => {
      if (byId !== playerId) {
        setRematchToast('Challenger requested a Rematch! Click New Game to accept.');
        soundEngine.playPickup();
      }
    };

    socket.onRematchStarted = room => {
      setRematchToast(null);
      setDrawOfferToast(null);
      setDrawDeclinedNotice(null);
      setGameState(getInitialGameState());
      setSelectedPos(null);
      setLegalMovesForSelected([]);
      setActiveAnimation(null);
      setWhiteTime(room.clockMinutes > 0 ? room.clockMinutes * 60 : -1);
      setBlackTime(room.clockMinutes > 0 ? room.clockMinutes * 60 : -1);
      setTimeoutWinner(null);
      setIsVictoryDismissed(false);

      // Re-assign local player color (swapped on rematch)
      const newColor: PieceColor | 'spectator' =
        room.whitePlayer?.id === playerId ? 'w' : room.blackPlayer?.id === playerId ? 'b' : 'spectator';
      setActiveRoomSession(prev => (prev ? { ...prev, color: newColor, room } : null));
      setIsFlipped(newColor === 'b');
      soundEngine.playFirstMove();
    };

    return () => {
      socket.destroy();
    };
  }, [activeRoomSession, gameMode]);

  // Trigger Computer opponent move
  const triggerComputerMove = useCallback(
    (stateToEvaluate: GameState) => {
      if (isAiThinkingRef.current) return;
      isAiThinkingRef.current = true;
      setIsAiThinking(true);

      getComputerMove(stateToEvaluate, difficulty)
        .then(async result => {
          // Wait for any ongoing piece animation to conclude before applying computer move
          while (activeAnimationRef.current) {
            await new Promise(r => setTimeout(r, 16));
          }
          await new Promise(r => setTimeout(r, 20));

          const currentG = gameStateRef.current;
          const isFinished = Boolean(currentG.winner) || currentG.isCheckmate || currentG.isDraw;

          if (result?.move && currentG.turn === 'b' && !isFinished) {
            isLocalMoveInitiatedRef.current = true;
            startPieceAnimationRef.current(result.move);
          }
        })
        .catch(err => {
          console.error('Computer engine move error:', err);
        })
        .finally(() => {
          isAiThinkingRef.current = false;
          setIsAiThinking(false);
          setEngineSearchInfo(null);
        });
    },
    [difficulty]
  );
  triggerComputerMoveRef.current = triggerComputerMove;

  // Fallback trigger for computer move when it's Black's turn in PvC mode
  useEffect(() => {
    if (
      hasStarted &&
      gameMode === 'pvc' &&
      gameState.turn === 'b' &&
      !isGameOver &&
      !pendingPromotion &&
      !isAiThinking &&
      !activeAnimation
    ) {
      triggerComputerMove(gameStateRef.current);
    }
  }, [
    hasStarted,
    gameMode,
    gameState.turn,
    isGameOver,
    pendingPromotion,
    isAiThinking,
    activeAnimation,
    triggerComputerMove,
  ]);

  // Handle Square Click
  const handleSquareClick = useCallback(
    (pos: Position) => {
      if (isGameOver || isAiThinking || activeAnimation) return;

      // In PvC mode, human only controls White
      if (gameMode === 'pvc' && gameState.turn !== 'w') return;

      // In Room mode, human only controls their assigned color
      if (gameMode === 'room' && activeRoomSession) {
        if (activeRoomSession.color === 'spectator') return;
        if (gameState.turn !== activeRoomSession.color) return;
      }

      // If clicking a square with own piece, select it with sound
      const piece = gameState.board[pos.row][pos.col];
      if (piece && piece.color === gameState.turn) {
        soundEngine.playPickup();
        setSelectedPos(pos);
        const moves = getLegalMovesForPosition(pos, gameState);
        setLegalMovesForSelected(moves);
        return;
      }

      // If a piece is already selected, check if this is a legal move target
      if (selectedPos) {
        const matchedMove = legalMovesForSelected.find(
          m => m.to.row === pos.row && m.to.col === pos.col
        );

        if (matchedMove) {
          // Check for pawn promotion
          const isPromotion =
            matchedMove.piece.type === 'p' && (pos.row === 0 || pos.row === 7);

          if (isPromotion) {
            setPendingPromotion({
              from: selectedPos,
              to: pos,
              captured: matchedMove.captured,
              isCastle: matchedMove.isCastle,
            });
            return;
          }

          isLocalMoveInitiatedRef.current = true;
          startPieceAnimation(matchedMove);
        } else {
          // Deselect if clicking an empty non-legal square
          setSelectedPos(null);
          setLegalMovesForSelected([]);
        }
      }
    },
    [
      isGameOver,
      isAiThinking,
      activeAnimation,
      gameMode,
      gameState,
      activeRoomSession,
      selectedPos,
      legalMovesForSelected,
      startPieceAnimation,
    ]
  );

  // Handle Drag & Drop move
  const handleMovePiece = useCallback(
    (from: Position, to: Position) => {
      if (isGameOver || isAiThinking || activeAnimation) return;
      if (gameMode === 'pvc' && gameState.turn !== 'w') return;
      if (gameMode === 'room' && activeRoomSession) {
        if (activeRoomSession.color === 'spectator') return;
        if (gameState.turn !== activeRoomSession.color) return;
      }

      const moves = getLegalMovesForPosition(from, gameState);
      const matchedMove = moves.find(m => m.to.row === to.row && m.to.col === to.col);

      if (matchedMove) {
        const isPromotion =
          matchedMove.piece.type === 'p' && (to.row === 0 || to.row === 7);

        if (isPromotion) {
          setPendingPromotion({
            from,
            to,
            captured: matchedMove.captured,
            isCastle: matchedMove.isCastle,
          });
          return;
        }

        isLocalMoveInitiatedRef.current = true;
        startPieceAnimation(matchedMove);
      }
    },
    [
      isGameOver,
      isAiThinking,
      activeAnimation,
      gameMode,
      gameState,
      activeRoomSession,
      startPieceAnimation,
    ]
  );

  // Handle Promotion Selection
  const handleSelectPromotion = (type: PieceType) => {
    if (!pendingPromotion) return;
    const { from, to, captured, isCastle } = pendingPromotion;
    const piece = gameState.board[from.row][from.col];
    if (!piece) return;

    const promoMove: Move = {
      from,
      to,
      piece,
      captured,
      isCastle,
      promotion: type,
    };

    setPendingPromotion(null);
    isLocalMoveInitiatedRef.current = true;
    startPieceAnimation(promoMove);
  };

  // Handle Room Entry from RoomLobbyModal
  const handleEnterRoom = (session: {
    roomId: string;
    token: string;
    playerId: string;
    color: PieceColor | 'spectator';
    isHost: boolean;
    room: RoomData;
  }) => {
    // Clean up previous room socket if any exists
    if (roomSocketRef.current) {
      try {
        roomSocketRef.current.destroy();
      } catch {
        // ignore
      }
      roomSocketRef.current = null;
    }
    stockfishEngine.stop();
    setIsAiThinking(false);
    setEngineSearchInfo(null);

    setActiveRoomSession(session);
    setGameMode('room');
    setThemeId(session.room.themeId as ThemeId);
    setClockMinutes(session.room.clockMinutes);
    setWhiteTime(session.room.whiteTime >= 0 ? session.room.whiteTime : -1);
    setBlackTime(session.room.blackTime >= 0 ? session.room.blackTime : -1);
    setTimeoutWinner(null);
    setDrawOfferToast(null);
    setDrawDeclinedNotice(null);
    setMyDrawOfferSent(false);
    setRematchToast(null);

    const initialBoard = session.room.gameState || getInitialGameState();
    setGameState(initialBoard);
    gameStateRef.current = initialBoard;

    setSelectedPos(null);
    setLegalMovesForSelected([]);
    setActiveAnimation(null);
    activeAnimationRef.current = null;
    setPendingCommittedMove(null);
    pendingCommittedMoveRef.current = null;
    setPendingPromotion(null);
    isLocalMoveInitiatedRef.current = false;
    setIsVictoryDismissed(false);

    // If player is Black, flip the board so their pieces are at the bottom
    setIsFlipped(session.color === 'b');

    // Check initial opponent status
    const opp = session.color === 'w' ? session.room.blackPlayer : session.room.whitePlayer;
    setIsOpponentConnected(Boolean(opp?.connected));

    if (session.room.messages) {
      setChatMessages(session.room.messages);
    } else {
      setChatMessages([]);
    }
    setUnreadChatCount(0);
    setIsChatOpen(false);

    setIsRoomLobbyOpen(false);
    setHasStarted(true);
  };

  const handleSendChatMessage = useCallback(
    (payload: { text?: string; imageUrl?: string; isReaction?: boolean }) => {
      if (!activeRoomSession || !roomSocketRef.current) return;
      roomSocketRef.current.sendChatMessage(payload);
    },
    [activeRoomSession]
  );

  // Standard Local Start
  const handleStartGame = (config: {
    mode: GameMode;
    difficulty: AiDifficulty;
    themeId: ThemeId;
    clockMinutes: number;
  }) => {
    // If a room connection was active, tear it down completely
    if (roomSocketRef.current) {
      try {
        roomSocketRef.current.destroy();
      } catch {
        // ignore
      }
      roomSocketRef.current = null;
    }
    setActiveRoomSession(null);
    setIsChatOpen(false);
    setChatMessages([]);
    setUnreadChatCount(0);
    setIsSocketConnected(false);
    setIsOpponentConnected(false);

    setGameMode(config.mode);
    setDifficulty(config.difficulty);
    setThemeId(config.themeId);
    setClockMinutes(config.clockMinutes);
    setWhiteTime(config.clockMinutes > 0 ? config.clockMinutes * 60 : -1);
    setBlackTime(config.clockMinutes > 0 ? config.clockMinutes * 60 : -1);
    setTimeoutWinner(null);
    setDrawOfferToast(null);
    setDrawDeclinedNotice(null);
    setMyDrawOfferSent(false);
    setRematchToast(null);
    stockfishEngine.stop();
    setIsAiThinking(false);
    setEngineSearchInfo(null);

    const initialBoard = getInitialGameState();
    setGameState(initialBoard);
    gameStateRef.current = initialBoard;

    setSelectedPos(null);
    setLegalMovesForSelected([]);
    setActiveAnimation(null);
    activeAnimationRef.current = null;
    setPendingCommittedMove(null);
    pendingCommittedMoveRef.current = null;
    setPendingPromotion(null);
    isLocalMoveInitiatedRef.current = false;
    setIsVictoryDismissed(false);
    setHasStarted(true);
  };

  // Dedicated Return to Main Menu handler: cleans up sockets, chat, engines, and resets state
  const handleReturnToMenu = useCallback(() => {
    // 1. Destroy and disconnect room socket
    if (roomSocketRef.current) {
      try {
        roomSocketRef.current.destroy();
      } catch {
        // ignore
      }
      roomSocketRef.current = null;
    }

    // 2. Stop Stockfish engine and AI state
    stockfishEngine.stop();
    setIsAiThinking(false);
    setEngineSearchInfo(null);

    // 3. Clear room session and close chat
    setActiveRoomSession(null);
    setIsChatOpen(false);
    setChatMessages([]);
    setUnreadChatCount(0);
    setIsSocketConnected(false);
    setIsOpponentConnected(false);

    // 4. Reset game state and transient indicators
    setSelectedPos(null);
    setLegalMovesForSelected([]);
    setActiveAnimation(null);
    activeAnimationRef.current = null;
    setPendingCommittedMove(null);
    pendingCommittedMoveRef.current = null;
    setPendingPromotion(null);
    isLocalMoveInitiatedRef.current = false;
    setDrawOfferToast(null);
    setDrawDeclinedNotice(null);
    setMyDrawOfferSent(false);
    setRematchToast(null);
    setTimeoutWinner(null);
    setIsVictoryDismissed(false);

    // 5. Reset to fresh initial game state so canResume won't falsely hold previous room moves
    const initialBoard = getInitialGameState();
    setGameState(initialBoard);
    gameStateRef.current = initialBoard;

    // 6. Reset clock times
    setWhiteTime(clockMinutes > 0 ? clockMinutes * 60 : -1);
    setBlackTime(clockMinutes > 0 ? clockMinutes * 60 : -1);

    // 7. Return to menu
    setHasStarted(false);
  }, [clockMinutes]);

  const handleNewGame = () => {
    setDrawOfferToast(null);
    setDrawDeclinedNotice(null);
    setMyDrawOfferSent(false);

    if (gameMode === 'room' && activeRoomSession) {
      roomSocketRef.current?.requestRematch();
      setRematchToast('Rematch proposed! Awaiting opponent to accept...');
      return;
    }

    stockfishEngine.stop();
    setIsAiThinking(false);
    setEngineSearchInfo(null);
    setGameState(getInitialGameState());
    setSelectedPos(null);
    setLegalMovesForSelected([]);
    setActiveAnimation(null);
    setWhiteTime(clockMinutes > 0 ? clockMinutes * 60 : -1);
    setBlackTime(clockMinutes > 0 ? clockMinutes * 60 : -1);
    setTimeoutWinner(null);
    setIsVictoryDismissed(false);
  };

  const handleResign = () => {
    if (isGameOver) return;
    if (gameMode === 'pvc') {
      // White is human monarch, Black is AI
      setGameState(prev => ({ ...prev, winner: 'b', resignedBy: 'w' }));
      setIsVictoryDismissed(false);
      soundEngine.playLanding('k');
      return;
    }
    if (gameMode === 'room' && activeRoomSession) {
      roomSocketRef.current?.resign();
      const myColor = activeRoomSession.color === 'b' ? 'b' : 'w';
      const winnerColor = myColor === 'w' ? 'b' : 'w';
      setGameState(prev => ({ ...prev, winner: winnerColor, resignedBy: myColor }));
      setIsVictoryDismissed(false);
      soundEngine.playLanding('k');
    }
  };

  const handleOfferDraw = () => {
    if (isGameOver || gameMode !== 'room' || !activeRoomSession) return;
    setMyDrawOfferSent(true);
    roomSocketRef.current?.offerDraw();
    soundEngine.playPickup();
  };

  const handleAcceptDraw = () => {
    if (isGameOver || gameMode !== 'room' || !activeRoomSession) return;
    roomSocketRef.current?.acceptDraw();
    setDrawOfferToast(null);
    setMyDrawOfferSent(false);
  };

  const handleDeclineDraw = () => {
    if (isGameOver || gameMode !== 'room' || !activeRoomSession) return;
    roomSocketRef.current?.declineDraw();
    setDrawOfferToast(null);
    setMyDrawOfferSent(false);
  };

  const handleUndo = () => {
    if (gameMode === 'room') return; // Undo is disabled in multiplayer rooms for fairness
    if (gameState.history.length === 0 || isAiThinking || activeAnimation) return;

    stockfishEngine.stop();
    setIsAiThinking(false);
    setEngineSearchInfo(null);

    let next = undoLastMove(gameState);
    if (gameMode === 'pvc' && next.turn === 'b' && next.history.length > 0) {
      next = undoLastMove(next);
    }

    setGameState(next);
    setSelectedPos(null);
    setLegalMovesForSelected([]);
    setActiveAnimation(null);
    setTimeoutWinner(null);
    setIsVictoryDismissed(false);
  };

  const handleToggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleChangeVolume = (vol: number) => {
    soundEngine.setVolume(vol);
    setVolume(vol);
  };

  // Copy chamber invite link from header
  const handleCopyHeaderLink = () => {
    if (!activeRoomSession) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/?room=${encodeURIComponent(activeRoomSession.roomId)}`;
    navigator.clipboard.writeText(link);
    setCopiedHeaderLink(true);
    soundEngine.playPickup();
    setTimeout(() => setCopiedHeaderLink(false), 2200);
  };

  return (
    <div className="relative min-h-screen bg-[#07040d] text-amber-100 flex flex-col justify-between overflow-x-hidden">
      {/* Luxurious Reactive Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep Royal Velvet Gradient */}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background: gameState.isCheck
              ? 'radial-gradient(ellipse at 50% 20%, #2b0819 0%, #0d0617 50%, #050209 100%)'
              : 'radial-gradient(ellipse at 50% 20%, #1a0b2e 0%, #0d0617 50%, #050209 100%)',
          }}
        />

        {/* Ambient Jewel Tone Glows */}
        <div
          className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full blur-[130px] opacity-25 pointer-events-none transition-all duration-700"
          style={{
            backgroundColor: gameState.isCheck ? '#ef4444' : activeTheme.primaryAccent,
            transform: gameState.isCheck ? 'scale(1.2)' : 'scale(1)',
          }}
        />
        <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] rounded-full blur-[140px] opacity-20 bg-amber-600 pointer-events-none" />

        {/* Floating Twinkling Stars */}
        {starsRef.current.map((star, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-white animate-float"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
            }}
          />
        ))}
      </div>

      {/* Start Screen Modal if not yet launched */}
      {!hasStarted && (
        <StartScreen
          onStartGame={handleStartGame}
          onOpenRoomLobby={() => setIsRoomLobbyOpen(true)}
          initialTheme={themeId}
          canResume={gameState.history.length > 0 && !isGameOver}
          onResume={() => setHasStarted(true)}
        />
      )}

      {/* Main Playing View */}
      {hasStarted && (
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header Bar */}
          <header className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-amber-500/20 bg-black/45 backdrop-blur-md flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handleReturnToMenu}
                title="Return to Main Menu"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-white/5 hover:bg-amber-500/20 text-amber-200 hover:text-amber-100 transition-all cursor-pointer text-xs font-serif font-semibold shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span className="hidden xs:inline">← Back to Menu</span>
                <span className="xs:hidden">← Back</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Crown className="w-5 h-5 text-amber-400 drop-shadow-sm" />
                <span className="font-serif font-bold text-sm sm:text-base text-amber-100 tracking-wider">
                  CROWN & CARAT
                </span>
              </div>
            </div>

            {/* Room Chamber Status Pill (if in Room mode) */}
            {gameMode === 'room' && activeRoomSession && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Chamber Code & Copy Button */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/40 bg-[#120a1c]/90 text-xs">
                  <span className="font-serif text-amber-300/80 text-[10px] uppercase font-bold hidden sm:inline">
                    Chamber:
                  </span>
                  <span className="font-mono font-bold text-amber-100 text-xs">
                    {activeRoomSession.roomId}
                  </span>
                  <button
                    onClick={handleCopyHeaderLink}
                    title="Copy Invite Link"
                    className="p-0.5 rounded text-amber-300 hover:text-white transition-all cursor-pointer"
                  >
                    {copiedHeaderLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsRoomLobbyOpen(true)}
                    title="Share Room to Social Media"
                    className="p-0.5 rounded text-amber-300 hover:text-white transition-all cursor-pointer ml-0.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Opponent Connection Indicator */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-serif transition-all ${
                    isOpponentConnected
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-950/40 text-amber-300 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOpponentConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                    }`}
                  />
                  <span>
                    {isOpponentConnected ? 'Challenger In Chamber' : 'Awaiting Challenger...'}
                  </span>
                </div>
              </div>
            )}

            {/* Turn Status Pill with Luminous Glow */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-[#120a1c]/80 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              {/* Jewel turn dot */}
              <div
                className={`w-3 h-3 rounded-full border border-white/60 animate-pulse ${
                  gameState.turn === 'w'
                    ? 'bg-white shadow-[0_0_8px_#ffffff]'
                    : 'bg-red-700 shadow-[0_0_8px_#ff4d6d]'
                }`}
              />

              <span className="font-serif text-xs font-semibold text-amber-100 flex items-center gap-1.5">
                {isGameOver ? (
                  'Match Concluded'
                ) : isAiThinking ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    <span>Computer is thinking...</span>
                  </>
                ) : gameMode === 'room' && activeRoomSession ? (
                  gameState.turn === activeRoomSession.color ? (
                    'Your Stroke'
                  ) : (
                    "Challenger's Stroke"
                  )
                ) : (
                  `${gameState.turn === 'w' ? 'White' : 'Black'}'s Move`
                )}
              </span>

              {gameState.isCheck && !gameState.isCheckmate && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 animate-pulse ml-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  CHECK!
                </span>
              )}
            </div>

            {/* Header Settings and Theme Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-serif text-amber-300/80 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeTheme.name}</span>
              </div>

              {gameMode === 'room' && activeRoomSession && (
                <button
                  onClick={() => {
                    setIsChatOpen(prev => {
                      if (!prev) setUnreadChatCount(0);
                      return !prev;
                    });
                  }}
                  title="Toggle Royal Chamber Dispatch (Chat)"
                  aria-label="Toggle chat dispatch"
                  className={`relative p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isChatOpen
                      ? 'border-amber-400 bg-amber-500/30 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline text-xs font-serif font-semibold">Dispatch</span>
                  {unreadChatCount > 0 && !isChatOpen && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold animate-bounce shadow">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Animation & Audio Settings"
                aria-label="Open settings"
                className="p-1.5 rounded-lg border border-amber-500/30 bg-white/5 hover:bg-amber-500/20 text-amber-200 transition-all cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          </header>

          {/* Stockfish Engine Fallback Notice */}
          {engineNotice && (
            <div className="bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-amber-950/95 border-b border-amber-500/50 py-2 px-4 text-center text-xs font-serif text-amber-200 flex items-center justify-center gap-2.5 shadow-md z-20 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{engineNotice.reason}</span>
              <button
                onClick={() => setEngineNotice(null)}
                className="ml-2 p-1 text-amber-400/80 hover:text-white rounded cursor-pointer transition-colors"
                title="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Royal Draw Offer Banner */}
          {drawOfferToast && (
            <div className="bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-amber-950/95 border-b border-amber-500/50 py-2.5 px-4 text-center text-xs sm:text-sm font-serif text-amber-100 flex items-center justify-center gap-3 flex-wrap animate-fadeIn shadow-lg z-20">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-semibold">
                  {drawOfferToast.byColor === 'w' ? 'White Monarch' : 'Black Monarch'} extends an honorable Offer of Draw.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptDraw}
                  className="px-3 py-1 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  Accept Draw
                </button>
                <button
                  onClick={handleDeclineDraw}
                  className="px-3 py-1 rounded border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-200 font-semibold text-xs transition-all cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Draw Declined Notice Banner */}
          {drawDeclinedNotice && (
            <div className="bg-rose-950/60 border-b border-rose-500/40 py-2 px-4 text-center text-xs font-serif text-rose-200 flex items-center justify-center gap-2 animate-fadeIn z-20">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>{drawDeclinedNotice}</span>
            </div>
          )}

          {/* Rematch toast banner */}
          {rematchToast && (
            <div className="bg-amber-500/20 border-b border-amber-500/40 py-1.5 px-4 text-center text-xs font-serif text-amber-200 flex items-center justify-center gap-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{rematchToast}</span>
              <button
                onClick={handleNewGame}
                className="ml-2 px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] uppercase transition-all cursor-pointer"
              >
                Accept Rematch
              </button>
            </div>
          )}

          {/* Main Gameplay Layout */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Center Area: Board & Captured Trays */}
            <div className="lg:col-span-8 flex flex-col items-center">
              {/* Opponent's Tray */}
              <div className="w-full max-w-[540px] mb-2">
                <CapturedTray
                  captured={capturedPieces}
                  theme={activeTheme}
                  forColor={isFlipped ? 'w' : 'b'}
                  playerName={
                    isFlipped
                      ? 'White Monarch'
                      : gameMode === 'pvc'
                      ? `AI (${difficulty})`
                      : gameMode === 'room'
                      ? 'Opponent Challenger'
                      : 'Black Monarch'
                  }
                />
              </div>

              {/* Computer is thinking... Gem-Themed Shimmer Animation */}
              {isAiThinking && (
                <div className="w-full max-w-[540px] mb-2 px-4 py-2.5 rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-950/90 via-[#180d26]/95 to-amber-950/90 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-md flex items-center justify-between gap-3 overflow-hidden relative animate-fadeIn">
                  {/* Gemstone iridescent shimmer wave */}
                  <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-amber-300/25 to-transparent animate-gemShimmer pointer-events-none" />

                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-sm animate-ping" />
                    </div>
                    <div className="text-left">
                      <span className="font-serif font-bold text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 tracking-wide block">
                        Computer is thinking...
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-sans flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-amber-200">{engineName}</span>
                        {engineSearchInfo?.depth ? (
                          <span className="text-amber-300 font-mono font-bold">
                            • Depth {engineSearchInfo.depth}
                          </span>
                        ) : null}
                        <span>• Calculating optimal moves</span>
                      </span>
                    </div>
                  </div>

                  {/* Pulsing Gem Crystal Shimmer Dots */}
                  <div className="flex items-center gap-1 relative z-10 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-bounce" />
                  </div>
                </div>
              )}

              {/* The Master Jewel Chess Board with Motion Controller */}
              <div className="w-full flex justify-center my-1">
                <Board
                  board={gameState.board}
                  theme={activeTheme}
                  turn={gameState.turn}
                  isCheck={gameState.isCheck}
                  isCheckmate={gameState.isCheckmate}
                  selectedPos={selectedPos}
                  legalMovesForSelected={legalMovesForSelected}
                  lastMove={lastMove}
                  isFlipped={isFlipped}
                  is3DTilted={is3DTilted}
                  isShaking={isShaking}
                  intensity={intensity}
                  activeAnimation={activeAnimation}
                  particleRef={particleRef}
                  onAnimationComplete={handleAnimationComplete}
                  onSquareClick={handleSquareClick}
                  onMovePiece={handleMovePiece}
                />
              </div>

              {/* Player's Tray */}
              <div className="w-full max-w-[540px] mt-2">
                <CapturedTray
                  captured={capturedPieces}
                  theme={activeTheme}
                  forColor={isFlipped ? 'b' : 'w'}
                  playerName={
                    isFlipped
                      ? gameMode === 'room'
                        ? 'You (Imperial Ruby)'
                        : 'Black Monarch'
                      : gameMode === 'room'
                      ? 'You (White Diamond)'
                      : 'White Monarch'
                  }
                />
              </div>
            </div>

            {/* Side Area: Clocks, History & Controls */}
            <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-4 w-full max-w-[540px] mx-auto lg:max-w-none">
              {/* Dual Chess Clocks */}
              <ChessClock
                whiteTime={whiteTime}
                blackTime={blackTime}
                activeColor={gameState.turn}
                isGameActive={hasStarted && !isGameOver}
              />

              {/* Move History Chronicle */}
              <MoveHistory history={gameState.history} />

              {/* Controls and Theme Switcher */}
              <Controls
                mode={gameMode}
                difficulty={difficulty}
                themeId={themeId}
                isMuted={isMuted}
                is3DTilted={is3DTilted}
                clockMinutes={clockMinutes}
                canUndo={
                  gameMode !== 'room' && gameState.history.length > 0 && !activeAnimation
                }
                isAiThinking={isAiThinking}
                engineName={engineName}
                roomId={activeRoomSession?.roomId}
                hasStarted={hasStarted}
                isGameOver={isGameOver}
                isDrawOfferedByMe={myDrawOfferSent}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenRoomLobby={() => setIsRoomLobbyOpen(true)}
                onToggleChat={() => {
                  setIsChatOpen(prev => {
                    if (!prev) setUnreadChatCount(0);
                    return !prev;
                  });
                }}
                onResign={handleResign}
                onOfferDraw={gameMode === 'room' ? handleOfferDraw : undefined}
                onSetMode={m => {
                  if (m === 'room') {
                    setIsRoomLobbyOpen(true);
                  } else {
                    setGameMode(m);
                  }
                }}
                onSetDifficulty={setDifficulty}
                onSetTheme={setThemeId}
                onToggleSound={handleToggleSound}
                onToggle3D={() => setIs3DTilted(prev => !prev)}
                onFlipBoard={() => setIsFlipped(prev => !prev)}
                onUndo={handleUndo}
                onNewGame={handleNewGame}
                onReturnToMenu={handleReturnToMenu}
              />
            </div>
          </main>
        </div>
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PromotionDialog
          color={gameState.turn}
          theme={activeTheme}
          onSelect={handleSelectPromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      {/* Victory Celebration Modal */}
      {isGameOver && !isVictoryDismissed && (
        <VictoryModal
          gameState={gameState}
          theme={activeTheme}
          timeoutWinner={timeoutWinner || undefined}
          onPlayAgain={handleNewGame}
          onReturnToMenu={handleReturnToMenu}
          onDismiss={() => setIsVictoryDismissed(true)}
        />
      )}

      {/* Room Lobby & Share Modal */}
      <RoomLobbyModal
        isOpen={isRoomLobbyOpen}
        onClose={() => setIsRoomLobbyOpen(false)}
        initialTheme={themeId}
        defaultClockMinutes={clockMinutes}
        initialRoomCode={urlRoomCode}
        onEnterRoom={handleEnterRoom}
      />

      {/* Royal Settings & Animation Intensity Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        intensity={intensity}
        onChangeIntensity={setIntensity}
        isMuted={isMuted}
        onToggleMute={handleToggleSound}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        is3DTilted={is3DTilted}
        onToggle3D={() => setIs3DTilted(prev => !prev)}
        themeId={themeId}
        onSetTheme={setThemeId}
      />

      {/* Floating Chat Dispatch Trigger (only when match is active in Room mode) */}
      {hasStarted && gameMode === 'room' && activeRoomSession && !isChatOpen && (
        <button
          onClick={() => {
            setIsChatOpen(true);
            setUnreadChatCount(0);
          }}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 font-serif font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 border-2 border-amber-300 transition-all cursor-pointer animate-fadeIn"
          title="Open Royal Chamber Dispatch"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Dispatch</span>
          {unreadChatCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-sans font-extrabold animate-bounce shadow">
              {unreadChatCount}
            </span>
          )}
        </button>
      )}

      {/* Royal Chamber Chat Drawer (only when match is active in Room mode) */}
      {hasStarted && gameMode === 'room' && activeRoomSession && (
        <ChatDrawer
          roomId={activeRoomSession.roomId}
          playerId={activeRoomSession.playerId}
          playerColor={activeRoomSession.color}
          playerName={
            activeRoomSession.color === 'w'
              ? activeRoomSession.room.whitePlayer?.name || 'White Monarch'
              : activeRoomSession.color === 'b'
              ? activeRoomSession.room.blackPlayer?.name || 'Imperial Challenger'
              : 'Royal Spectator'
          }
          opponentName={
            activeRoomSession.color === 'w'
              ? activeRoomSession.room.blackPlayer?.name || 'Imperial Challenger'
              : activeRoomSession.room.whitePlayer?.name || 'White Monarch'
          }
          theme={activeTheme}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          isOpen={isChatOpen}
          onToggleOpen={() => {
            setIsChatOpen(prev => {
              if (!prev) setUnreadChatCount(0);
              return !prev;
            });
          }}
          onEmojiReactionBurst={triggerEmojiBurst}
        />
      )}

      {/* Floating Gem Emoji Bursts Across Screen */}
      {emojiBursts.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {emojiBursts.map(burst => (
            <div
              key={burst.id}
              className="absolute bottom-16 animate-emojiBurst text-4xl sm:text-5xl select-none filter drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"
              style={{ left: `${burst.left}%` }}
            >
              {burst.emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
