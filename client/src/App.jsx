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
  // Храним последний выбранный ID для оптимистичного обновления правого столбца
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const handleItemSelected = (id) => {
    setLastSelectedId(id);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Менеджер элементов</h1>
        <span className="app-subtitle">1 000 000 элементов</span>
      </header>

      <main className="app-panels">
        <LeftPanel onItemSelected={handleItemSelected} />
        <RightPanel lastSelectedId={lastSelectedId} />
      </main>
    </div>
  );
}
