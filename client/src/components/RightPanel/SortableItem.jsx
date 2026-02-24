/**
 * RightPanel/SortableItem.jsx — один перетаскиваемый элемент.
 *
 * Использует useSortable из @dnd-kit/sortable.
 * Показывает визуальный placeholder во время перетаскивания.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS }         from '@dnd-kit/utilities';
import styles from './RightPanel.module.css';

export default function SortableItem({ id, onDeselect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex:  isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
    >
      {/* Иконка перетаскивания */}
      <span
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        title="Перетащить"
      >
        ⠿
      </span>

      <span className={styles.itemId}>#{id}</span>

      {/* Кнопка снятия выбора */}
      <button
        className={styles.removeButton}
        onClick={() => onDeselect(id)}
        title="Убрать из выбранных"
      >
        ✕
      </button>
    </div>
  );
}
