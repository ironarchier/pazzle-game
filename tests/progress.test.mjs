import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readProgress, validateAssembly, isUnlocked, nextLevel, getProgress, saveAssembly, completeLevel } from '../src/progress.ts';
import { LEVELS, PROGRESS_STORAGE_KEY, SAVE_STORAGE_KEY } from '../src/constants.ts';
import { generateEdges, seededRandom } from '../src/puzzle/pieceShape.ts';

const storage = data => ({ getItem: key => data[key] ?? null, setItem: (key, v) => { data[key] = v; } });
const assembly = () => ({ level: 0, rows: 4, cols: 4, seed: 12345, placed: [5], tray: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 4, 3, 2], groups: [{ ids: [0, 1], x: 0.25, y: 0.7 }], scroll: 250 });
const saved = active => ({ version: 1, current: 0, completed: [], active });

test('old pictures never count as anime completions and old saves stay untouched', () => {
  const data = { [PROGRESS_STORAGE_KEY]: '1', 'pazzle-game:save:v1': JSON.stringify(saved(assembly())) };
  assert.deepEqual(readProgress(storage(data)).completed, []);
  assert.equal(readProgress(storage(data)).active, undefined);
  assert.equal(data[PROGRESS_STORAGE_KEY], '1');
  for (const value of ['-1', '6', 'NaN', '2.4', 'bad']) assert.equal(readProgress(storage({ [PROGRESS_STORAGE_KEY]: value })).current, 0);
});
test('malformed, unsupported and unavailable storage are safe', () => {
  for (const value of ['null', '[]', '{bad', '{"version":99}']) assert.equal(readProgress(storage({ [SAVE_STORAGE_KEY]: value })).current, 0);
  assert.equal(readProgress({ getItem() { throw new Error('blocked'); } }).current, 0);
  assert.equal(readProgress(undefined).active, undefined);
});
test('round-trip keeps interior placed piece, connected group, tray order and seed', () => {
  const active = assembly();
  const result = readProgress(storage({ [SAVE_STORAGE_KEY]: JSON.stringify(saved(active)) }));
  assert.deepEqual(result.active, active);
  // Normalized anchors reproduce group offsets at different field sizes.
  for (const width of [300, 680, 1000]) {
    const group = result.active.groups[0];
    const centers = group.ids.map(id => group.x * width + (id % 4 - group.ids[0] % 4) * width / 4);
    assert.ok(Math.abs(centers[1] - centers[0] - width / 4) < 1e-9);
  }
});
test('invalid assembly is discarded without losing collection progress', () => {
  const variants = [
    { tray: [8, 7, 6, 5, 3, 4] }, // duplicate placed piece and missing piece
    { tray: [8, 7, 6] }, { seed: 0 }, { cols: 99 },
    { groups: [{ ids: [0, 1], x: null, y: 0.5 }] },
    { groups: [{ ids: [0, 1], x: 3, y: 0.5 }] },
    { groups: [{ ids: [0, 8], x: 0.2, y: 0.5 }], tray: [1, 2, 3, 5, 6, 7] },
  ];
  for (const patch of variants) {
    const data = { ...saved({ ...assembly(), ...patch }), completed: [0, 1] };
    const result = readProgress(storage({ [SAVE_STORAGE_KEY]: JSON.stringify(data) }));
    assert.equal(result.active, undefined);
    assert.deepEqual(result.completed, [0, 1]);
  }
});
test('all five distinct ordinary levels are required for finale, in any order', () => {
  assert.equal(isUnlocked(5, [0, 0, 0, 0, 0]), false);
  assert.equal(isUnlocked(5, [4, 2, 0, 1]), false);
  assert.equal(isUnlocked(5, [4, 2, 0, 1, 3]), true);
  assert.equal(nextLevel([0, 1, 2, 3]), 4);
  assert.equal(nextLevel([0, 1, 2, 3, 4], 4), 5);
  assert.equal(nextLevel([0, 1, 2, 3, 4, 5]), 6);
  assert.equal(nextLevel(LEVELS.map((_, id) => id)), undefined);
  const result = readProgress(storage({ [SAVE_STORAGE_KEY]: JSON.stringify({ ...saved(), current: 5, completed: [0, 0, 5, -1, 100] }) }));
  assert.deepEqual(result.completed, [0]);
  assert.equal(result.current, 1);
});
test('every album uses original 4x4 difficulty and a harder 5x5 finale with reproducible saves', () => {
  const ordinary = LEVELS.flatMap((config, id) => config.finale ? [] : [id]);
  LEVELS.forEach((config, level) => {
    assert.equal(config.rows, config.finale ? 5 : 4);
    assert.equal(config.cols, config.rows);
    const active = { level, rows: config.rows, cols: config.cols, seed: 99, placed: [], groups: [], tray: Array.from({ length: config.rows * config.cols }, (_, i) => i).reverse(), scroll: 0 };
    assert.deepEqual(validateAssembly(active, ordinary), active);
    assert.deepEqual(generateEdges(active.rows, active.cols, seededRandom(99)), generateEdges(active.rows, active.cols, seededRandom(99)));
    assert.notDeepEqual(generateEdges(active.rows, active.cols, seededRandom(98)), generateEdges(active.rows, active.cols, seededRandom(99)));
  });
  const mobile = { level: 5, rows: 4, cols: 4, seed: 5, placed: [], groups: [], tray: Array.from({ length: 16 }, (_, i) => i), scroll: 0 };
  assert.equal(validateAssembly(mobile, [0, 1, 2, 3, 4]), undefined);
  assert.equal(validateAssembly(mobile, []), undefined);
});
test('completion is idempotent, clears assembly and unlocks entire album', () => {
  saveAssembly(assembly());
  assert.equal(completeLevel(5), false);
  assert.equal(completeLevel(0), true);
  assert.equal(completeLevel(0), false);
  assert.equal(getProgress().active, undefined);
  assert.equal(completeLevel(2), false);
  for (const level of [1, 2, 3, 4]) assert.equal(completeLevel(level), true);
  assert.equal(isUnlocked(5, getProgress().completed), true);
  assert.equal(completeLevel(5), true);
  assert.equal(completeLevel(5), false);
  assert.equal(getProgress().completed.length, 6);
});

test('browser persistence keeps anime saves separate and keeps playing when writes fail', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = {};
  globalThis.window = {};
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage(data) });
    saveAssembly(assembly());
    assert.deepEqual(readProgress(storage(data)).active, assembly());
    assert.equal(data[PROGRESS_STORAGE_KEY], undefined);
    const detached = getProgress(); detached.active.tray.reverse();
    assert.deepEqual(getProgress().active.tray, assembly().tray);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { throw new Error('quota'); } } });
    assert.doesNotThrow(() => completeLevel(0));
    assert.equal(getProgress().active, undefined);
    assert.equal(getProgress().completed.length, 6);
  } finally {
    delete globalThis.window;
    Object.defineProperty(globalThis, 'localStorage', previous);
  }
});
