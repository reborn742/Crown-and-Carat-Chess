import { AiDifficulty, GameState, Move } from '../game/types';
import { gameStateToFen, uciToMove, getAllLegalMoves } from '../game/chessEngine';
import { getBestMove as getMinimaxBestMove } from '../game/ai';

export interface EngineMoveResult {
  move: Move;
  source: 'stockfish' | 'minimax';
  engineName: string;
  depth?: number;
  timeMs?: number;
}

export interface EngineInfoUpdate {
  depth?: number;
  score?: number | null;
  nodes?: number;
  time?: number;
  pv?: string;
}

export type FallbackListener = (info: { reason: string; engineName: string }) => void;
export type InfoListener = (info: EngineInfoUpdate) => void;

interface PendingSearch {
  state: GameState;
  difficulty: AiDifficulty;
  startTime: number;
  resolve: (res: EngineMoveResult | null) => void;
  reject: (err: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const DIFFICULTY_CONFIG: Record<
  AiDifficulty,
  { skillLevel: number; movetime: number; depthLimit?: number }
> = {
  easy: { skillLevel: 2, movetime: 220, depthLimit: 5 },
  medium: { skillLevel: 10, movetime: 420, depthLimit: 12 },
  hard: { skillLevel: 20, movetime: 800, depthLimit: 18 },
};

class StockfishWorkerController {
  private worker: Worker | null = null;
  private isReady = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private pendingSearch: PendingSearch | null = null;
  private fallbackReason: string | null = null;
  private engineFlavor: 'lite-single' | 'asm' | 'minimax' = 'minimax';
  private fallbackListeners = new Set<FallbackListener>();
  private infoListeners = new Set<InfoListener>();
  private statusListeners = new Set<(name: string) => void>();
  private lastReportedDepth: number = 0;

  constructor() {
    // Proactively initialize worker in browser environment
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      this.init().catch(err => {
        console.warn('Initial Stockfish spawn deferred or failed:', err);
      });
    }
  }

  public addStatusListener(listener: (name: string) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getEngineName());
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus() {
    const name = this.getEngineName();
    for (const listener of this.statusListeners) {
      try {
        listener(name);
      } catch {}
    }
  }

  public addFallbackListener(listener: FallbackListener): () => void {
    this.fallbackListeners.add(listener);
    if (this.fallbackReason) {
      listener({ reason: this.fallbackReason, engineName: 'Royal Minimax' });
    }
    return () => this.fallbackListeners.delete(listener);
  }

  public addInfoListener(listener: InfoListener): () => void {
    this.infoListeners.add(listener);
    return () => this.infoListeners.delete(listener);
  }

  public getEngineName(): string {
    if (this.isReady && this.engineFlavor === 'lite-single') {
      return 'Stockfish 19 Lite WASM';
    }
    if (this.isReady && this.engineFlavor === 'asm') {
      return 'Stockfish 19 ASM-JS';
    }
    return 'Royal Minimax';
  }

  public isUsingStockfish(): boolean {
    return this.isReady && (this.engineFlavor === 'lite-single' || this.engineFlavor === 'asm');
  }

  /**
   * Initialize Stockfish single-threaded lite WASM worker.
   * If WASM worker fails, attempts asm.js fallback before defaulting to internal Minimax.
   */
  public async init(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        this.fallbackReason = 'Web Workers are not supported in this runtime environment';
        this.triggerFallback(this.fallbackReason);
        return false;
      }

      this.isInitializing = true;

      // 1. Primary Attempt: Stockfish 19 Lite Single-threaded WASM
      try {
        const success = await this.spawnWorker('/stockfish/stockfish-19-lite-single.js', 'lite-single');
        if (success) {
          this.isReady = true;
          this.engineFlavor = 'lite-single';
          this.isInitializing = false;
          this.notifyStatus();
          return true;
        }
      } catch (err: any) {
        console.warn('Stockfish WASM lite-single worker load failed:', err);
      }

      // 2. Secondary Attempt: Stockfish 19 ASM.js (pure JS fallback without WASM)
      try {
        const success = await this.spawnWorker('/stockfish/stockfish-19-asm.js', 'asm');
        if (success) {
          this.isReady = true;
          this.engineFlavor = 'asm';
          this.isInitializing = false;
          this.notifyStatus();
          return true;
        }
      } catch (err: any) {
        console.warn('Stockfish ASM-JS worker fallback failed:', err);
      }

      // 3. Fallback: Internal Minimax Engine
      this.isReady = false;
      this.isInitializing = false;
      this.engineFlavor = 'minimax';
      this.notifyStatus();
      this.fallbackReason = 'Stockfish WASM could not be initialized; switched to Royal Minimax.';
      this.triggerFallback(this.fallbackReason);
      return false;
    })();

    return this.initPromise;
  }

  private spawnWorker(scriptUrl: string, flavor: 'lite-single' | 'asm'): Promise<boolean> {
    return new Promise(resolve => {
      let settled = false;
      let w: Worker;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            w.terminate();
          } catch {}
          resolve(false);
        }
      }, 7000);

      try {
        w = new Worker(scriptUrl);
      } catch (err) {
        clearTimeout(timeoutId);
        resolve(false);
        return;
      }

      w.onerror = err => {
        console.warn(`Worker error in ${scriptUrl}:`, err);
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          try {
            w.terminate();
          } catch {}
          resolve(false);
        }
      };

      w.onmessage = ev => {
        const line = typeof ev.data === 'string' ? ev.data.trim() : '';

        if (line.includes('uciok')) {
          w.postMessage('isready');
        } else if (line.includes('readyok')) {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            this.worker = w;
            this.attachWorkerListeners(w);
            resolve(true);
          }
        }
      };

      // Trigger UCI handshake
      w.postMessage('uci');
    });
  }

  private attachWorkerListeners(w: Worker) {
    w.onerror = err => {
      console.error('Active Stockfish worker crashed:', err);
      this.handleSearchError('Stockfish worker encountered an execution error');
    };

    w.onmessage = ev => {
      const line = typeof ev.data === 'string' ? ev.data.trim() : '';
      if (!line) return;

      // Parse engine search info line
      if (line.startsWith('info')) {
        this.parseInfoLine(line);
      }

      // Parse bestmove
      if (line.startsWith('bestmove')) {
        this.handleBestMove(line);
      }
    };
  }

  private parseInfoLine(line: string) {
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const scoreMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const nodesMatch = line.match(/\bnodes\s+(\d+)/);
    const timeMatch = line.match(/\btime\s+(\d+)/);
    const pvMatch = line.match(/\bpv\s+(.+)$/);

    const update: EngineInfoUpdate = {};
    if (depthMatch) {
      update.depth = parseInt(depthMatch[1], 10);
      this.lastReportedDepth = update.depth;
    }
    if (scoreMatch) {
      update.score = parseInt(scoreMatch[1], 10);
    } else if (mateMatch) {
      update.score = parseInt(mateMatch[1], 10) * 10000;
    }
    if (nodesMatch) update.nodes = parseInt(nodesMatch[1], 10);
    if (timeMatch) update.time = parseInt(timeMatch[1], 10);
    if (pvMatch) update.pv = pvMatch[1];

    if (Object.keys(update).length > 0) {
      for (const listener of this.infoListeners) {
        try {
          listener(update);
        } catch {}
      }
    }
  }

  private handleBestMove(line: string) {
    if (!this.pendingSearch) return;

    const parts = line.split(/\s+/);
    const uciMove = parts[1] || '';
    const pending = this.pendingSearch;
    this.pendingSearch = null;
    clearTimeout(pending.timeoutId);

    const totalTime = Date.now() - pending.startTime;

    // Validate the move against our chess rule engine
    const validatedMove = uciToMove(uciMove, pending.state);

    if (validatedMove) {
      pending.resolve({
        move: validatedMove,
        source: 'stockfish',
        engineName: this.getEngineName(),
        depth: this.lastReportedDepth,
        timeMs: totalTime,
      });
    } else {
      console.warn(`Stockfish returned invalid or unparseable move "${uciMove}". Falling back to minimax.`);
      this.fallbackToMinimax(pending.state, pending.difficulty, pending.resolve);
    }
  }

  private handleSearchError(reason: string) {
    if (!this.pendingSearch) return;
    const pending = this.pendingSearch;
    this.pendingSearch = null;
    clearTimeout(pending.timeoutId);
    console.warn(`Engine search failed (${reason}). Falling back to minimax.`);
    this.fallbackToMinimax(pending.state, pending.difficulty, pending.resolve);
  }

  private async fallbackToMinimax(
    state: GameState,
    difficulty: AiDifficulty,
    resolve: (res: EngineMoveResult | null) => void
  ) {
    try {
      const move = await getMinimaxBestMove(state, difficulty);
      if (move) {
        resolve({
          move,
          source: 'minimax',
          engineName: 'Royal Minimax (Fallback)',
          timeMs: 250,
        });
      } else {
        resolve(null);
      }
    } catch (err) {
      console.error('Minimax fallback failed:', err);
      // As ultimate safeguard, pick any legal move
      const legals = getAllLegalMoves(state);
      if (legals.length > 0) {
        resolve({
          move: legals[0],
          source: 'minimax',
          engineName: 'Royal Minimax (Emergency)',
          timeMs: 10,
        });
      } else {
        resolve(null);
      }
    }
  }

  private triggerFallback(reason: string) {
    this.fallbackReason = reason;
    for (const listener of this.fallbackListeners) {
      try {
        listener({ reason, engineName: 'Royal Minimax' });
      } catch {}
    }
  }

  /**
   * Request the engine to find the best move for a given position.
   * If Stockfish is unavailable or times out, it falls back to the minimax engine.
   */
  public async getBestMove(
    state: GameState,
    difficulty: AiDifficulty
  ): Promise<EngineMoveResult | null> {
    const legals = getAllLegalMoves(state);
    if (legals.length === 0) return null;

    // Ensure initialization attempted
    await this.init();

    // If Stockfish is not ready, execute with minimax directly
    if (!this.isReady || !this.worker) {
      const move = await getMinimaxBestMove(state, difficulty);
      if (!move) return null;
      return {
        move,
        source: 'minimax',
        engineName: 'Royal Minimax',
        timeMs: 300,
      };
    }

    // Cancel any previous search
    this.stop();

    const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    const fen = gameStateToFen(state);

    return new Promise<EngineMoveResult | null>((resolve, reject) => {
      this.lastReportedDepth = 0;

      // Failsafe timeout: if Stockfish doesn't reply within movetime + 4500ms, fall back
      const timeoutMs = config.movetime + 4500;
      const timeoutId = setTimeout(() => {
        console.warn(`Stockfish search timed out after ${timeoutMs}ms. Forcing minimax fallback.`);
        this.stop();
        this.fallbackToMinimax(state, difficulty, resolve);
      }, timeoutMs);

      this.pendingSearch = {
        state,
        difficulty,
        startTime: Date.now(),
        resolve,
        reject,
        timeoutId,
      };

      try {
        // Send UCI parameters for difficulty
        this.worker!.postMessage(`setoption name Skill Level value ${config.skillLevel}`);
        this.worker!.postMessage(`position fen ${fen}`);
        if (config.depthLimit) {
          this.worker!.postMessage(`go movetime ${config.movetime} depth ${config.depthLimit}`);
        } else {
          this.worker!.postMessage(`go movetime ${config.movetime}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        this.pendingSearch = null;
        console.error('Failed to dispatch UCI commands to Stockfish worker:', err);
        this.fallbackToMinimax(state, difficulty, resolve);
      }
    });
  }

  public stop() {
    if (this.pendingSearch) {
      clearTimeout(this.pendingSearch.timeoutId);
      this.pendingSearch = null;
    }
    if (this.worker && this.isReady) {
      try {
        this.worker.postMessage('stop');
      } catch {}
    }
  }

  public terminate() {
    this.stop();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
      this.isReady = false;
    }
  }
}

// Export singleton instance for app-wide use
export const stockfishEngine = new StockfishWorkerController();

export async function getComputerMove(
  state: GameState,
  difficulty: AiDifficulty
): Promise<EngineMoveResult | null> {
  return stockfishEngine.getBestMove(state, difficulty);
}
