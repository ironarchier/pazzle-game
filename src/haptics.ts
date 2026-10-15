export function vibrate(pattern: number | number[]): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}
