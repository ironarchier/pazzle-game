import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlbumScene } from '../src/scenes/AlbumScene.ts';
import { ALBUMS, GAME_ICONS, LEVEL_CARD_WIDTH, LEVEL_CARD_IMAGE_HEIGHT, getAlbumLevels } from '../src/constants.ts';
import { configureProgressStorage, getProgress, completeLevel } from '../src/progress.ts';
import { getTheme } from '../src/theme.ts';

// Exercise purchased albums as well as the free library through the actual scene.
let saved = JSON.stringify({
  ...getProgress(),
  economy: { ...getProgress().economy, purchasedAlbums: ALBUMS.filter(album => album.paid).map(album => album.id) },
});
configureProgressStorage({ getItem: () => saved, setItem: (_key, value) => { saved = value; } });

function render(album) {
  const scene = new AlbumScene();
  const images = [], fills = [], textureRequests = [];
  scene.textures.exists = key => { textureRequests.push(key); return true; };
  const image = scene.add.image;
  scene.add.image = (x, y, key) => {
    const result = image(x, y, key);
    images.push({ key, result });
    return result;
  };
  const graphics = scene.add.graphics;
  scene.add.graphics = () => {
    const result = graphics();
    let color, alpha;
    result.fillStyle = (c, a) => { color = c; alpha = a; return result; };
    result.fillRoundedRect = (x, y, width, height) => {
      fills.push({ color, alpha, width, height });
      return result;
    };
    return result;
  };
  scene.createAlbum(album);
  return { images, fills, textureRequests };
}

for (const album of ALBUMS) {
  test(`${album.id}: reveal each ordinary puzzle on unlock, keep finale completely hidden until all five are done`, () => {
    const ids = getAlbumLevels(album.id);
    for (let stage = 0; stage <= 5; stage++) {
      const scene = new AlbumScene();
      const loaded = [];
      scene.init({ albumId: album.id });
      scene.textures.exists = () => false;
      scene.load = { image: (key, url) => loaded.push({ key, url }) };
      scene.preload();
      assert.deepEqual(loaded.map(item => item.key), ids.slice(0, stage === 5 ? 6 : 5).map(id => `album-${id}`));

      const view = render(album);
      for (const [slot, id] of ids.entries()) {
        const artwork = view.images.find(item => item.key.startsWith(`album-${id}-`));
        if (slot === 5 && stage < 5) {
          assert.equal(artwork, undefined, 'locked finale must have no image object, including a cached image');
          assert.equal(view.textureRequests.some(key => key.startsWith(`album-${id}-`)), false);
          assert.ok(view.fills.some(fill => fill.width === LEVEL_CARD_WIDTH && fill.height === LEVEL_CARD_IMAGE_HEIGHT && fill.color === getTheme().track && fill.alpha === 1), 'finale placeholder must be fully opaque');
        } else {
          assert.ok(artwork, `missing artwork for ${id}`);
          assert.equal(artwork.key.includes('-blur'), slot > stage, `incorrect blur for ${id} at stage ${stage}`);
          if (slot <= stage) assert.equal(artwork.result.alpha, 1);
        }
      }
      assert.equal(view.images.filter(item => item.key === GAME_ICONS.lock).length, stage === 5 ? 0 : 5 - stage);
      if (stage < 5) assert.equal(completeLevel(ids[stage]), true);
    }
    // Completed pictures remain clear when the player returns to the album.
    assert.equal(completeLevel(ids[5]), true);
    assert.equal(render(album).images.some(item => item.key.includes('-blur') || item.key === GAME_ICONS.lock), false);
  });
}
