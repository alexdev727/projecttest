/**
 * state.js — единственный источник правды для всего приложения.
 *
 * Структуры данных:
 *   allIds        — Set<number>  все существующие ID (1..1_000_000 + добавленные)
 *   selectedIds   — Set<number>  выбранные пользователем ID
 *   selectedOrder — number[]     порядок выбранных (поддерживает Drag&Drop)
 *
 * Все мутации идут только через экспортируемые функции, что упрощает отладку.
 */

const INITIAL_SIZE = 1_000_000;

// ─── Инициализация ──────────────────────────────────────────────────────────

/**
 * Генерируем Set с ID 1..1_000_000.
 * Set быстрее Array для проверки has() — O(1).
 */
const allIds = new Set();
for (let i = 1; i <= INITIAL_SIZE; i++) {
  allIds.add(i);
}

const selectedIds = new Set();   // ID выбранных элементов
let selectedOrder = [];          // Упорядоченный массив выбранных ID

// ─── Читатели ────────────────────────────────────────────────────────────────

/**
 * Возвращает массив ID которые НЕ выбраны, опционально фильтрует по подстроке.
 * @param {string} filter — строка для поиска по ID
 * @param {number} offset — сколько пропустить (пагинация)
 * @param {number} limit  — сколько вернуть
 */
function getAvailableItems(filter = '', offset = 0, limit = 20) {
  const filterStr = filter.trim().toLowerCase();

  const result = [];
  let skipped = 0;

  for (const id of allIds) {
    if (selectedIds.has(id)) continue;

    const idStr = String(id);
    if (filterStr && !idStr.includes(filterStr)) continue;

    if (skipped < offset) {
      skipped++;
      continue;
    }

    result.push(id);
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Возвращает массив выбранных ID в сохранённом порядке,
 * опционально фильтрует по подстроке.
 * @param {string} filter
 * @param {number} offset
 * @param {number} limit
 */
function getSelectedItems(filter = '', offset = 0, limit = 20) {
  const filterStr = filter.trim().toLowerCase();

  const filtered = filterStr
    ? selectedOrder.filter(id => String(id).includes(filterStr))
    : selectedOrder;

  return filtered.slice(offset, offset + limit);
}

// ─── Мутаторы ────────────────────────────────────────────────────────────────

/**
 * Добавляет новый ID в общий пул (если ещё не существует).
 * @param {number} id
 * @returns {boolean} true если добавлен, false если уже был
 */
function addItem(id) {
  if (allIds.has(id)) return false;
  allIds.add(id);
  return true;
}

/**
 * Перемещает ID из доступных в выбранные.
 * @param {number} id
 * @returns {boolean} true если перемещён
 */
function selectItem(id) {
  if (!allIds.has(id)) return false;
  if (selectedIds.has(id)) return false;

  selectedIds.add(id);
  selectedOrder.push(id);
  return true;
}

/**
 * Убирает ID из выбранных (возвращает в доступные).
 * @param {number} id
 * @returns {boolean} true если убран
 */
function deselectItem(id) {
  if (!selectedIds.has(id)) return false;

  selectedIds.delete(id);
  selectedOrder = selectedOrder.filter(existingId => existingId !== id);
  return true;
}

/**
 * Применяет новый порядок выбранных элементов (после Drag&Drop).
 * Принимает полный массив ID в новом порядке.
 * @param {number[]} newOrder
 * @returns {boolean} true если порядок применён
 */
function reorderSelected(newOrder) {
  // Проверяем что входящий массив содержит те же ID что и selectedOrder
  if (newOrder.length !== selectedOrder.length) return false;

  const newSet = new Set(newOrder);
  for (const id of selectedIds) {
    if (!newSet.has(id)) return false;
  }

  selectedOrder = newOrder;
  return true;
}

module.exports = {
  getAvailableItems,
  getSelectedItems,
  addItem,
  selectItem,
  deselectItem,
  reorderSelected,
};
