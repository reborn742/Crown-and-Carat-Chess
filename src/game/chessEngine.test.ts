import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialGameState,
  getAllLegalMoves,
  makeMove,
  undoLastMove,
  squareToPos,
  posToSquare,
  isKingInCheck,
  getLegalMovesForPosition,
  isInsufficientMaterial,
  createPiece,
  gameStateToFen,
  uciToMove,
} from './chessEngine';
import { BoardGrid, Move } from './types';

test('initial position has 20 legal moves for White', () => {
  const state = getInitialGameState();
  const moves = getAllLegalMoves(state);
  assert.equal(moves.length, 20);
});

test('pawn double push and single push work correctly', () => {
  const state = getInitialGameState();
  const e2Moves = getLegalMovesForPosition(squareToPos('e2'), state);
  assert.equal(e2Moves.length, 2);
  const squares = e2Moves.map(m => posToSquare(m.to)).sort();
  assert.deepEqual(squares, ['e3', 'e4']);
});

test('Four-move Scholar Mate triggers checkmate and White win', () => {
  let state = getInitialGameState();

  // 1. e4 e5
  const move1 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e2' && posToSquare(m.to) === 'e4');
  assert.ok(move1);
  state = makeMove(state, move1);

  const move2 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e7' && posToSquare(m.to) === 'e5');
  assert.ok(move2);
  state = makeMove(state, move2);

  // 2. Bc4 Nc6
  const move3 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'f1' && posToSquare(m.to) === 'c4');
  assert.ok(move3);
  state = makeMove(state, move3);

  const move4 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'b8' && posToSquare(m.to) === 'c6');
  assert.ok(move4);
  state = makeMove(state, move4);

  // 3. Qh5 Nf6
  const move5 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'd1' && posToSquare(m.to) === 'h5');
  assert.ok(move5);
  state = makeMove(state, move5);

  const move6 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'g8' && posToSquare(m.to) === 'f6');
  assert.ok(move6);
  state = makeMove(state, move6);

  // 4. Qxf7#
  const move7 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'h5' && posToSquare(m.to) === 'f7');
  assert.ok(move7);
  state = makeMove(state, move7);

  assert.equal(state.isCheck, true);
  assert.equal(state.isCheckmate, true);
  assert.equal(state.winner, 'w');
  assert.equal(state.history[state.history.length - 1].san, 'Qxf7#');
});

test('En passant capture is recognized and removes captured pawn', () => {
  let state = getInitialGameState();

  // 1. e4 a6 2. e5 d5
  const m1 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e2' && posToSquare(m.to) === 'e4')!;
  state = makeMove(state, m1);
  const m2 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'a7' && posToSquare(m.to) === 'a6')!;
  state = makeMove(state, m2);
  const m3 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e4' && posToSquare(m.to) === 'e5')!;
  state = makeMove(state, m3);
  const m4 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'd7' && posToSquare(m.to) === 'd5')!;
  state = makeMove(state, m4);

  // White pawn on e5 should have en passant capture to d6
  const whiteLegal = getAllLegalMoves(state);
  const epMove = whiteLegal.find(m => m.isEnPassant && posToSquare(m.to) === 'd6');
  assert.ok(epMove, 'En passant move to d6 should be legal');

  state = makeMove(state, epMove);
  // Black pawn at d5 must be removed
  const d5Pos = squareToPos('d5');
  assert.equal(state.board[d5Pos.row][d5Pos.col], null, 'Captured pawn at d5 must be removed');
  // White pawn must be at d6
  const d6Pos = squareToPos('d6');
  assert.equal(state.board[d6Pos.row][d6Pos.col]?.type, 'p');
  assert.equal(state.board[d6Pos.row][d6Pos.col]?.color, 'w');
});

test('Castling kingside moves both King and Rook correctly', () => {
  let state = getInitialGameState();
  // Clear f1 and g1 for white
  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e2' && posToSquare(m.to) === 'e4')!);
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e7' && posToSquare(m.to) === 'e5')!);
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'g1' && posToSquare(m.to) === 'f3')!);
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'b8' && posToSquare(m.to) === 'c6')!);
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'f1' && posToSquare(m.to) === 'c4')!);
  state = makeMove(state, getAllLegalMoves(state).find(m => posToSquare(m.from) === 'f8' && posToSquare(m.to) === 'c5')!);

  // White should have O-O available
  const castleMove = getAllLegalMoves(state).find(m => m.isCastle === 'kingside');
  assert.ok(castleMove, 'Kingside castle should be available');
  state = makeMove(state, castleMove);

  // King should be on g1, Rook on f1
  const g1 = squareToPos('g1');
  const f1 = squareToPos('f1');
  assert.equal(state.board[g1.row][g1.col]?.type, 'k');
  assert.equal(state.board[f1.row][f1.col]?.type, 'r');
  assert.equal(state.history[state.history.length - 1].san, 'O-O');
});

test('Undo move restores previous board and turn', () => {
  let state = getInitialGameState();
  const initialKey = state.positionHistory[0];

  const m1 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e2' && posToSquare(m.to) === 'e4')!;
  state = makeMove(state, m1);
  assert.equal(state.turn, 'b');

  state = undoLastMove(state);
  assert.equal(state.turn, 'w');
  assert.equal(state.history.length, 0);
  assert.equal(state.positionHistory[0], initialKey);
});

test('Insufficient material detects K vs K', () => {
  const board: BoardGrid = Array(8).fill(null).map(() => Array(8).fill(null));
  board[0][4] = createPiece('k', 'b');
  board[7][4] = createPiece('k', 'w');
  assert.equal(isInsufficientMaterial(board), true);
});

test('gameStateToFen generates standard initial FEN and tracks moves', () => {
  const state = getInitialGameState();
  const initialFen = gameStateToFen(state);
  assert.equal(initialFen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  const e4 = getAllLegalMoves(state).find(m => posToSquare(m.from) === 'e2' && posToSquare(m.to) === 'e4')!;
  const next = makeMove(state, e4);
  const nextFen = gameStateToFen(next);
  assert.equal(nextFen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
});

test('uciToMove parses standard UCI move strings into validated Move objects', () => {
  const state = getInitialGameState();
  const parsedMove = uciToMove('e2e4', state);
  assert.ok(parsedMove);
  assert.equal(posToSquare(parsedMove.from), 'e2');
  assert.equal(posToSquare(parsedMove.to), 'e4');

  // Illegal move should return null
  assert.equal(uciToMove('e2e5', state), null);
  assert.equal(uciToMove('(none)', state), null);
});
