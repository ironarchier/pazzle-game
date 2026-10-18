import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateSettings } from '../src/settings.ts';
import { albumTitle, levelTitle, pieces, t } from '../src/i18n.ts';
import { ALBUMS, LEVELS } from '../src/constants.ts';

test('texts, plurals and content titles follow the selected language', () => {
  updateSettings({ language: 'ru' });
  assert.equal(t('menuCollected', { count: 3, total: 30 }), 'Собрано 3 из 30');
  assert.deepEqual([9, 21, 64].map(pieces), ['9 деталей', '21 деталь', '64 детали']);
  assert.equal(albumTitle(ALBUMS[0]), ALBUMS[0].title);
  updateSettings({ language: 'en' });
  assert.equal(t('menuCollected', { count: 3, total: 30 }), 'Collected 3 of 30');
  assert.deepEqual([1, 64].map(pieces), ['1 piece', '64 pieces']);
  assert.equal(albumTitle(ALBUMS[0]), 'Tokyo Ghoul');
  for (let id = 0; id < LEVELS.length; id++) assert.ok(levelTitle(id) && !/[а-яё]/i.test(levelTitle(id)), String(id));
  updateSettings({ language: 'ru' });
});
