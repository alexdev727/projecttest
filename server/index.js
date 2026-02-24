/**
 * index.js — точка входа Express-сервера.
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const itemsRouter    = require('./routes/items');
const selectedRouter = require('./routes/selected');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── API маршруты ────────────────────────────────────────────────────────────

app.use('/api/items',    itemsRouter);
app.use('/api/selected', selectedRouter);

// ─── Раздача статики (React build) ──────────────────────────────────────────

const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));

// Все не-API маршруты отдают index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ─── Старт ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
});
