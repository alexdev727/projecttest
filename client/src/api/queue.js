/**
 * api/queue.js — клиентская очередь запросов с дедупликацией и батчингом.
 *
 * Логика:
 *   - ADD операции батчатся раз в 10 секунд
 *   - SELECT / DESELECT / REORDER батчатся раз в 1 секунду
 *   - Дедупликация: повторный вызов с тем же ключом игнорируется
 */

const BASE_URL = "/api";

// ─── Утилита для HTTP запросов ───────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Класс очереди ───────────────────────────────────────────────────────────

class BatchQueue {
  /**
   * @param {string}   name        — название для логов
   * @param {Function} executeFn   — функция (entries) => Promise<void>
   * @param {number}   intervalMs  — интервал батча
   */
  constructor(name, executeFn, intervalMs) {
    this.name = name;
    this.executeFn = executeFn;
    this.intervalMs = intervalMs;

    /** @type {Map<string, any>} */
    this.pending = new Map();

    setInterval(() => this.flush(), intervalMs);
  }

  /**
   * Добавить операцию в очередь.
   * @param {string} key     — ключ дедупликации
   * @param {any}    payload — данные
   * @returns {boolean} false если уже есть
   */
  enqueue(key, payload) {
    if (this.pending.has(key)) return false;
    this.pending.set(key, payload);
    return true;
  }

  /**
   * Форсировать ключ (override, используется для reorder).
   */
  override(key, payload) {
    this.pending.set(key, payload);
  }

  async flush() {
    if (this.pending.size === 0) return;

    const entries = [...this.pending.entries()];
    this.pending.clear();

    for (const [key, payload] of entries) {
      try {
        await this.executeFn(payload);
      } catch (err) {
        console.error(`[Queue:${this.name}] Ошибка "${key}":`, err.message);
      }
    }
  }
}

// ─── Экземпляры очередей ────────────────────────────────────────────────────

const addQueue = new BatchQueue(
  "ADD",
  (id) => apiFetch("/items", { method: "POST", body: JSON.stringify({ id }) }),
  10_000,
);

const selectQueue = new BatchQueue(
  "SELECT",
  (id) => apiFetch(`/selected/${id}`, { method: "POST" }),
  1_000,
);

const deselectQueue = new BatchQueue(
  "DESELECT",
  (id) => apiFetch(`/selected/${id}`, { method: "DELETE" }),
  1_000,
);

const reorderQueue = new BatchQueue(
  "REORDER",
  (order) =>
    apiFetch("/selected/reorder", {
      method: "PUT",
      body: JSON.stringify({ order }),
    }),
  1_000,
);

// ─── Публичный API ───────────────────────────────────────────────────────────

export function queueAddItem(id) {
  return addQueue.enqueue(String(id), id);
}

export function queueSelectItem(id) {
  // Если уже ждёт deselect — отменяем его
  deselectQueue.pending.delete(`deselect:${id}`);
  return selectQueue.enqueue(`select:${id}`, id);
}

export function queueDeselectItem(id) {
  // Если уже ждёт select — отменяем его
  selectQueue.pending.delete(`select:${id}`);
  return deselectQueue.enqueue(`deselect:${id}`, id);
}

export function queueReorder(order) {
  reorderQueue.override("reorder", order);
}

// ─── Прямые GET-запросы (без очереди — это чтение данных) ──────────────────

export function fetchItems(filter, offset) {
  const params = new URLSearchParams();
  if (filter != null && filter !== "") params.set("filter", filter);
  if (offset != null) params.set("offset", String(offset));
  params.set("limit", "20");
  return apiFetch(`/items?${params.toString()}`);
}

export function fetchSelected(filter, offset) {
  const params = new URLSearchParams();
  if (filter != null && filter !== "") params.set("filter", filter);
  if (offset != null) params.set("offset", String(offset));
  params.set("limit", "20");
  return apiFetch(`/selected?${params.toString()}`);
}
