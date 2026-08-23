require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskdb';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Fallback: mọi route khác trả về giao diện SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB đã kết nối:', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  }
}

start();
