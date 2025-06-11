// ==== DEPENDENCY ====
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// Tambahkan baris ini setelah deklarasi `app`
const app = express();              // ✅ <-- WAJIB ini dulu
const PORT = process.env.PORT || 3001;

// ✅ Baru setelah itu aktifkan CORS
app.use(cors({
  origin: "https://classy-gumption-67c9e2.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Middleware parsing JSON
app.use(express.json());



// ==== KONEKSI DATABASE ====
const DB_PATH = process.env.DB_PATH || "./data.db";
const db      = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Gagal koneksi ke database:", err.message);
  } else {
    console.log("✅ Berhasil koneksi ke database:", DB_PATH);
  }
});

// --- Wrapper supaya API mirip sqlite3 callback --- //
["run", "get", "all"].forEach((m) => {
  const fn = m === "run"
    ? (sql, params) => db.prepare(sql).run(params)
    : m === "get"
      ? (sql, params) => db.prepare(sql).get(params)
      : (sql, params) => db.prepare(sql).all(params);

  // override: terima callback seperti versi lama
  db[m] = (sql, params = [], cb = () => {}) => {
    try {
      const result = fn(sql, params);
      cb(null, result);
    } catch (err) {
      cb(err);
    }
  };
});


// Membuat tabel users jika belum ada
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (err) {
      console.error("Gagal membuat tabel users:", err.message);
    } else {
      console.log("Tabel users berhasil dibuat atau sudah ada.");
    }
  });

  // Menambahkan user admin jika belum ada
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (err) {
      console.error("Gagal memeriksa user admin:", err.message);
    } else if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin'], (err) => {
        if (err) {
          console.error("Gagal menambahkan user admin:", err.message);
        } else {
          console.log("User admin berhasil ditambahkan.");
        }
      });
    }
  });
});


// Hapus Barang Masuk
app.delete("/api/barang-masuk/:id", (req, res) => {
  const { id } = req.params;

  

    // Hapus semua barang keluar terkait sebelum menghapus barang masuk
    db.run("DELETE FROM barang_keluar WHERE kode = ? AND unit = ?", [row.kode, row.unit], function (err) {
      if (err) {
        console.error("Error saat menghapus barang keluar terkait:", err.message);
      }
    });

    // Hapus barang masuk
    db.run("DELETE FROM barang_masuk WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("Error saat menghapus barang masuk:", err.message);
        return res.status(500).json({ error: "Gagal menghapus barang masuk" });
      }
      
      






      // Edit Barang Masuk
app.put("/api/barang-masuk/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, kode, nama, jumlah, satuan, unit } = req.body;

  // Ambil data barang masuk sebelum diupdate
  db.get("SELECT kode, nama, jumlah, satuan, unit FROM barang_masuk WHERE id = ?", [id], (err, oldRow) => {
    if (err) {
      console.error("Error saat mengambil data barang masuk sebelum update:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data barang masuk" });
    }

    if (!oldRow) {
      return res.status(404).json({ error: "Barang masuk tidak ditemukan" });
    }

    // Hitung delta jumlah untuk sinkronisasi inventory
    const deltaJumlah = jumlah - oldRow.jumlah;

    // Update barang masuk
    db.run(`UPDATE barang_masuk SET tanggal = ?, kode = ?, nama = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
      [tanggal, kode, nama, jumlah, satuan, unit, id], function (err) {
        if (err) {
          console.error("Error saat mengupdate barang masuk:", err.message);
          return res.status(500).json({ error: "Gagal mengupdate barang masuk" });
        }

        // Sinkronisasi inventory: sesuaikan jumlah berdasarkan perubahan
        syncInventory(kode, nama, deltaJumlah, satuan, unit);

        console.log(`Barang masuk dengan ID ${id} berhasil diupdate`);
        res.json({ message: "Barang masuk berhasil diupdate" });
      }
    );
  });
});





      // Sinkronisasi inventory: kurangi jumlah barang di inventory
      syncInventory(row.kode, row.nama, -row.jumlah, row.satuan, row.unit);

      console.log(`Barang masuk dengan ID ${id} berhasil dihapus beserta barang keluar terkait`);
      res.json({ message: "Barang masuk dan barang keluar terkait berhasil dihapus" });
    });
  });
});


// Edit Barang Inventory
app.put("/api/inventory/:id", (req, res) => {
  const { id } = req.params;
  const { tanggal, kode, nama, alias, jumlah, satuan, unit } = req.body;

  db.run(
    `UPDATE inventory SET tanggal = ?, kode = ?, nama = ?, alias = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
    [tanggal, kode, nama, alias, jumlah, satuan, unit, id],
    function (err) {
      if (err) {
        console.error("Error saat mengupdate inventory:", err.message);
        return res.status(500).json({ error: "Gagal mengupdate inventory" });
      }

      console.log(`Barang inventory dengan ID ${id} berhasil diupdate`);
      res.json({ message: "Inventory berhasil diupdate" });
    }
  );
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
  tanggal TEXT,
  kode TEXT,
  nama TEXT,
  alias TEXT,
  jumlah INTEGER,
  satuan TEXT,
  unit TEXT,
  UNIQUE(kode, unit)  -- ✅ PENTING untuk mencegah dobel
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
      const newJumlah = row.jumlah + delta;
      if (newJumlah > 0) {
        db.run(`UPDATE inventory SET jumlah = ?, tanggal = ? WHERE id = ?`, [newJumlah, today, row.id], (err) => {
          if (err) console.error("Error mengupdate inventory:", err.message);
        });
      } else {
        db.run(`DELETE FROM inventory WHERE id = ?`, [row.id], (err) => {
          if (err) console.error("Error menghapus dari inventory:", err.message);
          else console.log(`Barang dengan kode ${kode} berhasil dihapus dari inventory`);
        });
      }
    } else if (delta > 0) {
      db.run(`
  INSERT INTO inventory (tanggal, kode, nama, jumlah, satuan, unit)
  SELECT ?, ?, ?, ?, ?, ?
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory WHERE kode = ? AND unit = ?
  )
`, [today, kode, nama, delta, satuan, unit, kode, unit], (err) => {
  if (err) console.error("Error menambah ke inventory:", err.message);
  else console.log(`Barang dengan kode ${kode} berhasil ditambahkan ke inventory`);
});

    }
  });
}


// ========== LOGIN ==========
// API Login Sederhana (tanpa bcrypt)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Login langsung tanpa hashing
  if (username === "admin" && password === "admin") {
    res.json({ success: true, message: "Login berhasil" });
  } else {
    res.status(401).json({ success: false, message: "Username atau password salah" });
  }
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
  
  // Ambil data barang masuk sebelum diupdate
  db.get("SELECT kode, nama, jumlah, satuan, unit FROM barang_masuk WHERE id = ?", [id], (err, oldRow) => {
    if (err) {
      console.error("Error saat mengambil data barang masuk sebelum update:", err.message);
      return res.status(500).json({ error: "Gagal mengambil data barang masuk" });
    }

    if (!oldRow) {
      return res.status(404).json({ error: "Barang masuk tidak ditemukan" });
    }

    // Hitung delta jumlah untuk sinkronisasi inventory
    const deltaJumlah = jumlah - oldRow.jumlah;

    // Update barang masuk
    db.run(
      `UPDATE barang_masuk SET tanggal = ?, kode = ?, nama = ?, jumlah = ?, satuan = ?, unit = ? WHERE id = ?`,
      [tanggal, kode, nama, jumlah, satuan, unit, id],
      function (err) {
        if (err) {
          console.error("Error saat mengupdate barang masuk:", err.message);
          return res.status(500).json({ error: "Gagal mengupdate barang masuk" });
        }

        // Sinkronisasi inventory
        syncInventory(kode, nama, deltaJumlah, satuan, unit);

        console.log(`Barang masuk dengan ID ${id} berhasil diupdate`);
        res.json({ message: "Barang masuk berhasil diupdate" });
      }
    );
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

app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});