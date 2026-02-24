/**
 * routes/selected.js — эндпоинты для работы с выбранными элементами (правая панель).
 *
 * GET    /api/selected           — получить страницу выбранных элементов
 * POST   /api/selected/:id       — выбрать элемент (перенести влево→вправо)
 * DELETE /api/selected/:id       — снять выбор (вернуть вправо→влево)
 * PUT    /api/selected/reorder   — применить новый порядок (Drag&Drop)
 */

const express = require('express');
const router = express.Router();

const { getSelectedItems } = require('../state');
const { enqueueSelect, enqueueDeselect, enqueueReorder } = require('../queue');

/**
 * GET /api/selected
 * Query params:
 *   filter  {string}  — поиск по ID
 *   offset  {number}  — пагинация
 *   limit   {number}  — размер страницы (max 20)
 */
router.get('/', (req, res) => {
  const filter = req.query.filter || '';
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit  = Math.min(20, Math.max(1, parseInt(req.query.limit,  10) || 20));

  const items = getSelectedItems(filter, offset, limit);

  res.json({ items, offset, limit });
});

/**
 * POST /api/selected/:id
 * Ставит в очередь выбор элемента.
 */
router.post('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Некорректный ID' });
  }

  const queued = enqueueSelect(id);

  if (!queued) {
    return res.status(409).json({ error: 'Операция уже в очереди' });
  }

  res.status(202).json({ message: 'В очереди на выбор', id });
});

/**
 * DELETE /api/selected/:id
 * Ставит в очередь снятие выбора.
 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Некорректный ID' });
  }

  const queued = enqueueDeselect(id);

  if (!queued) {
    return res.status(409).json({ error: 'Операция уже в очереди' });
  }

  res.status(202).json({ message: 'В очереди на снятие выбора', id });
});

/**
 * PUT /api/selected/reorder
 * Body: { order: number[] } — полный новый порядок выбранных ID.
 */
router.put('/reorder', (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order должен быть массивом' });
  }

  enqueueReorder(order);

  res.status(202).json({ message: 'Порядок в очереди на обновление' });
});

module.exports = router;
