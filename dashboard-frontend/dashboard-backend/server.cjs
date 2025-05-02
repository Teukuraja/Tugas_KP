const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./data.db", (err) => {
  if (err) console.error("Database connection error:", err.message);
});

// === TABEL ===
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS barang_masuk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT, kode TEXT, nama TEXT, jumlah INTEGER, satuan TEXT, unit TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS barang_keluar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT, kode TEXT, nama TEXT, jumlah INTEGER, satuan TEXT, unit TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT, kode TEXT, nama TEXT, alias TEXT, jumlah INTEGER, satuan TEXT, unit TEXT
  )`);
});

const upload = multer({ dest: "uploads/" });

function normalizeUnit(unit) {
  if (!unit || unit.trim() === "" || unit.trim() === "-") return "Tanpa Unit";
  const map = {
    "BM100": "BM 100",
    "BROKK BM 100": "BM 100",
    "BM 90": "BM 90",
    "BROKK BM 90": "BM 90",
    "Forklift 3T": "Forklift",
    "Forklift 3 Ton": "Forklift",
    "Forklift": "Forklift",
    "forklift": "Forklift",
    "FORKLIFT": "Forklift",
    "HCR 120D": "HCR 120D",
    "Excavator 01": "Excavator 01",
    "Excavator 02": "Excavator 02",
  };
  return map[unit.trim()] || unit.trim();
}

function convertExcelDate(excelDate) {
  if (typeof excelDate === "number") {
    return new Date((excelDate - 25569) * 86400 * 1000).toISOString().split("T")[0];
  }
  const parsed = new Date(excelDate);
  return !isNaN(parsed.getTime()) ? parsed.toISOString().split("T")[0] : "";
}

function syncInventory(kode, nama, delta, satuan, unit) {
  const today = new Date().toISOString().split("T")[0];
  db.get(`SELECT * FROM inventory WHERE kode = ? AND unit = ?`, [kode, unit], (err, row) => {
    if (row) {
      const newJumlah = Math.max(0, row.jumlah + delta);
      db.run(`UPDATE inventory SET jumlah = ?, tanggal = ? WHERE id = ?`, [newJumlah, today, row.id]);
    } else if (delta > 0) {
      db.run(`INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [today, kode, nama, delta, satuan, unit]);
    }
  });
}

// ========== LOGIN ==========
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== "admin" || password !== "admin") {
    return res.status(401).json({ success: false, message: "Login gagal" });
  }
  res.json({ success: true });
});

// ========== API ==========
app.get("/api/barang-masuk", (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM barang_masuk";
  const params = [];
  if (unit && unit !== "Semua Unit") {
    query += " WHERE unit = ?";
    params.push(unit);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/barang-masuk", (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const finalUnit = normalizeUnit(unit);
  db.run(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, finalUnit], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      syncInventory(kode, nama, jumlah, satuan, finalUnit);
      res.json({ id: this.lastID });
    });
});

app.get("/api/barang-keluar", (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM barang_keluar";
  const params = [];
  if (unit && unit !== "Semua Unit") {
    query += " WHERE unit = ?";
    params.push(unit);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/barang-keluar", (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const finalUnit = normalizeUnit(unit);
  db.run(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, finalUnit], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.get("/api/inventory", (req, res) => {
  const unit = req.query.unit;
  let query = "SELECT * FROM inventory";
  const params = [];
  if (unit && unit !== "Semua Unit") {
    query += " WHERE unit = ?";
    params.push(unit);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/reset-data", (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM barang_masuk");
    db.run("DELETE FROM barang_keluar");
    db.run("DELETE FROM inventory");
    res.json({ message: "Data berhasil direset" });
  });
});

// ========== UPLOAD ==========
function autoKode(prefix) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

app.post("/upload-inventory", upload.single("file"), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const stmt = db.prepare("INSERT INTO inventory (tanggal, kode, nama, alias, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?, ?)");

    db.serialize(() => {
      data.forEach(item => {
        const tanggal = convertExcelDate(item.Tanggal);
        const kode = item.Kode || autoKode("INV");
        const nama = item["Nama Barang"] || "";
        const alias = item.Alias || "";
        const jumlah = parseInt(item["Sisa Akhir"] || item.Jumlah || 0);
        const satuan = item.Satuan || "";
        const unit = normalizeUnit(item.Unit || "");

        if (!nama || !kode) return;
        stmt.run(tanggal, kode, nama, alias, jumlah, satuan, unit);
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

app.post("/upload-barang-masuk", upload.single("file"), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    db.serialize(() => {
      data.forEach(item => {
        const tanggal = convertExcelDate(item.Tanggal);
        const kode = item.Kode || autoKode("IN");
        const nama = item["Nama Barang"] || "";
        const jumlah = parseInt(item.Jumlah || 0);
        const satuan = item.Satuan || "";
        const unit = normalizeUnit(item.Unit || "");

        if (!kode || !nama || !jumlah) return;
        db.run(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
          [tanggal, kode, nama, jumlah, satuan, unit]);
        syncInventory(kode, nama, jumlah, satuan, unit);
      });
    });

    fs.unlinkSync(req.file.path);
    res.json({ message: 'Barang masuk berhasil diupload!' });
  } catch (err) {
    console.error("Upload Barang Masuk Error:", err);
    res.status(500).json({ message: 'Gagal upload barang masuk' });
  }
});

app.post("/upload-barang-keluar", upload.single("file"), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    db.serialize(() => {
      data.forEach(item => {
        const tanggal = convertExcelDate(item.Tanggal);
        const kode = item.Kode || autoKode("OUT");
        const nama = item["Nama Barang"] || "";
        const jumlah = parseInt(item.Jumlah || 0);
        const satuan = item.Satuan || "";
        const unit = normalizeUnit(item.Unit || "");

        if (!nama || !jumlah) return;
        db.run(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
          [tanggal, kode, nama, jumlah, satuan, unit]);
      });
    });

    fs.unlinkSync(req.file.path);
    res.json({ message: 'Barang keluar berhasil diupload!' });
  } catch (err) {
    console.error("Upload Barang Keluar Error:", err);
    res.status(500).json({ message: 'Gagal upload barang keluar' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server ready di http://localhost:${PORT}`);
});