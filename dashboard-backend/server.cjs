// ==== DEPENDENCY ====
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Middleware untuk menerima upload file
const upload = multer({ dest: "uploads/" });


// ==== MIDDLEWARE ====
app.use(cors({
  origin: "https://classy-gumption-67c9e2.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// ==== KONEKSI DATABASE ====
const DB_PATH = process.env.DB_PATH || "./data.db";
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("❌ Gagal koneksi ke database:", err.message);
  else console.log("✅ Berhasil koneksi ke database:", DB_PATH);
});

// ==== INISIALISASI TABEL USERS ====
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin']);
    }
  });
});

// ==== TABEL BARANG & INVENTORY ====
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
    tanggal TEXT, kode TEXT, nama TEXT, alias TEXT, jumlah INTEGER, satuan TEXT, unit TEXT,
    UNIQUE(kode, unit)
  )`);
});

// ==== FUNGSI BANTUAN ====
function normalizeUnit(unit) {
  if (!unit || unit.trim() === "" || unit.trim() === "-") return "Tanpa Unit";
  const map = {
    "BM100": "BM 100", "BROKK BM 100": "BM 100",
    "BM 90": "BM 90", "BROKK BM 90": "BM 90",
    "Forklift 3T": "Forklift", "Forklift 3 Ton": "Forklift",
    "Forklift": "Forklift", "forklift": "Forklift", "FORKLIFT": "Forklift",
    "HCR 120D": "HCR 120D",
    "Excavator 01": "Excavator 01", "Excavator 02": "Excavator 02",
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

function syncInventory(kode, nama, satuan, unit) {
  const today = new Date().toISOString().split("T")[0];

  const queryMasuk = `SELECT SUM(jumlah) AS totalMasuk FROM barang_masuk WHERE kode = ? AND unit = ?`;
  const queryKeluar = `SELECT SUM(jumlah) AS totalKeluar FROM barang_keluar WHERE kode = ? AND unit = ?`;

  db.get(queryMasuk, [kode, unit], (err, masuk) => {
    if (err) {
      console.error("Error menghitung barang masuk:", err.message);
      return;
    }

    db.get(queryKeluar, [kode, unit], (err, keluar) => {
      if (err) {
        console.error("Error menghitung barang keluar:", err.message);
        return;
      }

      const jumlahMasuk = masuk?.totalMasuk || 0;
      const jumlahKeluar = keluar?.totalKeluar || 0;
      const jumlahAkhir = jumlahMasuk - jumlahKeluar;

      if (jumlahAkhir > 0) {
        // Update atau insert inventory
        db.get("SELECT * FROM inventory WHERE kode = ? AND unit = ?", [kode, unit], (err, row) => {
          if (row) {
            db.run(`UPDATE inventory SET jumlah = ?, tanggal = ?, nama = ?, satuan = ? WHERE id = ?`,
              [jumlahAkhir, today, nama, satuan, row.id]);
          } else {
            db.run(`INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
              [today, kode, nama, jumlahAkhir, satuan, unit]);
          }
        });
      } else {
        // Hapus dari inventory jika jumlah 0 atau negatif
        db.run("DELETE FROM inventory WHERE kode = ? AND unit = ?", [kode, unit]);
      }
    });
  });
}



app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi" });
  }

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({ error: "Terjadi kesalahan server" });
    }
    if (!row) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    res.json({ success: true, username: row.username });
  });
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

// Tambah Barang Masuk
app.post("/api/barang-masuk", (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const finalUnit = normalizeUnit(unit);

  // Cek apakah barang sudah ada di inventory sebelum ditambahkan ke barang masuk
  db.get("SELECT * FROM inventory WHERE kode = ? AND unit = ?", [kode, finalUnit], (err, inventoryRow) => {
    if (err) {
      console.error("Error saat mengecek inventory:", err.message);
      return res.status(500).json({ error: "Gagal mengecek inventory" });
    }

    let newJumlah = parseInt(jumlah); // Pastikan jumlah adalah number

    // Kalau barangnya sudah ada, tambahkan jumlahnya (dengan konversi tipe data)
    if (inventoryRow) {
      const existingJumlah = parseInt(inventoryRow.jumlah); // Konversi jumlah dari database menjadi number
      newJumlah += existingJumlah; // Penjumlahan angka
      db.run(`UPDATE inventory SET jumlah = ?, tanggal = ? WHERE id = ?`, 
        [newJumlah, tanggal, inventoryRow.id], (err) => {
          if (err) console.error("Error mengupdate jumlah di inventory:", err.message);
      });
      console.log(`Barang masuk: ${nama} (kode: ${kode}) - Jumlah ditambah di inventory.`);
    } else {
      // Kalau barang belum ada, tambahkan barang baru ke inventory
      db.run(`INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [tanggal, kode, nama, newJumlah, satuan, finalUnit], (err) => {
          if (err) console.error("Error menambah barang ke inventory:", err.message);
          else console.log(`Barang masuk: ${nama} (kode: ${kode}) - Barang baru ditambahkan ke inventory.`);
      });
    }

    // Tambahkan ke tabel barang masuk setelah memproses inventory
    db.run(`INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
      [tanggal, kode, nama, jumlah, satuan, finalUnit], function (err) {
        if (err) {
          console.error("Error saat menambah barang masuk:", err.message);
          return res.status(500).json({ error: "Gagal menambah barang masuk" });
        }
        console.log(`Barang masuk dengan kode ${kode} berhasil ditambahkan`);
        res.json({ id: this.lastID });
      });
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
    if (err) {
      console.error("❌ Gagal mengambil data barang keluar:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data" });
    }
    res.json(rows);
  });
});

  
    // Edit Barang Masuk
app.put("/api/barang-masuk/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;

  db.get("SELECT * FROM barang_masuk WHERE id = ?", [id], (err, oldRow) => {
    if (err) {
      console.error("Error saat mengambil data barang masuk sebelum update:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data barang masuk" });
    }

    if (!oldRow) {
      return res.status(404).json({ error: "Barang masuk tidak ditemukan" });
    }

    const deltaJumlah = jumlah - oldRow.jumlah;
    db.run(`UPDATE barang_masuk SET tanggal = ?, kode = ?, nama = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
      [tanggal, kode, nama, jumlah, satuan, unit, id], function (err) {
        if (err) {
          console.error("Error saat mengupdate barang masuk:", err.message);
          return res.status(500).json({ error: "Gagal mengupdate barang masuk" });
        }

        syncInventory(kode, nama, deltaJumlah, satuan, unit);
        res.json({ message: "Barang masuk berhasil diupdate" });
      });
  });
});

app.put("/api/barang-keluar/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;

  db.get("SELECT * FROM barang_keluar WHERE id = ?", [id], (err, oldRow) => {
    if (err) {
      console.error("Error saat mengambil data barang keluar sebelum update:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data barang keluar" });
    }

    if (!oldRow) {
      return res.status(404).json({ error: "Barang keluar tidak ditemukan" });
    }

    const deltaJumlah = jumlah - oldRow.jumlah;
    db.run(`UPDATE barang_keluar SET tanggal = ?, kode = ?, nama = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
      [tanggal, kode, nama, jumlah, satuan, unit, id], function (err) {
        if (err) {
          console.error("Error saat mengupdate barang keluar:", err.message);
          return res.status(500).json({ error: "Gagal mengupdate barang keluar" });
        }

        // Sinkronisasi inventory jika jumlah barang keluar berubah
        syncInventory(kode, nama, deltaJumlah, satuan, unit);
        res.json({ message: "Barang keluar berhasil diupdate" });
      });
  });
});


// Hapus Barang Keluar
app.delete("/api/barang-keluar/:id", (req, res) => {
  const { id } = req.params;

  // Ambil data barang keluar sebelum dihapus
 db.get("SELECT kode, nama, jumlah, satuan, unit FROM barang_keluar WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error saat mengambil barang keluar sebelum hapus:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data barang keluar" });
    }

    if (!row) {
      return res.status(404).json({ error: "Barang keluar tidak ditemukan" });
    }

    // Hapus barang keluar
    db.run("DELETE FROM barang_keluar WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("Error saat menghapus barang keluar:", err.message);
        return res.status(500).json({ error: "Gagal menghapus barang keluar" });
      }

      // Sinkronisasi inventory: tambahkan kembali jumlah ke inventory
      syncInventory(row.kode, row.nama, row.jumlah, row.satuan, row.unit);

      console.log(`Barang keluar dengan ID ${id} berhasil dihapus`);
      res.json({ message: "Barang keluar berhasil dihapus" });
    });
  });
});


// Tambah Barang Keluar
app.post("/api/barang-keluar", (req, res) => {
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;
  const finalUnit = normalizeUnit(unit);

  // Tambahkan ke tabel barang keluar
  db.run(`INSERT INTO barang_keluar (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
    [tanggal, kode, nama, jumlah, satuan, finalUnit], function (err) {
      if (err) {
        console.error("Error saat menambah barang keluar:", err.message);
        return res.status(500).json({ error: "Gagal menambah barang keluar" });
      }

      // Cek apakah barang ada di inventory
      db.get("SELECT * FROM inventory WHERE kode = ? AND unit = ?", [kode, finalUnit], (err, inventoryRow) => {
        if (err) {
          console.error("Error saat mengecek inventory:", err.message);
          return res.status(500).json({ error: "Gagal mengecek inventory" });
        }

        // Cek apakah barang ada di barang masuk
        db.get("SELECT * FROM barang_masuk WHERE kode = ? AND unit = ?", [kode, finalUnit], (err, masukRow) => {
          if (err) {
            console.error("Error saat mengecek barang masuk:", err.message);
            return res.status(500).json({ error: "Gagal mengecek barang masuk" });
          }

          // Kalau ada di inventory, kurangi jumlahnya
          if (inventoryRow) {
            const newJumlahInventory = inventoryRow.jumlah - jumlah;
            if (newJumlahInventory > 0) {
              db.run(`UPDATE inventory SET jumlah = ? WHERE id = ?`, [newJumlahInventory, inventoryRow.id], (err) => {
                if (err) console.error("Error mengurangi barang di inventory:", err.message);
              });
            } else {
              db.run(`DELETE FROM inventory WHERE id = ?`, [inventoryRow.id], (err) => {
                if (err) console.error("Error menghapus dari inventory:", err.message);
              });
            }
          }

          // Kalau ada di barang masuk, kurangi jumlahnya juga
          if (masukRow) {
            const newJumlahMasuk = masukRow.jumlah - jumlah;
            if (newJumlahMasuk > 0) {
              db.run(`UPDATE barang_masuk SET jumlah = ? WHERE id = ?`, [newJumlahMasuk, masukRow.id], (err) => {
                if (err) console.error("Error mengurangi barang di barang masuk:", err.message);
              });
            } else {
              db.run(`DELETE FROM barang_masuk WHERE id = ?`, [masukRow.id], (err) => {
                if (err) console.error("Error menghapus dari barang masuk:", err.message);
              });
            }
          }

          console.log(`Barang keluar dengan kode ${kode} berhasil ditambahkan`);
          res.json({ id: this.lastID });
        });
      });
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
app.put("/api/inventory/:id", (req, res) => {
  const { id } = req.params;
  const {
    tanggal,
    kode,
    kode_barang,
    nama,
    nama_barang,
    alias,
    jumlah,
    stok,
    satuan,
    unit
  } = req.body;

  // Gunakan nilai yang tersedia, entah dari frontend 1 atau frontend 2
  const finalKode = kode || kode_barang;
  const finalNama = nama || nama_barang;
  const finalJumlah = jumlah ?? stok; // Gunakan jumlah, jika tidak ada pakai stok

  db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, oldRow) => {
    if (err) {
      console.error("Error saat mengambil data inventory sebelum update:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data inventory" });
    }

    if (!oldRow) {
      return res.status(404).json({ error: "Barang tidak ditemukan di inventory" });
    }

    const deltaJumlah = finalJumlah - oldRow.jumlah;

    db.run(
      `UPDATE inventory SET tanggal = ?, kode = ?, nama = ?, alias = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
      [tanggal || oldRow.tanggal, finalKode, finalNama, alias || oldRow.alias, finalJumlah, satuan || oldRow.satuan, unit || oldRow.unit, id],
      function (err) {
        if (err) {
          console.error("Error saat mengupdate inventory:", err.message);
          return res.status(500).json({ error: "Gagal mengupdate inventory" });
        }

        // Sinkronisasi stok jika jumlah berubah
        if (deltaJumlah !== 0) {
          syncInventory(finalKode, finalNama, deltaJumlah, satuan || oldRow.satuan, unit || oldRow.unit);
        }

        res.json({ message: "Barang di inventory berhasil diupdate" });
      }
    );
  });
});



// Hapus Barang dari Inventory
app.delete("/api/inventory/:id", (req, res) => {
  const { id } = req.params;

  // Ambil data inventory sebelum dihapus
  db.get("SELECT kode, nama, jumlah, satuan, unit FROM inventory WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error saat mengambil barang inventory sebelum hapus:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data inventory" });
    }

    if (!row) {
      return res.status(404).json({ error: "Barang tidak ditemukan di inventory" });
    }

    // Hapus barang dari inventory
    db.run("DELETE FROM inventory WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("Error saat menghapus barang dari inventory:", err.message);
        return res.status(500).json({ error: "Gagal menghapus barang dari inventory" });
      }

      console.log(`Barang dengan kode ${row.kode} berhasil dihapus dari inventory`);
      res.json({ message: "Barang berhasil dihapus dari inventory" });
    });
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
   const stmt = db.prepare(`
  INSERT INTO inventory (tanggal, kode, nama, alias, jumlah, satuan, unit)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(kode, unit) DO UPDATE SET
    tanggal = excluded.tanggal,
    nama = excluded.nama,
    alias = excluded.alias,
    jumlah = excluded.jumlah,
    satuan = excluded.satuan
`);


    db.serialize(() => {
      data.forEach(item => {
        const tanggal = convertExcelDate(item.Tanggal) || new Date().toISOString().split("T")[0];
        const kode = (item.Kode || autoKode("INV")).replace(/\s/g, "").toUpperCase();
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
        const kode = (item.Kode || autoKode("IN")).replace(/\s/g, "").toUpperCase();
        const nama = item["Nama Barang"] || "";
        const jumlah = parseInt(item.Jumlah || 0);
        const satuan = item.Satuan || "";
        const unit = normalizeUnit(item.Unit || "");

        if (!kode || !nama || !jumlah) return;

        // ✅ HANYA masuk ke tabel barang_masuk — inventory tidak disentuh
        db.get("SELECT id FROM barang_masuk WHERE kode = ? AND unit = ?", [kode, unit], (err, row) => {
          if (!row) {
            db.run(
              `INSERT INTO barang_masuk (tanggal, kode, nama, jumlah, satuan, unit) VALUES (?, ?, ?, ?, ?, ?)`,
              [tanggal, kode, nama, jumlah, satuan, unit]
            );
          }
        });
      });
    });

    fs.unlinkSync(req.file.path);
    res.json({ message: 'Barang masuk berhasil diupload! (tanpa sync inventory)' });
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
        const kode = (item.Kode || autoKode("OUT")).replace(/\s/g, "").toUpperCase();
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server jalan di http://0.0.0.0:${PORT}`);
});
