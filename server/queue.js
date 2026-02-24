/**
 * queue.js — очередь запросов с дедупликацией.
 *
 * Принцип работы:
 *   - Каждая операция имеет строковый ключ (тип + payload).
 *   - Если операция с таким ключом уже есть в очереди — новая игнорируется.
 *   - Очередь сбрасывается по таймеру (батчинг):
 *       ADD_ITEM:  раз в 10 секунд
 *       остальные: раз в 1 секунду
 */

const { addItem, selectItem, deselectItem, reorderSelected } = require('./state');

// Тип операции → интервал батча в мс
const BATCH_INTERVALS = {
  ADD_ITEM: 10_000,
  SELECT:   1_000,
  DESELECT: 1_000,
  REORDER:  1_000,
};

/**
 * Одна очередь для одного типа операций.
 */
class OperationQueue {
  constructor(type, flushFn, intervalMs) {
    this.type = type;
    this.flushFn = flushFn;
    this.intervalMs = intervalMs;

    /** @type {Map<string, any>} ключ → payload */
    this.pending = new Map();

    // Запускаем батч-таймер
    setInterval(() => this.flush(), intervalMs);
  }

  /**
   * Добавляет операцию в очередь.
   * @param {string} key       — уникальный ключ для дедупликации
   * @param {any}    payload   — данные операции
   * @returns {boolean} false если операция уже есть в очереди (дедупликация)
   */
  enqueue(key, payload) {
    if (this.pending.has(key)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Queue:${this.type}] Дедупликация: ключ "${key}" уже есть`);
      }
      return false;
    }

    this.pending.set(key, payload);
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Queue:${this.type}] Добавлено: "${key}", в батче сейчас ${this.pending.size} операций`,
      );
    }
    return true;
  }

  /**
   * Выполняет все накопленные операции.
   */
  flush() {
    if (this.pending.size === 0) return;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Queue:${this.type}] Выполняем батч из ${this.pending.size} операций`);
    }

    for (const [key, payload] of this.pending) {
      try {
        this.flushFn(payload);
      } catch (err) {
        console.error(`[Queue:${this.type}] Ошибка при выполнении "${key}":`, err);
      }
    }

    this.pending.clear();
  }
}

// ─── Инициализация очередей ──────────────────────────────────────────────────

const addItemQueue = new OperationQueue(
  'ADD_ITEM',
  (id) => addItem(id),
  BATCH_INTERVALS.ADD_ITEM,
);

const selectQueue = new OperationQueue(
  'SELECT',
  (id) => selectItem(id),
  BATCH_INTERVALS.SELECT,
);

const deselectQueue = new OperationQueue(
  'DESELECT',
  (id) => deselectItem(id),
  BATCH_INTERVALS.DESELECT,
);

const reorderQueue = new OperationQueue(
  'REORDER',
  (order) => reorderSelected(order),
  BATCH_INTERVALS.REORDER,
);

// ─── Публичное API очереди ───────────────────────────────────────────────────

/**
 * Постановка в очередь добавления нового элемента.
 * Дедупликация по ID.
 */
function enqueueAddItem(id) {
  return addItemQueue.enqueue(String(id), id);
}

/**
 * Постановка в очередь выбора элемента.
 */
function enqueueSelect(id) {
  return selectQueue.enqueue(`select:${id}`, id);
}

/**
 * Постановка в очередь снятия выбора.
 */
function enqueueDeselect(id) {
  return deselectQueue.enqueue(`deselect:${id}`, id);
}

/**
 * Постановка в очередь изменения порядка.
 * Всегда одна операция reorder (последняя побеждает через flush).
 */
function enqueueReorder(newOrder) {
  // Ключ фиксированный — новый reorder заменяет предыдущий в pending
  reorderQueue.pending.set('reorder', newOrder); // намеренно override
  return true;
}

module.exports = {
  enqueueAddItem,
  enqueueSelect,
  enqueueDeselect,
  enqueueReorder,
};
