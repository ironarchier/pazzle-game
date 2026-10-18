import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameScene } from '../src/scenes/GameScene.ts';
import { PuzzlePiece } from '../src/puzzle/PuzzlePiece.ts';
import { getProgress, completeLevel, readProgress } from '../src/progress.ts';
import { SAVE_STORAGE_KEY } from '../src/constants.ts';
import { Display } from './phaser-stub.mjs';

function game(rows = 3, cols = rows) {
  const scene = new GameScene();
  Object.assign(scene, { rows, cols, boardX: 20, boardY: 250, boardWidth: 680, boardHeight: 680, boardScale: 680 / (cols * 250), seed: 43 });
  for (const field of ['counter', 'counterBg', 'counterIcon', 'sampleButton', 'hintButton', 'hint', 'completeImage']) scene[field] = new Display(scene);
  scene.createPieces();
  scene.tray.forEach((piece, i) => piece.setPosition(90 + i * 140, 1170));
  return scene;
}
function drop(scene, piece, x, y) {
  scene.pickUp(piece);
  piece.setPosition(x, y);
  scene.dropOnBoard(piece);
  scene.save();
}

test('a horizontal tray gesture scrolls the tray', () => {
  const scene = game();
  scene.setupInput();
  // A horizontal tray gesture goes through the real scene event handlers.
  scene.input.emit('pointerdown', { id: 1, x: 600, y: 1170 }, []);
  scene.input.emit('pointermove', { id: 1, x: 300, y: 1170 });
  scene.input.emit('pointerup', { id: 1 });
  assert.ok(scene.trayScroll > 0);
});

test('a border piece snaps with no installed neighbours; counter and save agree', () => {
  const scene = game();
  const piece = scene.pieces[1];
  drop(scene, piece, ...scene.targetOf(piece));
  assert.equal(piece.state, 'placed');
  assert.equal(scene.pieces.filter(p => p.state === 'placed').length, 1);
  assert.equal(scene.counter.text, '1/9');
  assert.deepEqual(getProgress().active.placed, [1]);
});

test('joining, interrupted join tween, group movement and save/restore preserve offsets', () => {
  const scene = game();
  const a = scene.pieces[0], b = scene.pieces[1];
  drop(scene, a, 150, 700);
  drop(scene, b, 150 + scene.cellSize + 8, 700);
  assert.equal(a.group.length, 2);
  // Pick up before the join animation has finished: all members must settle first.
  scene.pickUp(b);
  assert.ok(Math.abs(b.x - a.x - scene.cellSize) < 1e-7);
  scene.dragTo(b, b.x + 30, b.y - 20);
  scene.drop(b, scene.positionsOf(b.group));
  scene.save();
  const before = getProgress().active;
  assert.equal(before.groups.length, 1);
  assert.equal(before.groups[0].ids.length, 2);
  const reloaded = readProgress({ getItem: key => key === SAVE_STORAGE_KEY ? JSON.stringify({ ...getProgress(), active: before }) : null });
  const restored = game();
  restored.boardWidth = 480; restored.boardHeight = 480; restored.boardScale = 480 / 750;
  restored.restored = reloaded.active;
  restored.restore();
  assert.deepEqual(restored.tray.map(p => p.row * 3 + p.col), before.tray);
  const [ra, rb] = [restored.pieces[0], restored.pieces[1]];
  assert.equal(ra.group, rb.group);
  assert.ok(Math.abs(rb.x - ra.x - restored.cellSize) < 1e-7);
  restored.showPreview();
  assert.ok(restored.preview);
  restored.hidePreview();
  assert.equal(restored.preview, undefined);
});

test('saves are committed on release, never on pointer movement', () => {
  const scene = game();
  scene.setupInput();
  scene.save();
  const before = getProgress().active;
  const piece = scene.pieces[0];
  scene.input.emit('pointerdown', { id: 1, x: 90, y: 1170 }, [piece]);
  scene.input.emit('pointermove', { id: 1, x: 90, y: 1130 });
  scene.input.emit('pointermove', { id: 1, x: 400, y: 700 });
  assert.deepEqual(getProgress().active, before);
  scene.input.emit('pointerup', { id: 1 });
  assert.equal(getProgress().active.tray.length, 8);
  assert.equal(getProgress().active.groups.length, 1);
});

test('three hints fly pieces to places allowed by the rules, then run out', () => {
  const scene = game();
  scene.refreshLabels();
  assert.equal(scene.hintButton.badge, 3);
  for (let used = 1; used <= 3; used++) {
    scene.useHint();
    scene.tweens.flush();
    const placed = scene.pieces.filter(p => p.state === 'placed');
    assert.equal(placed.length, used);
    assert.equal(scene.hintButton.badge, 3 - used);
    assert.equal(getProgress().active.hints, 3 - used);
    for (const p of placed) assert.ok(p.row !== 1 || p.col !== 1 || placed.some(o => Math.abs(o.row - p.row) + Math.abs(o.col - p.col) === 1));
  }
  assert.equal(scene.tray.length, 6);
  scene.useHint();
  scene.tweens.flush();
  assert.equal(scene.pieces.filter(p => p.state === 'placed').length, 3);
});

test('a hint places a whole board group and the remaining hints survive a reload', () => {
  const scene = game();
  const a = scene.pieces[0], b = scene.pieces[1];
  drop(scene, a, 150, 700); drop(scene, b, 150 + scene.cellSize, 700);
  scene.tweens.flush();
  scene.useHint();
  scene.tweens.flush();
  assert.equal(a.state, 'placed');
  assert.equal(b.state, 'placed');
  assert.deepEqual(scene.positionsOf([a, b]).get(b), scene.targetOf(b));
  const reloaded = readProgress({ getItem: key => key === SAVE_STORAGE_KEY ? JSON.stringify(getProgress()) : null });
  assert.equal(reloaded.active.hints, 2);
  const invalid = readProgress({ getItem: key => key === SAVE_STORAGE_KEY ? JSON.stringify({ ...getProgress(), active: { ...reloaded.active, hints: 4 } }) : null });
  assert.equal(invalid.active, undefined);
});

test('resize cancellation returns a tray piece and fits a board group without changing its shape', () => {
  const scene = game(); scene.setupInput();
  const piece = scene.tray[0];
  scene.input.emit('pointerdown', { id: 1, x: 90, y: 1170 }, [piece]);
  scene.input.emit('pointermove', { id: 1, x: 90, y: 1000 });
  assert.equal(piece.state, 'drag');
  scene.cancelGesture();
  assert.equal(piece.state, 'tray');
  assert.equal(scene.tray.length, 9);
  const a = scene.pieces[0], b = scene.pieces[1];
  drop(scene, a, 150, 700); drop(scene, b, 150 + scene.cellSize, 700);
  scene.tweens.flush();
  scene.shiftGroup(a.group, -400, -600);
  scene.fitBoardGroups();
  assert.ok(a.x >= scene.cellSize / 2 - 1e-7);
  assert.ok(Math.abs(b.x - a.x - scene.cellSize) < 1e-7);
  scene.save();
  assert.ok(readProgress({ getItem: key => key === SAVE_STORAGE_KEY ? JSON.stringify(getProgress()) : null }).active);
});

test('multiple snap callbacks commit a single win, without dimming or duplicate rewards', () => {
  for (const rows of [3, 8]) {
    const scene = game(rows);
    scene.level = rows === 3 ? 0 : 5;
    if (rows === 8) for (let i = 0; i < 5; i++) completeLevel(i);
    const group = scene.pieces;
    scene.tray = [];
    group.forEach(p => { p.state = 'board'; p.group = group; });
    scene.place(group);
    scene.save(); // Simulates a menu/reload before snap animations finish.
    assert.equal(scene.won, true);
    const panel = scene.winPanel;
    assert.equal(scene.completeImage.visible, true);
    const count = getProgress().completed.length;
    scene.tweens.flush();
    scene.showWin();
    assert.equal(scene.winPanel, panel);
    assert.equal(getProgress().completed.length, count);
    assert.equal(getProgress().active, undefined);
    assert.equal(scene.counter.text, `${rows * rows}/${rows * rows}`);
  }
  assert.equal(getProgress().completed.length, 6);
});

test('fresh finale stays 8x8 on a narrow screen and the second puzzle is 4x4', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: 390, innerHeight: 844 };
  try {
    for (let id = 0; id < 5; id++) completeLevel(id);
    const finale = new GameScene();
    finale.init({ level: 5 });
    assert.equal(finale.rows, 8);
    assert.equal(finale.cols, 8);
    const ordinary = new GameScene();
    ordinary.init({ level: 1 });
    assert.equal(ordinary.rows, 4);
    assert.equal(ordinary.cols, 4);
    const locked = new GameScene();
    locked.init({ level: 11 });
    assert.equal(locked.level, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('a dragged piece can reach the edge columns of a full-width board', () => {
  const scene = game(4);
  for (const piece of [scene.pieces[0], scene.pieces[3]]) {
    scene.pickUp(piece);
    const [x, y] = scene.targetOf(piece);
    scene.dragTo(piece, x, y);
    assert.equal(piece.x, x);
    assert.equal(piece.y, y);
  }
});

test('border pieces are placed freely, interior ones only next to an installed piece', () => {
  const scene = game();
  const [corner, interior, side] = [scene.pieces[0], scene.pieces[4], scene.pieces[1]];
  drop(scene, interior, ...scene.targetOf(interior));
  assert.equal(interior.state, 'board');
  drop(scene, corner, ...scene.targetOf(corner));
  assert.equal(corner.state, 'placed');
  drop(scene, interior, ...scene.targetOf(interior));
  assert.equal(interior.state, 'board');
  drop(scene, side, ...scene.targetOf(side));
  assert.equal(side.state, 'placed');
  drop(scene, interior, ...scene.targetOf(interior));
  assert.equal(interior.state, 'placed');
});
