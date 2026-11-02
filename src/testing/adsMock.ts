import { getTheme, toCss } from '../theme';
import type { RewardedSdk } from '../platform/types';

// This module is dynamically imported only by Vite DEV code and is absent from production.
export function createDevelopmentSdk(): RewardedSdk {
  return { adv: { showRewardedVideo({ callbacks }) {
    const theme = getTheme();
    const root = document.createElement('div');
    root.dataset.testid = 'TEST_AD_SIMULATOR';
    Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '10000', display: 'grid', placeItems: 'center', background: '#000b', fontFamily: 'Nunito, Arial, sans-serif' });
    const panel = document.createElement('div');
    Object.assign(panel.style, { width: 'min(340px, 82vw)', padding: '24px', borderRadius: '24px', background: toCss(theme.surface), color: toCss(theme.text), textAlign: 'center' });
    const heading = document.createElement('h2'); heading.textContent = 'Тестовая реклама · DEV';
    const text = document.createElement('p'); text.textContent = 'Только локальная проверка. Выберите результат просмотра.';
    panel.append(heading, text);
    const action = (label: string, done: () => void) => {
      const button = document.createElement('button'); button.textContent = label;
      Object.assign(button.style, { width: '100%', padding: '13px', marginTop: '10px', borderRadius: '24px', border: '0', background: toCss(theme.accent), color: toCss(theme.accentText), cursor: 'pointer', font: 'inherit' });
      button.onclick = () => { root.remove(); done(); }; panel.append(button);
    };
    action('Подтвердить просмотр', () => { callbacks.onRewarded(); callbacks.onClose(true); });
    action('Закрыть без награды', () => callbacks.onClose(false));
    action('Проверить ошибку', () => callbacks.onError(new Error('DEV test error')));
    root.append(panel); document.body.append(root); callbacks.onOpen();
  } } };
}
