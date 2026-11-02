import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVkStorage } from '../src/platform/vkStorage.ts';
import { VK_STORAGE_CHUNK_SIZE } from '../src/constants.ts';

function fakeApi(initial = {}) {
  const values = { ...initial }, writes = [];
  let failing = false;
  return {
    values, writes,
    fail(value) { failing = value; },
    async get(keys) { return Object.fromEntries(keys.map(key => [key, values[key] ?? ''])); },
    async set(key, value) {
      if (failing) throw new Error('VK storage unavailable');
      writes.push(key); values[key] = value;
    },
  };
}

test('stores values under VK-safe keys split into chunks and reads them back', async () => {
  const api = fakeApi();
  const storage = await createVkStorage(api, ['game:save'], 0);
  assert.equal(storage.getItem('game:save'), null);
  const value = 'x'.repeat(VK_STORAGE_CHUNK_SIZE * 2 + 5);
  storage.setItem('game:save', value);
  assert.equal(storage.getItem('game:save'), value);
  await storage.flush();
  assert.equal(api.values.game_save, '3');
  assert.equal(api.values.game_save_2, 'xxxxx');
  const restored = await createVkStorage(api, ['game:save'], 0);
  assert.equal(restored.getItem('game:save'), value);
});

test('rewrites only changed chunks and coalesces writes until flush', async () => {
  const api = fakeApi();
  const storage = await createVkStorage(api, ['save'], 60000);
  storage.setItem('save', 'a'.repeat(VK_STORAGE_CHUNK_SIZE) + 'b');
  storage.setItem('save', 'a'.repeat(VK_STORAGE_CHUNK_SIZE) + 'c');
  await storage.flush();
  assert.deepEqual(api.writes, ['save_0', 'save_1', 'save']);
  api.writes.length = 0;
  storage.setItem('save', 'a'.repeat(VK_STORAGE_CHUNK_SIZE) + 'd');
  await storage.flush();
  assert.deepEqual(api.writes, ['save_1']);
});

test('keeps failed writes pending and retries them on the next flush', async () => {
  const api = fakeApi();
  const storage = await createVkStorage(api, ['save'], 60000);
  api.fail(true);
  storage.setItem('save', 'progress');
  await storage.flush();
  assert.equal(api.values.save, undefined);
  api.fail(false);
  await storage.flush();
  assert.equal(api.values.save, '1');
  assert.equal(api.values.save_0, 'progress');
});

test('uses smaller chunks for non-ASCII values to respect the byte limit', async () => {
  const api = fakeApi();
  const storage = await createVkStorage(api, ['save'], 0);
  storage.setItem('save', 'я'.repeat(VK_STORAGE_CHUNK_SIZE));
  await storage.flush();
  assert.equal(api.values.save, '4');
  assert.equal((await createVkStorage(api, ['save'], 0)).getItem('save'), 'я'.repeat(VK_STORAGE_CHUNK_SIZE));
});
