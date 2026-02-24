/**
 * hooks/useDebounce.js
 *
 * Откладывает обновление значения на delay миллисекунд.
 * Используется для поиска — не делаем запрос на каждый символ.
 */

import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
