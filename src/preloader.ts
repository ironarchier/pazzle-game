import { PRELOADER_MIN_DURATION } from './constants';

let hidden = Promise.resolve();
export function whenPreloaderHidden(): Promise<void> { return hidden; }

export function showStartupError(): void {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  const ru = navigator.language.toLowerCase().startsWith('ru');
  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:320px;padding:24px;text-align:center;font:18px sans-serif;color:#352538';
  const message = document.createElement('p');
  message.textContent = ru ? 'Не удалось загрузить игру и сохранения. Проверьте соединение и попробуйте снова.' : 'Unable to load the game and saved progress. Check your connection and try again.';
  const retry = document.createElement('button');
  retry.textContent = ru ? 'Повторить' : 'Retry';
  retry.style.cssText = 'padding:12px 24px;font:inherit;cursor:pointer';
  retry.onclick = () => location.reload();
  panel.append(message, retry);
  preloader.replaceChildren(panel);
}

export function hidePreloader(): void {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const delay = Math.max(0, PRELOADER_MIN_DURATION - performance.now());
  hidden = new Promise(resolve => {
    setTimeout(() => {
      const finish = () => { preloader.remove(); resolve(); };
      preloader.classList.add('hidden');
      preloader.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 500); // Also finish when a browser suppresses transitionend.
    }, delay);
  });
}
