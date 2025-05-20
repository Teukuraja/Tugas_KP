import { useState } from "react";
import Button from "../ui/Button";
import { toast } from "react-hot-toast";

export default function EditInventoryForm({ item, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    tanggal: item.tanggal,
    kode: item.kode,
    nama: item.nama,
    alias: item.alias || "",
    jumlah: item.jumlah,
    satuan: item.satuan,
    unit: item.unit,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Gagal mengupdate data");
      toast.success("Data berhasil diperbarui!");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error("Gagal menyimpan perubahan");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Edit Data Inventory</h2>

      <div>
        <label className="block text-sm font-medium">Nama Barang</label>
        <input
          type="text"
          name="nama"
          value={formData.nama}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Jumlah</label>
        <input
          type="number"
          name="jumlah"
          value={formData.jumlah}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Satuan</label>
        <input
          type="text"
          name="satuan"
          value={formData.satuan}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Unit</label>
        <input
          type="text"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}
