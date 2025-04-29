import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UploadCloud, XCircle } from "lucide-react";
import Button from "./ui/Button";

export default function UploadForm({ type }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();
  const intervalRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startFakeProgress = () => {
    let fake = 0;
    intervalRef.current = setInterval(() => {
      fake += Math.random() * 2 + 1;
      if (fake >= 98) fake = 98;
      setProgress(Math.floor(fake));
    }, 50);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file terlebih dahulu!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setProgress(0);
      startFakeProgress();

      // Tentukan endpoint berdasarkan tipe
      const endpointMap = {
        masuk: "/upload-barang-masuk",
        keluar: "/upload-barang-keluar",
        inventory: "/upload-inventory",
      };

      const endpoint = endpointMap[type] || "/upload-inventory";

      await axios.post(`http://localhost:3001${endpoint}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(intervalRef.current);
      setProgress(100);

      setTimeout(() => {
        toast.success("Upload berhasil!");
        handleRemoveFile();
      }, 500);
    } catch (err) {
      toast.error("Gagal meng-upload data!");
      console.error(err);
      clearInterval(intervalRef.current);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const getButtonLabel = () => {
    switch (type) {
      case "masuk":
        return "Upload Barang Masuk";
      case "keluar":
        return "Upload Barang Keluar";
      case "inventory":
        return "Upload Inventory";
      default:
        return "Upload File";
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 transition cursor-pointer relative"
        onClick={() => inputRef.current.click()}
      >
        <UploadCloud className="w-12 h-12 mb-3 text-blue-500" />
        <p className="font-semibold text-center">
          {file ? file.name : "Drag file ke sini atau klik untuk pilih file"}
        </p>

        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile();
            }}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        ref={inputRef}
        className="hidden"
      />

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <Button
        type="submit"
        variant="secondary"
        disabled={uploading}
        className="w-full"
      >
        {uploading ? `Mengupload... ${progress}%` : getButtonLabel()}
      </Button>
    </form>
  );
}
