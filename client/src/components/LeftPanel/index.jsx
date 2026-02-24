/**
 * LeftPanel/index.jsx — левая панель.
 *
 * Функции:
 *   - Отображает все доступные (невыбранные) элементы
 *   - Фильтрация по ID
 *   - Инфинити-скролл (порции по 20)
 *   - Добавление нового элемента с произвольным ID
 *   - Клик по элементу → выбор (перенос вправо)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchItems, queueSelectItem, queueAddItem } from '../../api/queue';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useDebounce } from '../../hooks/useDebounce';
import styles from './LeftPanel.module.css';

const PAGE_SIZE = 20;

export default function LeftPanel({ onItemSelected }) {
  const [items, setItems]       = useState([]);
  const [filter, setFilter]     = useState('');
  const [offset, setOffset]     = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [newId, setNewId]       = useState('');
  const [addError, setAddError] = useState('');

  const debouncedFilter = useDebounce(filter, 400);

  // ─── Загрузка данных ────────────────────────────────────────────────────

  const loadItems = useCallback(async (currentOffset, currentFilter, replace = false) => {
    setLoading(true);
    try {
      const data = await fetchItems(currentFilter, currentOffset);
      setItems(prev => replace ? data.items : [...prev, ...data.items]);
      setHasMore(data.items.length === PAGE_SIZE);
      setOffset(currentOffset + data.items.length);
    } catch (err) {
      console.error('Ошибка загрузки элементов:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Перезагружаем при изменении фильтра
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    loadItems(0, debouncedFilter, true);
  }, [debouncedFilter, loadItems]);

  // Следующая страница (инфинити-скролл)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadItems(offset, debouncedFilter);
    }
  }, [loading, hasMore, offset, debouncedFilter, loadItems]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading);

  // Периодическое обновление данных (1 раз в секунду)
  // Нужно чтобы список отражал реальное состояние после батч-выполнения
  const refreshTimerRef = useRef(null);
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      setItems([]);
      setOffset(0);
      setHasMore(true);
      loadItems(0, debouncedFilter, true);
    }, 1_000);

    return () => clearInterval(refreshTimerRef.current);
  }, [debouncedFilter, loadItems]);

  // ─── Выбор элемента ─────────────────────────────────────────────────────

  const handleSelectItem = (id) => {
    queueSelectItem(id);
    // Оптимистичное обновление: убираем из списка сразу
    setItems(prev => prev.filter(itemId => itemId !== id));
    onItemSelected?.(id);
  };

  // ─── Добавление нового элемента ─────────────────────────────────────────

  const handleAddItem = () => {
    const id = parseInt(newId, 10);

    if (!id || isNaN(id) || id <= 0) {
      setAddError('Введите положительное число');
      return;
    }

    const queued = queueAddItem(id);
    if (!queued) {
      setAddError('Этот ID уже в очереди или существует');
      return;
    }

    setAddError('');
    setNewId('');
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') handleAddItem();
  };

  // ─── Рендер ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Все элементы</h2>

      {/* Поиск */}
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Фильтр по ID..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {/* Добавление нового */}
      <div className={styles.addRow}>
        <input
          type="number"
          className={styles.addInput}
          placeholder="Новый ID"
          value={newId}
          onChange={e => setNewId(e.target.value)}
          onKeyDown={handleAddKeyDown}
        />
        <button className={styles.addButton} onClick={handleAddItem}>
          + Добавить
        </button>
      </div>
      {addError && <p className={styles.error}>{addError}</p>}

      {/* Список */}
      <div className={styles.list}>
        {items.map(id => (
          <div
            key={id}
            className={styles.item}
            onClick={() => handleSelectItem(id)}
            title="Нажмите чтобы выбрать"
          >
            <span className={styles.itemId}>#{id}</span>
            <span className={styles.itemArrow}>→</span>
          </div>
        ))}

        {/* Sentinel для IntersectionObserver */}
        <div ref={sentinelRef} className={styles.sentinel} />

        {loading && <p className={styles.loading}>Загрузка...</p>}
        {!hasMore && items.length > 0 && (
          <p className={styles.end}>Конец списка</p>
        )}
      </div>
    </div>
  );
}
