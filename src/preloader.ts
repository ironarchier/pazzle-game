import { PRELOADER_MIN_DURATION } from './constants';

export function hidePreloader(): void {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const delay = Math.max(0, PRELOADER_MIN_DURATION - performance.now());
  setTimeout(() => {
    preloader.classList.add('hidden');
    preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
  }, delay);
}