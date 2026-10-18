import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALBUMS, LEVELS, getAlbumLevels, getLevelAlbum, SAVE_STORAGE_KEY } from '../src/constants.ts';
import { isUnlocked, nextLevel, readProgress, completeLevel, getProgress } from '../src/progress.ts';
import { existsSync } from 'node:fs';

test('five anime albums each have five ordinary characters and one special finale', () => {
  assert.deepEqual(ALBUMS.map(album => album.id), ['tokyo-ghoul', 'attack-on-titan', 'death-note', 'naruto', 'demon-slayer']);
  assert.equal(LEVELS.length, 30);
  assert.equal(new Set(LEVELS.map(level => level.image)).size, 30);
  for (const album of ALBUMS) {
    const ids = getAlbumLevels(album.id);
    assert.equal(ids.length, 6);
    assert.equal(ids.filter(id => LEVELS[id].finale).length, 1);
    for (const id of ids) assert.equal(getLevelAlbum(id), album);
  }
  assert.equal(LEVELS[5].image, 'images/anime/tg-finale.jpg');
  assert.match(LEVELS[5].title, /Канеки/);
});

test('each album opens one picture at a time and its finale needs its own five characters', () => {
  for (const album of ALBUMS) {
    const ids = getAlbumLevels(album.id), ordinary = ids.slice(0, 5), finale = ids[5];
    ordinary.forEach((id, index) => assert.equal(isUnlocked(id, []), index === 0));
    ordinary.slice(1).forEach((id, index) => assert.equal(isUnlocked(id, ordinary.slice(0, index + 1)), true));
    assert.equal(isUnlocked(ordinary[3], [ordinary[0], ordinary[1]]), false);
    assert.equal(isUnlocked(ordinary[3], [ordinary[3]]), true);
    assert.equal(isUnlocked(finale, []), false);
    assert.equal(isUnlocked(finale, ordinary.slice(1)), false);
    assert.equal(isUnlocked(finale, ordinary), true);
    const otherAlbum = LEVELS.flatMap((level, id) => level.albumId !== album.id ? [id] : []);
    assert.equal(isUnlocked(finale, otherAlbum), false);
    assert.equal(isUnlocked(finale, Array(5).fill(ordinary[0])), false);
    assert.equal(nextLevel(ordinary, ordinary[4]), finale);
  }
});

test('continue stays in the chosen anime even if earlier albums are unfinished', () => {
  assert.equal(nextLevel([8], 8), 9);
  assert.equal(nextLevel([8, 9, 10], 10), 6);
  assert.equal(nextLevel([6, 7, 8, 9, 10], 10), 11);
  assert.equal(nextLevel([6, 7, 8, 9, 10, 11], 11), 12);
});

test('invalid finals are removed independently when reading saved collection progress', () => {
  const completed = [0, 1, 2, 3, 4, 5, 6, 11, 17, 23, 29];
  const result = readProgress({ getItem: key => key === SAVE_STORAGE_KEY ? JSON.stringify({ version: 1, current: 11, completed }) : null });
  assert.deepEqual(result.completed, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(result.current, 7);
});

test('completing one album does not reward other albums; all thirty completions are unique', () => {
  for (const album of ALBUMS) {
    const ids = getAlbumLevels(album.id);
    assert.equal(completeLevel(ids[5]), false);
    ids.slice(0, 5).forEach(id => { assert.equal(completeLevel(id), true); assert.equal(completeLevel(id), false); });
    assert.equal(completeLevel(ids[5]), true);
    assert.equal(completeLevel(ids[5]), false);
  }
  assert.equal(getProgress().completed.length, 30);
  assert.equal(nextLevel(getProgress().completed), undefined);
});

test('all thirty puzzle images exist in the published assets', () => {
  for (const level of LEVELS) assert.ok(existsSync(new URL(`../public/${level.image}`, import.meta.url)), level.image);
});
