import { useEffect, useState } from "react";
import TableBarang from "../components/TableBarang";
import { toast } from "react-hot-toast";

export default function InventoryData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleDelete = async (id) => {
    const confirm = window.confirm("Yakin mau hapus data ini?");
    if (!confirm) return;

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

  useEffect(() => {
    fetchInventory();
  }, []);

  const enhancedData = data.map((item) => {
    let status = "";
    if (item.jumlah === 0) status = "Stok Habis!";
    else if (item.jumlah <= 5) status = "Stok Hampir Habis";
    return { ...item, status };
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Data Inventory</h1>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading data...</p>
      ) : (
        <TableBarang data={enhancedData} onDelete={handleDelete} onEdit={() => {}} />
      )}
    </div>
  );
}
