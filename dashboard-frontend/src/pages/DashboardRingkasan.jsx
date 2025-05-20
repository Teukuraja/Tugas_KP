import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import LowInventoryPanel from "../components/ui/LowInventoryPanel";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import SummaryCards from "../components/ui/SummaryCards";
import ChartPie from "../components/charts/ChartPie";
import AreaChartTrend from "../components/charts/AreaChartTrend";
export default function DashboardRingkasan() {
  const location = useLocation();
  const navigate = useNavigate();
  const [barangMasuk, setBarangMasuk] = useState([]);
  const [barangKeluar, setBarangKeluar] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
 const [showLowStock, setShowLowStock] = useState(false);

 useEffect(() => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") || sessionStorage.getItem("isLoggedIn");
  if (!isLoggedIn) {
    navigate("/login");
    return;
  }

  // Cek jika ada query openLowStock=true → maka jangan tampilkan panel tabel
  const params = new URLSearchParams(location.search);
  if (params.get("openLowStock") === "true") {
    setShowLowStock(false);
  }

  fetchData();
}, [navigate, location.search]);



  const fetchData = async () => {
    try {
      setLoading(true);
      const [masukRes, keluarRes, invRes] = await Promise.all([
        fetch("http://localhost:3001/api/barang-masuk"),
        fetch("http://localhost:3001/api/barang-keluar"),
        fetch("http://localhost:3001/api/inventory"),
      ]);
      const [masukData, keluarData, invData] = await Promise.all([
        masukRes.json(),
        keluarRes.json(),
        invRes.json(),
      ]);

      setBarangMasuk(masukData);
      setBarangKeluar(keluarData);
      setInventory(invData);

      toast.success("Data berhasil dimuat! 🚀");
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      toast.error("Gagal mengambil data! 🚨");
    } finally {
      setLoading(false);
    }
  };

  const totalMasuk = barangMasuk.reduce((sum, item) => sum + item.jumlah, 0);
  const totalKeluar = barangKeluar.reduce((sum, item) => sum + item.jumlah, 0);
  const totalInventory = inventory.reduce((sum, item) => sum + item.jumlah, 0);

  const formatDataPie = (data) => {
    const result = {};
    data.forEach((item) => {
      const unit = item.unit?.trim() || "Tanpa Unit";
      result[unit] = (result[unit] || 0) + item.jumlah;
    });
    return Object.entries(result).map(([unit, value]) => ({
      name: unit,
      value,
      percent: ((value / totalMasuk) * 100).toFixed(1),
    }));
  };

  const formatAreaChartData = (data) => {
    const agregasi = {};
    data.forEach((item) => {
      const key = dayjs(item.tanggal).format("MMM YYYY");
      agregasi[key] = (agregasi[key] || 0) + item.jumlah;
    });
    return Object.entries(agregasi).map(([label, total]) => ({ label, total }));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        
  className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-left"
>
  Dashboard Gudang Sparepart
</motion.h1>


  <div className="grid md:grid-cols-4 gap-6">
  <div className="md:col-span-3">
    <SummaryCards
      totalMasuk={totalMasuk}
      totalKeluar={totalKeluar}
      totalInventory={totalInventory}
      loading={loading}
    />
  </div>

 <AnimatePresence>
  {inventory.some(item => item.jumlah <= 2) && (
    <div className="md:col-span-1 self-start mt-10">
      {showLowStock ? (
        <>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Stok Sangat Rendah
            </h2>
            <button
              onClick={() => setShowLowStock(false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Sembunyikan
            </button>
          </div>
          <motion.div
            key="low-inventory"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <LowInventoryPanel data={inventory.filter(item => item.jumlah <= 2)} />
          </motion.div>
        </>
      ) : (
       <div
  onClick={() => navigate("/inventory?filter=lowstock")}
  className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-4 rounded-2xl shadow-md cursor-pointer transition hover:scale-[1.02]"
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-xl">⚠️</span>
      <h3 className="font-semibold text-sm">Stok Sangat Rendah</h3>
    </div>
    <p className="font-bold text-lg">
      {inventory.filter(item => item.jumlah <= 2).length} item
    </p>
  </div>
  <p className="text-xs mt-1 text-red-700 dark:text-red-300">
    Klik untuk melihat detail
  </p>
</div>

      )}
    </div>
  )}
</AnimatePresence>

  
</div>
     {loading ? (
  <div className="text-center text-gray-500">Loading grafik...</div>
) : (
  <>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <AreaChartTrend
          title="Trend Barang Masuk (Bulanan)"
          data={formatAreaChartData(barangMasuk)}
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <AreaChartTrend
          title="Trend Barang Keluar (Bulanan)"
          data={formatAreaChartData(barangKeluar)}
        />
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <ChartPie
          title="Komposisi Barang Masuk"
          data={formatDataPie(barangMasuk)}
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <ChartPie
          title="Komposisi Barang Keluar"
          data={formatDataPie(barangKeluar)}
        />
      </div>
    </div>
  </>
)}

       </div>
  );
}

