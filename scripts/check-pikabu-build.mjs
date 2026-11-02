// Checks dist-pikabu/ before it is put on hosting for Pikabu Games.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('dist-pikabu');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const all = await files(root);
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /localStorage|data-local-settings|playgama-bridge/, 'Pikabu build must not use local settings or Playgama Bridge');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert.ok(!match[1].startsWith('/'), `Absolute asset path: ${match[1]}`);
  assert.ok((await stat(path.resolve(root, match[1]))).isFile(), `Missing entry asset: ${match[1]}`);
}
let total = 0, code = '';
for (const file of all) {
  total += (await stat(file)).size;
  const name = path.relative(root, file);
  assert.match(name, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(name, /(?:^|[\\/])(?:node_modules|output|tests|src)(?:[\\/]|$)/);
  assert.doesNotMatch(name, /playgama/i, `Playgama file in Pikabu build: ${name}`);
  if (file.endsWith('.js')) code += await readFile(file, 'utf8');
}
assert.match(code, /https:\/\/games\.pikabu\.ru\/sdk\/sdk\.js/, 'Pikabu SDK loader is missing');
assert.match(code, /gameStarted/, 'Pikabu gameStarted call is missing');
assert.doesNotMatch(code, /YaGames|VKWebApp|testAds|test-ad-|seedDevelopmentScenario|Подтвердить просмотр/, 'Another platform or test ad code leaked into the Pikabu build');
for (const file of await files(path.resolve('public'))) {
  const emitted = path.join(root, path.relative(path.resolve('public'), file));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(await readFile(emitted)), hash(await readFile(file)), `Asset mismatch: ${file}`);
}
console.log(`Pikabu build verified: ${all.length} files, ${(total / 1024 / 1024).toFixed(1)} MiB; relative assets, Pikabu SDK only, all public assets match.`);
