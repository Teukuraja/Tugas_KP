// =========================
// DashboardRingkasan.jsx (SUPER FINAL ULTIMATE CLEANED + YEARLY SUPPORT + FIX HARI INI)
// =========================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";

import SummaryCards from "../components/ui/SummaryCards";
import ChartModeSwitch from "../components/ui/ChartModeSwitch";
import FilterModeSwitch from "../components/ui/FilterModeSwitch";
import ChartPie from "../components/ui/ChartPie";
import AreaChartTrend from "../components/ui/AreaChartTrend";

dayjs.extend(weekOfYear);

export default function DashboardRingkasan() {
  const navigate = useNavigate();
  const [barangMasuk, setBarangMasuk] = useState([]);
  const [barangKeluar, setBarangKeluar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [chartMode, setChartMode] = useState("number");
  const [modeFilter, setModeFilter] = useState("monthly");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    fetchData();
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [masukRes, keluarRes] = await Promise.all([
        fetch("http://localhost:3001/api/barang-masuk"),
        fetch("http://localhost:3001/api/barang-keluar"),
      ]);
      const [masukData, keluarData] = await Promise.all([
        masukRes.json(),
        keluarRes.json(),
      ]);

      const today = dayjs();
      const cleanMasukData = masukData.filter(item => dayjs(item.tanggal).isBefore(today.add(1, 'day')));
      const cleanKeluarData = keluarData.filter(item => dayjs(item.tanggal).isBefore(today.add(1, 'day')));

      setBarangMasuk(cleanMasukData);
      setBarangKeluar(cleanKeluarData);

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

  const formatDataPie = (data) => {
    const result = {};
    data.forEach((item) => {
      const unit = item.unit?.trim() || "Tanpa Unit";
      result[unit] = (result[unit] || 0) + item.jumlah;
    });
    const total = Object.values(result).reduce((a, b) => a + b, 0);

    return Object.entries(result).map(([unit, value]) => ({
      name: unit,
      value: chartMode === "number" ? value : parseFloat(((value / total) * 100).toFixed(2)),
    }));
  };

  const formatAreaChartData = (data) => {
    const agregasi = {};
    data.forEach((item) => {
      const tanggal = dayjs(item.tanggal);
      let key = "";

      if (modeFilter === "monthly") {
        key = tanggal.format("YYYY-MM");
      } else if (modeFilter === "weekly") {
        key = `${tanggal.year()}-W${String(tanggal.week()).padStart(2, "0")}`;
      } else if (modeFilter === "yearly") {
        key = tanggal.format("YYYY");
      }

      agregasi[key] = (agregasi[key] || 0) + item.jumlah;
    });

    return Object.entries(agregasi)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({
        label: modeFilter === "monthly"
          ? dayjs(key).format("MMM YYYY")
          : modeFilter === "weekly"
          ? formatMingguLabel(key)
          : key,
        total,
      }));
  };

  const formatMingguLabel = (mingguKey) => {
    const [year, minggu] = mingguKey.split("-W");
    const startOfWeek = dayjs().year(Number(year)).week(Number(minggu)).startOf("week");
    const endOfWeek = dayjs().year(Number(year)).week(Number(minggu)).endOf("week");
    return `${startOfWeek.format("DD/MM")} - ${endOfWeek.format("DD/MM")}`;
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-white dark:bg-gray-900 transition-colors">
      
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 1 }}
            className="text-xl md:text-2xl font-semibold text-center text-blue-600 mb-6"
          >
            Selamat Datang di Era Analitik Modern
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white">
        Dashboard Gudang Sparepart
      </h1>

      <SummaryCards totalMasuk={totalMasuk} totalKeluar={totalKeluar} loading={loading} />
      <ChartModeSwitch chartMode={chartMode} setChartMode={setChartMode} />
      {chartMode === "analytics" && (
        <FilterModeSwitch mode={modeFilter} setMode={setModeFilter} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {[1, 2].map((_, idx) => (
            <div
              key={idx}
              className="bg-gray-200 dark:bg-gray-700 h-[400px] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {[barangMasuk, barangKeluar].map((data, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
              {data.length > 0 ? (
                chartMode === "number" ? (
                  <ChartPie
                    title={`Komposisi Barang ${idx === 0 ? "Masuk" : "Keluar"} per Unit`}
                    data={formatDataPie(data)}
                  />
                ) : (
                  <AreaChartTrend
                    title={`Trend Barang ${idx === 0 ? "Masuk" : "Keluar"} (${
                      modeFilter === "monthly"
                        ? "Per Bulan"
                        : modeFilter === "weekly"
                        ? "Per Minggu"
                        : "Per Tahun"
                    })`}
                    data={formatAreaChartData(data)}
                  />
                )
              ) : (
                <div className="flex justify-center items-center h-[300px] text-gray-500">
                  Tidak ada data
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
