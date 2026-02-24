/**
 * RightPanel/index.jsx — правая панель.
 *
 * Функции:
 *   - Отображает выбранные элементы
 *   - Фильтрация по ID (поиск не сохраняется)
 *   - Drag & Drop сортировка (работает и в отфильтрованном виде)
 *   - Инфинити-скролл
 *   - Клик ✕ → снятие выбора
 *
 * Сортировка работает так:
 *   - Показываем отфильтрованное подмножество
 *   - После DnD пересчитываем полный порядок, сохраняя позиции невидимых элементов
 *   - Отправляем полный массив на сервер через очередь
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { fetchSelected, queueDeselectItem, queueReorder } from '../../api/queue';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useDebounce } from '../../hooks/useDebounce';
import SortableItem from './SortableItem';
import styles from './RightPanel.module.css';

const PAGE_SIZE = 20;

export default function RightPanel({ refreshTrigger }) {
  const [allItems, setAllItems]   = useState([]);  // полный список всех загруженных ID в нужном порядке
  const [filter, setFilter]       = useState('');
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);

  const debouncedFilter = useDebounce(filter, 400);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // начать перетаскивание после 5px
    })
  );

  // ─── Загрузка данных ────────────────────────────────────────────────────

  const loadItems = useCallback(async (currentOffset, currentFilter, replace = false) => {
    setLoading(true);
    try {
      const data = await fetchSelected(currentFilter, currentOffset);
      setAllItems(prev => replace ? data.items : [...prev, ...data.items]);
      setHasMore(data.items.length === PAGE_SIZE);
      setOffset(currentOffset + data.items.length);
    } catch (err) {
      console.error('Ошибка загрузки выбранных:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Перезагрузка при смене фильтра
  useEffect(() => {
    setAllItems([]);
    setOffset(0);
    setHasMore(true);
    loadItems(0, debouncedFilter, true);
  }, [debouncedFilter, loadItems]);

  // Обновление при добавлении нового элемента из левой панели
  useEffect(() => {
    if (refreshTrigger > 0) {
      setAllItems([]);
      setOffset(0);
      setHasMore(true);
      loadItems(0, debouncedFilter, true);
    }
  }, [refreshTrigger, debouncedFilter, loadItems]);

  // Периодическое обновление данных
  const refreshTimerRef = useRef(null);
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      setAllItems([]);
      setOffset(0);
      setHasMore(true);
      loadItems(0, debouncedFilter, true);
    }, 1_000);

    return () => clearInterval(refreshTimerRef.current);
  }, [debouncedFilter, loadItems]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadItems(offset, debouncedFilter);
    }
  }, [loading, hasMore, offset, debouncedFilter, loadItems]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading);

  // ─── Видимые элементы (с учётом фильтра) ───────────────────────────────

  const visibleItems = debouncedFilter
    ? allItems.filter(id => String(id).includes(debouncedFilter.trim()))
    : allItems;

  // ─── Drag & Drop ────────────────────────────────────────────────────────

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Находим индексы в visibleItems
    const oldVisibleIndex = visibleItems.indexOf(active.id);
    const newVisibleIndex = visibleItems.indexOf(over.id);

    // Создаём новый порядок видимых
    const newVisibleOrder = arrayMove(visibleItems, oldVisibleIndex, newVisibleIndex);

    // Перестраиваем полный список, вставляя видимые на их позиции
    // Невидимые элементы остаются на своих местах между видимыми
    const newFullOrder = mergeSortedVisible(allItems, newVisibleOrder, debouncedFilter);

    setAllItems(newFullOrder);
    queueReorder(newFullOrder);
  };

  // ─── Снятие выбора ──────────────────────────────────────────────────────

  const handleDeselect = (id) => {
    queueDeselectItem(id);
    setAllItems(prev => prev.filter(itemId => itemId !== id));
  };

  // ─── Рендер ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        Выбранные
        {allItems.length > 0 && (
          <span className={styles.count}>{allItems.length}</span>
        )}
      </h2>

      <input
        type="text"
        className={styles.searchInput}
        placeholder="Фильтр по ID..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      <div className={styles.list}>
        {visibleItems.length === 0 && !loading && (
          <p className={styles.empty}>
            {debouncedFilter ? 'Ничего не найдено' : 'Выберите элементы из левого списка'}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={visibleItems}
            strategy={verticalListSortingStrategy}
          >
            {visibleItems.map(id => (
              <SortableItem
                key={id}
                id={id}
                onDeselect={handleDeselect}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div ref={sentinelRef} className={styles.sentinel} />

        {loading && <p className={styles.loading}>Загрузка...</p>}
        {!hasMore && allItems.length > 0 && (
          <p className={styles.end}>Все элементы загружены</p>
        )}
      </div>
    </div>
  );
}

// ─── Вспомогательная функция ────────────────────────────────────────────────

/**
 * Объединяет полный список с новым порядком видимых элементов.
 * Невидимые сохраняют свои относительные позиции.
 *
 * @param {number[]} fullList     — полный порядок до перетаскивания
 * @param {number[]} newVisible   — новый порядок видимых
 * @param {string}   filter       — текущий фильтр
 * @returns {number[]}
 */
function mergeSortedVisible(fullList, newVisible, filter) {
  const filterStr = filter.trim().toLowerCase();
  const visibleSet = new Set(newVisible);

  // Позиции в fullList, которые занимали видимые элементы
  const positions = fullList
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => !filterStr || String(id).includes(filterStr))
    .map(({ index }) => index);

  const result = [...fullList];

  // Расставляем новый порядок на те же позиции
  newVisible.forEach((id, i) => {
    result[positions[i]] = id;
  });

  return result;
}
