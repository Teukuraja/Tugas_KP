
/**
 * Halaman BarangKeluar untuk menampilkan dan mengelola data barang keluar.
 * Menyediakan fitur filter, pencarian, grafik, export, tambah, edit, dan hapus data.
 */
import { useEffect, useState } from "react";
import FilterUnitKeluar from "../components/filters/FilterUnitKeluar";
import TableBarang from "../components//tables/TableBarang";
import ChartBarang from "../components/charts/ChartBarang";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import Button from "../components/ui/Button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

export default function BarangKeluar() {
  // State data barang keluar,filter unit,  pencarian nama barang
  // State id data yang diedit, data form loading data modal form tambah/edit, status submit form
  const [data, setData] = useState([]);
  const [filterUnit, setFilterUnit] = useState("Semua Unit");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ tanggal: "", kode: "", nama: "", jumlah: "", satuan: "", unit: "" });

  // Fungsi untuk mengambil data barang keluar dari API
  const fetchData = async () => {
    try {
      setLoading(true);
      let url = "http://localhost:3001/api/barang-keluar";
      if (filterUnit !== "Semua Unit") url += `?unit=${encodeURIComponent(filterUnit)}`;
      const res = await fetch(url);
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // useEffect untuk fetch data saat filter unit berubah
  useEffect(() => {
    fetchData();
  }, [filterUnit]);

  // Fungsi untuk autocomplete data inventory berdasarkan nama barang
  const fetchInventoryData = async (nama) => {
    try {
      const res = await fetch("http://localhost:3001/api/inventory");
      const inventory = await res.json();
      const match = inventory.find(item => item.nama.toLowerCase() === nama.toLowerCase() || (item.alias && item.alias.toLowerCase().includes(nama.toLowerCase())));
      if (match) {
        setFormData(prev => ({
          ...prev,
          kode: match.kode,
          satuan: match.satuan,
          nama: match.nama
        }));
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  // Filter data berdasarkan pencarian nama
  const filteredData = data.filter((item) =>
    item.nama?.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Fungsi untuk menyiapkan data grafik berdasarkan unit
  const grafikData = () => {
    const result = {};
    filteredData.forEach((item) => {
      const unit = item.unit?.trim() || "Tanpa Unit";
      result[unit] = (result[unit] || 0) + item.jumlah;
    });
    return Object.entries(result).map(([unit, jumlah]) => ({ unit, jumlah }));
  };

  // Fungsi export data ke PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Barang Keluar", 14, 10);
    autoTable(doc, {
      head: [["Tanggal", "Kode", "Nama", "Jumlah", "Satuan", "Unit"]],
      body: filteredData.map((i) => [i.tanggal, i.kode, i.nama, i.jumlah, i.satuan, i.unit]),
    });
    doc.save("Laporan_Barang_Keluar.pdf");
    toast.success("Export PDF berhasil!");
  };

  // Fungsi export data ke Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangKeluar");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Laporan_Barang_Keluar.xlsx");
    toast.success("Export Excel berhasil!");
  };

  // Reset form dan editId
  const resetForm = () => {
    setFormData({ tanggal: "", kode: "", nama: "", jumlah: "", satuan: "", unit: "" });
    setEditId(null);
  };

  // Handler submit form tambah/edit data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(editId ? "Menyimpan perubahan..." : "Menyimpan data...");
    try {
      const payload = {
        ...formData,
        unit: formData.unit.trim() === "" ? "Tanpa Unit" : formData.unit.trim()
      };
      const res = await fetch(`http://localhost:3001/api/barang-keluar${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data");
      }

      toast.success(editId ? "Barang berhasil diupdate!" : "Barang berhasil ditambahkan!", { id: toastId });
      resetForm();
      setModalOpen(false);
      fetchData();

      await fetch(`http://localhost:3001/api/sync-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: formData.kode, jumlah: -formData.jumlah, unit: formData.unit })
      });

    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler edit data, isi form dan buka modal
  const handleEdit = (item) => {
    setFormData(item);
    setEditId(item.id);
    setModalOpen(true);
  };

  // Handler hapus data dengan konfirmasi
  const handleDelete = async (id) => {
    if (!confirm("Yakin mau hapus barang ini?")) return;
    const toastId = toast.loading("Menghapus barang...");
    try {
      const res = await fetch(`http://localhost:3001/api/barang-keluar/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal hapus barang");
      }
      toast.success("Barang berhasil dihapus!", { id: toastId });
      fetchData();
    } catch (err) {
      console.error("Error saat menghapus barang:", err);
      toast.error(`Error: ${err.message}`, { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-left">Data Barang Keluar</h1>

      <div className="flex flex-col md:flex-row gap-4">
        <FilterUnitKeluar value={filterUnit} onChange={setFilterUnit} />
        <input
          type="text"
          placeholder="Cari nama..."
          className="p-2 rounded-lg border flex-1 dark:bg-gray-700 dark:text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Button onClick={exportPDF}>Export PDF</Button>
          <Button onClick={exportExcel} variant="secondary">Export Excel</Button>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} variant="success">
          ➕ {editId ? "Edit Barang" : "Tambah Barang"}
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader title="Grafik Barang Keluar per Unit" />
        <CardContent>
          <ChartBarang data={grafikData()} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto rounded-xl">
          <TableBarang data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg relative">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {editId ? "Edit Barang" : "Tambah Barang"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nama"
                value={formData.nama}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, nama: value });
                  fetchInventoryData(value);
                }}
                className="border p-2 w-full rounded-md dark:bg-gray-700 dark:text-white"
                required
              />
              {["tanggal", "kode", "jumlah", "satuan", "unit"].map((field) => (
                <input
                  key={field}
                  type={field === "tanggal" ? "date" : field === "jumlah" ? "number" : "text"}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="border p-2 w-full rounded-md dark:bg-gray-700 dark:text-white"
                  required={field !== "unit"}
                />
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Batal</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
              </div>
            </form>
            <button onClick={() => setModalOpen(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-300 text-2xl font-bold">
              ✖️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
