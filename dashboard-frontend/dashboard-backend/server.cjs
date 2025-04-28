// src/server.js
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Setup Database
const db = new sqlite3.Database('./data.db', (err) => {
  if (err) console.error('Database connection error:', err.message);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS barang_masuk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT,
    kode TEXT,
    nama TEXT,
    jumlah INTEGER,
    satuan TEXT,
    unit TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS barang_keluar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT,
    kode TEXT,
    nama TEXT,
    jumlah INTEGER,
    satuan TEXT,
    unit TEXT
  )`);
});

const upload = multer({ dest: 'uploads/' });

function normalizeUnit(unit) {
  if (!unit || unit.trim() === '' || unit.trim() === '-') return 'Tanpa Unit';
  const map = {
    'BM 100': 'BM 100',
    'BM100': 'BM 100',
    'BROKK BM 100': 'BM 100',
    'BM 90': 'BM 90',
    'BROKK BM 90': 'BM 90',
    'Forklift 3T': 'Forklift',
    'Forklift 3 Ton': 'Forklift',
    'HCR 120D': 'HCR 120D',
    'Breaker Excavator 02': 'Excavator 02',
  };
  const cleaned = unit.trim();
  if (['Excavator', 'Excavator 01', 'Excavator 02'].includes(cleaned)) return cleaned;
  return map[cleaned] || cleaned;
}

function convertExcelDate(excelDate) {
  if (typeof excelDate === 'number') {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return '';
}

// 🔥 Setup Login Admin Super Simple (tanpa bcrypt)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ success: false, message: "Username salah" });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Password salah" });
  }

  res.json({ success: true });
});

// Upload dan CRUD Barang
app.post('/upload-barang-masuk', upload.single('file'), (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const stmt = db.prepare(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`);

  db.serialize(() => {
    data.forEach(item => {
      const tanggal = convertExcelDate(item.Tanggal);
      const unit = normalizeUnit(item.Unit);
      stmt.run(tanggal, item.Kode, item['Nama Barang'], item.Jumlah, item.Satuan, unit);
    });
  });

  stmt.finalize();
  fs.unlinkSync(req.file.path);
  res.json({ message: 'Barang masuk berhasil diupload!' });
});

app.post('/upload-barang-keluar', upload.single('file'), (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const stmt = db.prepare(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`);

  db.serialize(() => {
    data.forEach(item => {
      const tanggal = convertExcelDate(item.Tanggal);
      const unit = normalizeUnit(item.Unit);
      stmt.run(tanggal, item.Kode, item['Nama Barang'], item.Jumlah, item.Satuan, unit);
    });
  });

  stmt.finalize();
  fs.unlinkSync(req.file.path);
  res.json({ message: 'Barang keluar berhasil diupload!' });
});

app.get('/api/barang-masuk', (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM barang_masuk";
  const params = [];

  if (unit && unit !== 'Semua Unit') {
    query += " WHERE unit = ?";
    params.push(unit);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/barang-keluar', (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM barang_keluar";
  const params = [];

  if (unit && unit !== 'Semua Unit') {
    query += " WHERE unit = ?";
    params.push(unit);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CRUD Barang Masuk
app.post('/api/barang-masuk', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  db.run(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, unit],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.put('/api/barang-masuk/:id', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const { id } = req.params;
  db.run(`UPDATE barang_masuk SET tanggal=?, kode=?, nama=?, jumlah=?, satuan=?, unit=? WHERE id=?`,
    [tanggal, kode, nama, jumlah, satuan, unit, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Barang masuk berhasil diupdate' });
    });
});

app.delete('/api/barang-masuk/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM barang_masuk WHERE id=?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Barang masuk berhasil dihapus' });
  });
});

// CRUD Barang Keluar
app.post('/api/barang-keluar', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  db.run(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, unit],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.put('/api/barang-keluar/:id', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const { id } = req.params;
  db.run(`UPDATE barang_keluar SET tanggal=?, kode=?, nama=?, jumlah=?, satuan=?, unit=? WHERE id=?`,
    [tanggal, kode, nama, jumlah, satuan, unit, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Barang keluar berhasil diupdate' });
    });
});

app.delete('/api/barang-keluar/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM barang_keluar WHERE id=?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Barang keluar berhasil dihapus' });
  });
});

// Reset Data
app.post('/reset-data', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM barang_masuk');
    db.run('DELETE FROM barang_keluar');
    res.json({ message: 'Semua data berhasil direset!' });
  });
});

app.get('/api/unit-barang-keluar', (req, res) => {
  db.all("SELECT DISTINCT unit FROM barang_keluar WHERE unit IS NOT NULL AND unit != ''", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => row.unit));
  });
});

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});
