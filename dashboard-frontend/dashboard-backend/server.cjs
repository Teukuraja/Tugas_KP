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
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
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
    'BM100': 'BM 100',
    'BM 100': 'BM 100',
    'BROKK BM 100': 'BM 100',
    'BM 90': 'BM 90',
    'BROKK BM 90': 'BM 90',
    'Forklift 3T': 'Forklift',
    'Forklift 3 Ton': 'Forklift',
    'Forklift': 'Forklift',
    'forklift': 'Forklift',
    'FORKLIFT': 'Forklift',
    'HCR 120D': 'HCR 120D',
    'Excavator 01': 'Excavator 01',
    'Excavator 02': 'Excavator 02',
  };
  const cleaned = unit.trim();
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

function syncInventory(kode, nama, delta, satuan, unit) {
  const today = new Date().toISOString().split("T")[0];
  db.get(`SELECT * FROM inventory WHERE kode = ? AND unit = ?`, [kode, unit], (err, row) => {
    if (err) return console.error("Sync Error:", err.message);
    if (row) {
      const newJumlah = Math.max(0, row.jumlah + delta);
      db.run(`UPDATE inventory SET jumlah = ?, tanggal = ? WHERE id = ?`, [newJumlah, today, row.id]);
    } else if (delta > 0) {
      db.run(`INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [today, kode, nama, delta, satuan, unit]);
    }
  });
}

// ===================== LOGIN =====================
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Login gagal" });
  }
  res.json({ success: true });
});

// ===================== CRUD BARANG MASUK =====================
app.post('/api/barang-masuk', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  db.run(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, unit],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      syncInventory(kode, nama, jumlah, satuan, unit);
      res.json({ id: this.lastID });
    });
});

app.delete('/api/barang-masuk/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM barang_masuk WHERE id = ?`, [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan' });
    db.run(`DELETE FROM barang_masuk WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      syncInventory(row.kode, row.nama, -row.jumlah, row.satuan, row.unit);
      res.json({ message: 'Barang masuk berhasil dihapus' });
    });
  });
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

// ===================== CRUD BARANG KELUAR =====================
app.post('/api/barang-keluar', (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  db.run(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, unit],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      syncInventory(kode, nama, -jumlah, satuan, unit);
      res.json({ id: this.lastID });
    });
});

app.delete('/api/barang-keluar/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM barang_keluar WHERE id = ?`, [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan' });
    db.run(`DELETE FROM barang_keluar WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      syncInventory(row.kode, row.nama, row.jumlah, row.satuan, row.unit);
      res.json({ message: 'Barang keluar berhasil dihapus' });
    });
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

// ===================== INVENTORY =====================
app.get('/api/inventory', (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM inventory";
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

// ===================== UPLOAD INVENTORY FILE =====================
app.post('/upload-inventory', upload.single('file'), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const stmt = db.prepare(`INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`);
    db.serialize(() => {
      data.forEach(item => {
        const tanggal = item.Tanggal ? convertExcelDate(item.Tanggal) : new Date().toISOString().split('T')[0];
        const kode = item.Kode || "";
        const nama = item["Nama Barang"] || "";
        const jumlah = item["Sisa Akhir"] || item.Jumlah || 0;
        const satuan = item.Satuan || "";
        const unit = normalizeUnit(item.Unit);
        stmt.run(tanggal, kode, nama, jumlah, satuan, unit);
      });
    });
    stmt.finalize();
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Inventory berhasil diupload!' });
  } catch (err) {
    console.error("Upload Inventory Error:", err);
    res.status(500).json({ message: 'Gagal upload inventory' });
  }
});

// ===================== RESET SEMUA DATA =====================
app.post('/reset-data', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM barang_masuk');
    db.run('DELETE FROM barang_keluar');
    db.run('DELETE FROM inventory');
    res.json({ message: 'Semua data berhasil direset!' });
  });
});

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});
