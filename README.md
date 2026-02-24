# Million Items — Fullstack тестовое задание

## Стек
- **Backend**: Express.js (Node.js)
- **Frontend**: React 18 + @dnd-kit
- **Хранение**: In-memory (без БД)
- **Деплой**: Railway

## Архитектура

```
project/
├── server/
│   ├── index.js          # Express сервер
│   ├── state.js          # In-memory хранилище (1M элементов)
│   ├── queue.js          # Очередь с дедупликацией и батчингом
│   └── routes/
│       ├── items.js      # GET/POST /api/items
│       └── selected.js   # GET/POST/DELETE/PUT /api/selected
├── client/
│   └── src/
│       ├── api/queue.js              # Клиентская очередь запросов
│       ├── hooks/
│       │   ├── useInfiniteScroll.js  # IntersectionObserver
│       │   └── useDebounce.js        # Задержка поиска
│       └── components/
│           ├── LeftPanel/            # Все элементы
│           └── RightPanel/           # Выбранные + DnD
├── railway.json          # Railway конфиг
└── package.json          # Monorepo скрипты
```

## Ключевые решения

### Производительность с 1M элементов
- Сервер хранит ID в `Set` (O(1) для has/add/delete)
- Пагинация: клиент получает только 20 элементов за раз
- Итерация по Set прерывается через `break` после заполнения страницы

### Очередь с дедупликацией
- **ADD_ITEM**: батч раз в 10 секунд, дедупликация по ID
- **SELECT / DESELECT / REORDER**: батч раз в 1 секунду
- Если SELECT и DESELECT для одного ID одновременно — второй отменяет первый

### Drag & Drop с фильтром
- Перетаскивание работает на отфильтрованном списке
- После DnD пересчитывается полный порядок через `mergeSortedVisible()`
- Невидимые элементы сохраняют свои относительные позиции

## Локальный запуск

```bash
# Установить зависимости
npm run install:all

# Запустить сервер (порт 3001)
npm run dev:server

# Запустить клиент (порт 3000) — в другом терминале
npm run dev:client
```

Открыть: http://localhost:3000

## Деплой на Railway

### Вариант 1: через CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Вариант 2: через GitHub

1. Создать репозиторий на GitHub и запушить код
2. Зайти на [railway.app](https://railway.app)
3. "New Project" → "Deploy from GitHub repo"
4. Выбрать репозиторий
5. Railway автоматически прочитает `railway.json`
6. После деплоя: Settings → Generate Domain

## API

| Метод  | URL                    | Описание                              |
|--------|------------------------|---------------------------------------|
| GET    | /api/items             | Список доступных (filter, offset)     |
| POST   | /api/items             | Добавить новый ID `{ id: number }`    |
| GET    | /api/selected          | Список выбранных (filter, offset)     |
| POST   | /api/selected/:id      | Выбрать элемент                       |
| DELETE | /api/selected/:id      | Снять выбор                           |
| PUT    | /api/selected/reorder  | Новый порядок `{ order: number[] }`   |
