// Renders VK catalogue artwork (icons, snippet, screenshots) to promo/vk/ with headless Chrome.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'promo', 'vk');
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const title = 'Аниме пазлы';
const slogan = 'Собери своего героя!';

const dataUri = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`;
const image = name => dataUri(`public/images/${name}`, 'image/jpeg');
const font = (subset, weight) => dataUri(`node_modules/@fontsource/nunito/files/nunito-${subset}-${weight}-normal.woff2`, 'font/woff2');
const fonts = [400, 800, 900].flatMap(weight => ['latin', 'cyrillic'].map(subset =>
  `@font-face{font-family:Nunito;font-weight:${weight};src:url(${font(subset, weight)}) format('woff2');}`)).join('');
const icon = (rounded = false) => {
  const svg = readFileSync(join(root, 'public/icon.svg'), 'utf8').replace('rx="112"', rounded ? 'rx="112"' : 'rx="0"');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const base = `${fonts}
*{box-sizing:border-box;margin:0}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:Nunito,sans-serif;color:#fff;background:linear-gradient(135deg,#ff4f87 0%,#b44ff0 55%,#8b5cf6 100%);position:relative}
.spark{position:absolute;background:#fff;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);opacity:.85}
.dot{position:absolute;border-radius:50%;background:#fff;opacity:.35}
.card{position:absolute;border-radius:28px;overflow:hidden;box-shadow:0 22px 50px rgba(59,20,80,.45);border:6px solid #fff;background:#fff}
.card img{width:100%;height:100%;object-fit:cover;display:block}
h1{font-weight:900;line-height:1.02;text-shadow:0 6px 24px rgba(59,20,80,.35)}
p{font-weight:800;opacity:.95}
.chip{display:inline-block;padding:10px 22px;border-radius:999px;background:rgba(255,255,255,.22);font-weight:800;margin:6px 8px 0 0}`;

const decor = `<i class="spark" style="left:6%;top:12%;width:34px;height:34px"></i>
<i class="spark" style="right:5%;bottom:10%;width:26px;height:26px"></i>
<i class="dot" style="left:46%;top:8%;width:14px;height:14px"></i>
<i class="dot" style="left:4%;bottom:14%;width:20px;height:20px"></i>`;

const headline = (size, width, heading, body) => `<div style="position:absolute;left:70px;top:50%;transform:translateY(-50%);width:${width}px">
  <h1 style="font-size:${size}px">${heading}</h1><div style="margin-top:26px;font-size:30px">${body}</div></div>`;
const card = (name, style) => `<div class="card" style="${style}"><img src="${image(name)}"></div>`;

function puzzleBoard(name, size, cells, missing) {
  const step = size / cells;
  let html = `<div style="position:absolute;inset:0;border-radius:24px;background:rgba(255,255,255,.35)"></div>`;
  for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
    if (missing.includes(row * cells + col)) continue;
    html += `<div style="position:absolute;left:${col * step}px;top:${row * step}px;width:${step}px;height:${step}px;
      background:url(${image(name)}) ${-col * step}px ${-row * step}px/${size}px ${size}px;outline:1px solid rgba(255,255,255,.55)"></div>`;
  }
  return html;
}
function looseTile(name, size, cells, index, style) {
  const step = size / cells, row = Math.floor(index / cells), col = index % cells;
  return `<div style="position:absolute;width:${step}px;height:${step}px;border:4px solid #fff;border-radius:12px;box-shadow:0 14px 30px rgba(59,20,80,.45);
    background:url(${image(name)}) ${-col * step}px ${-row * step}px/${size}px ${size}px;${style}"></div>`;
}

const pages = {
  'icon-576.png': [576, 576, `<img src="${icon()}" style="width:100%;height:100%">`],
  'icon-278.png': [278, 278, `<img src="${icon()}" style="width:100%;height:100%">`],
  'icon-150.png': [150, 150, `<img src="${icon()}" style="width:100%;height:100%">`],
  'favicon-32.png': [32, 32, `<img src="${icon()}" style="width:100%;height:100%">`],
  'snippet-1120x630.png': [1120, 630, `${decor}
    <img src="${icon(true)}" style="position:absolute;left:70px;top:70px;width:120px;height:120px;filter:drop-shadow(0 12px 24px rgba(59,20,80,.4))">
    <h1 style="position:absolute;left:70px;top:230px;font-size:88px;width:560px">${title}</h1>
    <p style="position:absolute;left:74px;top:440px;font-size:40px">${slogan}</p>
    ${card('anime/aot-finale.jpg', 'left:610px;top:150px;width:300px;height:300px;transform:rotate(-12deg)')}
    ${card('anime/n-finale.jpg', 'left:830px;top:190px;width:250px;height:250px;transform:rotate(10deg)')}
    ${card('anime/ds-finale.jpg', 'left:690px;top:250px;width:330px;height:330px;transform:rotate(2deg)')}`],
  'screenshot-1-1200x600.png': [1200, 600, `${decor}
    ${headline(60, 520, 'Собирай любимых героев', '<p>Перетаскивай детали — на своём месте они закрепляются сами</p>')}
    <div style="position:absolute;left:640px;top:50px;width:400px;height:400px">${puzzleBoard('anime/ds-nezuko.jpg', 400, 4, [6, 9, 15])}</div>
    ${looseTile('anime/ds-nezuko.jpg', 400, 4, 6, 'left:1068px;top:110px;transform:rotate(9deg)')}
    ${looseTile('anime/ds-nezuko.jpg', 400, 4, 15, 'left:1062px;top:300px;transform:rotate(-6deg)')}
    ${looseTile('anime/ds-nezuko.jpg', 400, 4, 9, 'left:820px;top:472px;transform:rotate(5deg)')}`],
  'screenshot-2-1200x600.png': [1200, 600, `${decor}
    ${headline(60, 440, '12 альбомов и 72 картинки', '<p>От лёгких 9 деталей до серьёзных 64</p>')}
    ${['anime/n-kakashi.jpg', 'anime/aot-mikasa.jpg', 'anime/dn-l.jpg', 'hunter/hunter-1.jpg', 'anime/ds-tanjiro.jpg', 'anime/n-hinata.jpg', 'anime/aot-levi.jpg', 'anime/ds-giyu.jpg']
      .map((name, i) => card(name, `left:${548 + (i % 4) * 158}px;top:${110 + Math.floor(i / 4) * 215}px;width:150px;height:150px;transform:rotate(${[-6, 4, -3, 7, 5, -5, 6, -4][i]}deg)`)).join('')}`],
  'screenshot-3-1200x600.png': [1200, 600, `${decor}
    ${headline(56, 540, 'Финальный суперпазл в каждом альбоме', '<span class="chip">💡 3 бесплатные подсказки</span><span class="chip">🌙 Тёмная тема</span><span class="chip">🪙 Монеты за уровни</span>')}
    ${card('anime/dn-finale.jpg', 'left:680px;top:70px;width:440px;height:440px;transform:rotate(3deg)')}
    <i class="spark" style="left:660px;top:60px;width:56px;height:56px"></i>
    <i class="spark" style="left:1110px;top:470px;width:44px;height:44px"></i>`],
};

mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'vk-promo-'));
try {
  for (const [file, [width, height, body]] of Object.entries(pages)) {
    const html = join(work, file.replace(/\.png$/, '.html'));
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${base}</style><body>${body}</body>`);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--virtual-time-budget=3000',
      `--window-size=${width},${height}`, `--screenshot=${join(out, file)}`, pathToFileURL(html).href], { stdio: 'ignore' });
    console.log(`promo/vk/${file}`);
  }
} finally { rmSync(work, { recursive: true, force: true }); }
