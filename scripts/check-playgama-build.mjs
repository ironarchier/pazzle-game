import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('dist-playgama');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const all = await files(root);
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.match(html, /src="\.\/playgama-bridge\.js"/);
assert.doesNotMatch(html, /localStorage|data-local-settings|https?:\/\//);
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert.ok(!match[1].startsWith('/'), `Absolute asset path: ${match[1]}`);
  assert.ok((await stat(path.resolve(root, match[1]))).isFile());
}
let total = 0;
for (const file of all) {
  total += (await stat(file)).size;
  const name = path.relative(root, file);
  assert.match(name, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(name, /(?:^|[\\/])(?:node_modules|output|tests|src)(?:[\\/]|$)/);
  if (!file.endsWith('.js') || file.endsWith('playgama-bridge.js')) continue;
  const js = await readFile(file, 'utf8');
  assert.doesNotMatch(js, /YaGames|testAds|test-ad-|seedDevelopmentScenario|Подтвердить просмотр/);
}
for (const file of await files(path.resolve('public'))) {
  const emitted = path.join(root, path.relative(path.resolve('public'), file));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(await readFile(emitted)), hash(await readFile(file)), `Asset mismatch: ${file}`);
}
const config = JSON.parse(await readFile(path.join(root, 'playgama-bridge-config.json'), 'utf8'));
assert.equal(config.advertisement.rewarded.placements[0].id, 'coins');
assert.equal(config.advertisement.interstitial.placements[0].id, 'level_completed');
assert.ok(total <= 300 * 1024 * 1024);
console.log(`Playgama build verified: ${all.length} files, ${total} bytes; relative assets, SDK/config/license, no Yandex/test ad code; all public assets match.`);
