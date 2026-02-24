/**
 * routes/items.js — эндпоинты для работы с доступными элементами (левая панель).
 *
 * GET  /api/items       — получить страницу доступных элементов
 * POST /api/items       — добавить новый элемент в очередь
 */

const express = require('express');
const router = express.Router();

const { getAvailableItems } = require('../state');
const { enqueueAddItem } = require('../queue');

/**
 * GET /api/items
 * Query params:
 *   filter  {string}  — поиск по ID (подстрока)
 *   offset  {number}  — пагинация, сколько пропустить (default: 0)
 *   limit   {number}  — сколько вернуть (default: 20, max: 20)
 */
router.get('/', (req, res) => {
  const filter = req.query.filter || '';
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit  = Math.min(20, Math.max(1, parseInt(req.query.limit,  10) || 20));

  const items = getAvailableItems(filter, offset, limit);

  res.json({ items, offset, limit });
});

/**
 * POST /api/items
 * Body: { id: number }
 *
 * Добавляет новый ID в пул через очередь с дедупликацией.
 * Ответ не гарантирует мгновенного применения — операция в очереди (батч 10 сек).
 */
router.post('/', (req, res) => {
  const id = parseInt(req.body.id, 10);

  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID должен быть положительным числом' });
  }

  const queued = enqueueAddItem(id);

  if (!queued) {
    return res.status(409).json({ error: 'Элемент с таким ID уже есть в очереди или существует' });
  }

  res.status(202).json({ message: 'Добавлено в очередь', id });
});

module.exports = router;
