/**
 * App.jsx — корневой компонент.
 *
 * Компоновка: два равных столбца (LeftPanel | RightPanel).
 * Передаёт refreshTrigger в RightPanel чтобы он обновлялся
 * после выбора элемента в LeftPanel.
 */

import React, { useState } from 'react';
import LeftPanel  from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import './App.css';

export default function App() {
  // Инкрементируем при каждом выборе — RightPanel обновляется
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleItemSelected = () => {
    setRefreshTrigger(n => n + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Менеджер элементов</h1>
        <span className="app-subtitle">1 000 000 элементов</span>
      </header>

      <main className="app-panels">
        <LeftPanel onItemSelected={handleItemSelected} />
        <RightPanel refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}
