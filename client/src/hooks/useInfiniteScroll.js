/**
 * hooks/useInfiniteScroll.js
 *
 * Хук для инфинити-скролла.
 * Наблюдает за sentinel-элементом (последний в списке) через IntersectionObserver.
 * Когда sentinel попадает в viewport — вызывает onLoadMore.
 *
 * @param {Function} onLoadMore — колбэк загрузки следующей страницы
 * @param {boolean}  hasMore    — есть ли ещё данные (если нет — не вешаем observer)
 */

import { useEffect, useRef } from 'react';

export function useInfiniteScroll(onLoadMore, hasMore) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore) return;
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,       // viewport
        rootMargin: '0px',
        threshold: 0.1,   // 10% видимости достаточно
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  return sentinelRef;
}
