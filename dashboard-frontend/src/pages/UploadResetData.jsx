import { useState } from "react";
import UploadForm from "../components/UploadForm";
import Button from "../components/ui/Button";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function UploadResetData() {
  const [resetting, setResetting] = useState(false);

  const handleResetData = async () => {
    const konfirmasi = confirm("Yakin ingin mereset semua data?");
    if (!konfirmasi) return;

    try {
      setResetting(true);
      await axios.post("http://localhost:3001/reset-data");
      toast.success("Semua data berhasil direset!");
    } catch (err) {
      toast.error("Gagal mereset data!");
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-10 text-black dark:text-white transition-colors">
      {/* Judul Halaman */}
      <h1 className="text-3xl font-bold text-center">
        Upload & Reset Data
      </h1>

      {/* Upload Form Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 transition-colors">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Upload Barang Masuk
          </h2>
          <UploadForm type="masuk" />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 transition-colors">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Upload Barang Keluar
          </h2>
          <UploadForm type="keluar" />
        </div>
      </div>

      {/* Reset Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center space-y-6 transition-colors">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          Reset Semua Data
        </h2>
        <Button
          variant="destructive"
          className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50"
          onClick={handleResetData}
          disabled={resetting}
        >
          {resetting ? "Mereset..." : "Reset Semua Data"}
        </Button>
      </div>
    </div>
  );
}
