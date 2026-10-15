# Pazzle Game

Паззл-игра для [Яндекс Игр](https://yandex.ru/games/). Стек: Phaser 4 + TypeScript + Vite.

## Команды

```bash
npm install        # установить зависимости
npm run dev        # dev-сервер на http://localhost:8080
npm run build      # проверка типов + сборка в dist/
npm run preview    # посмотреть собранную версию
```

## Публикация в Яндекс Игры

1. `npm run build`
2. Заархивировать **содержимое** папки `dist/` (`index.html` должен лежать в корне архива).
3. Загрузить архив в консоли разработчика Яндекс Игр.

## Структура

```
src/
  main.ts            # конфиг Phaser
  scenes/            # сцены игры
public/              # статические ассеты (копируются в dist как есть)
```