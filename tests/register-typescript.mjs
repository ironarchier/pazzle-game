import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

// Isolate tests from Node's optional persistent localStorage implementation.
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
} });

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@platform-adapter') return next(new URL('../src/platform/yandex.ts', import.meta.url).href, context);
    if (specifier === 'phaser') return next(new URL('./phaser-stub.mjs', import.meta.url).href, context);
    if (specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(url)) return next(url.href, context);
    }
    return next(specifier, context);
  },
});
