import { useEffect, useState } from "react";
import Modal from "../components/ui/Modal";
import FormInventory from "../components/FormInventory";
import TableBarang from "../components/TableBarang";
import { toast } from "react-hot-toast";

export default function InventoryData() {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleSubmit = async (formData) => {
    try {
      const res = await fetch("http://localhost:3001/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      toast.success("Barang berhasil ditambahkan!");
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      toast.error("Gagal tambah barang");
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Data Inventory</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Tambah Barang
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading data...</p>
      ) : (
        <TableBarang data={data} onDelete={handleDelete} onEdit={() => {}} />
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <FormInventory onSubmit={handleSubmit} onClose={() => setModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
