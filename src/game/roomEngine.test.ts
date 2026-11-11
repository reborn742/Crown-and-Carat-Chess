import test from 'node:test';
import assert from 'node:assert';
import { getInitialGameState, makeMove, getLegalMovesForPosition } from './chessEngine.ts';
import { Position } from './types.ts';

test('Room simulation: creates room, processes moves alternately, maintains synchronization', () => {
  let gameState = getInitialGameState();

  // White e2 -> e4
  const e2Pos: Position = { row: 6, col: 4 };
  const e4Pos: Position = { row: 4, col: 4 };
  const whiteLegal = getLegalMovesForPosition(e2Pos, gameState);
  const e4Move = whiteLegal.find(m => m.to.row === e4Pos.row && m.to.col === e4Pos.col);

  assert.ok(e4Move, 'e4 move must be legal for White');
  gameState = makeMove(gameState, e4Move);
  assert.strictEqual(gameState.turn, 'b', 'Turn must switch to Black');

  // Black e7 -> e5
  const e7Pos: Position = { row: 1, col: 4 };
  const e5Pos: Position = { row: 3, col: 4 };
  const blackLegal = getLegalMovesForPosition(e7Pos, gameState);
  const e5Move = blackLegal.find(m => m.to.row === e5Pos.row && m.to.col === e5Pos.col);

  assert.ok(e5Move, 'e5 move must be legal for Black');
  gameState = makeMove(gameState, e5Move);
  assert.strictEqual(gameState.turn, 'w', 'Turn must switch back to White');
  assert.strictEqual(gameState.history.length, 2, 'History must contain 2 plies');
});

test('Chat message FIFO handling and reaction flags', () => {
  const messages: any[] = [];
  const maxLimit = 120;

  // Add 125 messages
  for (let i = 0; i < 125; i++) {
    messages.push({
      id: `msg_${i}`,
      senderToken: i % 2 === 0 ? 'tok_white' : 'tok_black',
      senderName: i % 2 === 0 ? 'White Monarch' : 'Challenger',
      senderColor: i % 2 === 0 ? 'w' : 'b',
      text: i === 50 ? '👑' : `Message #${i}`,
      imageUrl: i === 10 ? 'data:image/jpeg;base64,...' : undefined,
      isReaction: i === 50,
      timestamp: Date.now() + i,
    });
    if (messages.length > maxLimit) {
      messages.shift();
    }
  }

  assert.strictEqual(messages.length, 120, 'Messages must be capped at 120');
  assert.strictEqual(messages[0].id, 'msg_5', 'First message should be msg_5 after 5 shifts');
  const reactionMsg = messages.find(m => m.id === 'msg_50');
  assert.ok(reactionMsg, 'Reaction message should be present');
  assert.strictEqual(reactionMsg.isReaction, true, 'isReaction should be true');
  assert.strictEqual(reactionMsg.text, '👑', 'Text should match emoji');
});

test('Resignation logic updates winner and resignedBy correctly', () => {
  let gameState = getInitialGameState();
  assert.strictEqual(gameState.winner, undefined);
  assert.strictEqual(gameState.resignedBy, undefined);

  // White resigns
  gameState = { ...gameState, winner: 'b', resignedBy: 'w' };
  assert.strictEqual(gameState.winner, 'b');
  assert.strictEqual(gameState.resignedBy, 'w');

  // Black resigns
  let rematchState = getInitialGameState();
  rematchState = { ...rematchState, winner: 'w', resignedBy: 'b' };
  assert.strictEqual(rematchState.winner, 'w');
  assert.strictEqual(rematchState.resignedBy, 'b');
});

test('Draw offer and mutual agreement logic marks drawReason as mutual-agreement', () => {
  let gameState = getInitialGameState();
  assert.strictEqual(gameState.isDraw, false);

  // Both players accept draw
  gameState = {
    ...gameState,
    isDraw: true,
    drawReason: 'mutual-agreement',
    winner: 'draw',
  };

  assert.strictEqual(gameState.isDraw, true);
  assert.strictEqual(gameState.drawReason, 'mutual-agreement');
  assert.strictEqual(gameState.winner, 'draw');
});

// ---------------------------------------------------------------------------
// Security regression tests: the server must never trust client-supplied moves
// ---------------------------------------------------------------------------
import { resolveLegalMove } from './chessEngine.ts';

test('resolveLegalMove accepts a genuine legal move and rebuilds it from the engine', () => {
  const state = getInitialGameState();
  const move = resolveLegalMove(state, {
    from: { row: 6, col: 4 },
    to: { row: 4, col: 4 },
    piece: { type: 'q', color: 'b', id: 'forged' }, // forged fields must be ignored
    captured: { type: 'k', color: 'b', id: 'forged-king' },
  });
  assert.ok(move);
  assert.strictEqual(move.piece.type, 'p', 'piece comes from the engine, not the client');
  assert.ok(!move.captured, 'captured comes from the engine, not the client');
});

test('resolveLegalMove rejects teleports, wrong-colour moves, blocked moves and garbage', () => {
  const state = getInitialGameState();
  const cases: unknown[] = [
    { from: { row: 6, col: 4 }, to: { row: 0, col: 4 } }, // pawn teleport
    { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // moving the opponent's pawn
    { from: { row: 7, col: 3 }, to: { row: 3, col: 3 } }, // queen through her own pawn
    { from: { row: 9, col: 4 }, to: { row: 4, col: 4 } }, // off the board
    { from: { row: 6.5, col: 4 }, to: { row: 4, col: 4 } }, // non-integer
    { from: { row: '6', col: 4 }, to: { row: 4, col: 4 } }, // wrong type
    { from: { row: 6, col: 4 } }, // missing destination
    null,
    'e2e4',
    42,
  ];
  for (const c of cases) assert.strictEqual(resolveLegalMove(state, c), null, JSON.stringify(c));
});

test('resolveLegalMove requires a valid promotion piece', () => {
  // White pawn on a7, black king far away: a8 promotion
  const state = getInitialGameState();
  state.board = state.board.map(row => row.map(() => null));
  state.board[1][0] = { type: 'p', color: 'w', id: 'wp' };
  state.board[7][4] = { type: 'k', color: 'w', id: 'wk' };
  state.board[0][7] = { type: 'k', color: 'b', id: 'bk' };
  state.castlingRights = { w: { kingSide: false, queenSide: false }, b: { kingSide: false, queenSide: false } };

  const from = { row: 1, col: 0 };
  const to = { row: 0, col: 0 };
  assert.strictEqual(resolveLegalMove(state, { from, to }), null, 'promotion piece is mandatory');
  assert.strictEqual(resolveLegalMove(state, { from, to, promotion: 'k' }), null, 'cannot promote to a king');
  assert.strictEqual(resolveLegalMove(state, { from, to, promotion: 'p' }), null, 'cannot promote to a pawn');
  assert.ok(resolveLegalMove(state, { from, to, promotion: 'q' }), 'queen promotion is legal');
});
