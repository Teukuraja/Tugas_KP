import { useEffect, useState } from "react";
import TableBarang from "../components/tables/TableBarang";
import Button from "../components/ui/Button";
import FilterUnitMasuk from "../components/filters/FilterUnitRingkasan";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function InventoryData() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("Semua Unit");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/inventory");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error("Gagal mengambil data inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin mau hapus data ini?")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/inventory/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Data berhasil dihapus!");
      fetchInventory();
    } catch (err) {
      toast.error("Gagal hapus data");
    }
  };

  const enhancedData = data.map((item) => {
    let status = "";
    if (item.jumlah === 0) status = "Stok Habis!";
    else if (item.jumlah <= 5) status = "Stok Hampir Habis";
    return { ...item, status };
  });

  const filteredData = enhancedData.filter((item) => {
    const matchNama = item.nama?.toLowerCase().includes(search.toLowerCase());
    const matchUnit = filterUnit === "Semua Unit" || item.unit === filterUnit;
    return matchNama && matchUnit;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Data Inventory", 14, 10);
    autoTable(doc, {
      head: [["Tanggal", "Kode", "Nama", "Jumlah", "Satuan", "Unit"]],
      body: filteredData.map((item) => [
        item.tanggal,
        item.kode,
        item.nama,
        item.jumlah,
        item.satuan,
        item.unit,
      ]),
    });
    doc.save("Laporan_Inventory.pdf");
    toast.success("Export PDF berhasil!");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((item) => ({
        Tanggal: item.tanggal,
        Kode: item.kode,
        Nama: item.nama,
        Jumlah: item.jumlah,
        Satuan: item.satuan,
        Unit: item.unit,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), "Laporan_Inventory.xlsx");
    toast.success("Export Excel berhasil!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-xl font-semibold text-left">Data Inventory</h1>
        <div className="flex gap-2">
          <Button onClick={exportPDF}>Export PDF</Button>
          <Button onClick={exportExcel} variant="secondary">Export Excel</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <FilterUnitMasuk value={filterUnit} onChange={setFilterUnit} />
        <input
          type="text"
          placeholder="Cari nama barang..."
          className="p-2 rounded-lg border dark:bg-gray-700 dark:text-white flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Loading data...</p>
      ) : (
        <>
          <TableBarang data={currentItems} onDelete={handleDelete} onEdit={() => {}} />

          <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              variant="secondary"
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-md text-sm font-medium border transition-all duration-200 hover:bg-blue-100 dark:hover:bg-gray-700 ${
                  currentPage === page ? "bg-blue-500 text-white" : "text-blue-600 border-blue-200"
                }`}
              >
                {page}
              </button>
            ))}
            <Button
              onClick={() => setCurrentPage((p) => (indexOfLast >= filteredData.length ? p : p + 1))}
              variant="secondary"
              disabled={indexOfLast >= filteredData.length}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}