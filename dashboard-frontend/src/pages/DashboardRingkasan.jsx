// =========================
// DashboardRingkasan.jsx (Final Tanpa Inventory Pie Chart)
// =========================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";

import SummaryCards from "../components/ui/SummaryCards";
import ChartPie from "../components/ui/ChartPie";
import AreaChartTrend from "../components/ui/AreaChartTrend";

export default function DashboardRingkasan() {
  const navigate = useNavigate();
  const [barangMasuk, setBarangMasuk] = useState([]);
  const [barangKeluar, setBarangKeluar] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [navigate]);

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

      const today = dayjs();
      const cleanMasukData = masukData.filter((item) =>
        dayjs(item.tanggal).isBefore(today.add(1, "day"))
      );
      const cleanKeluarData = keluarData.filter((item) =>
        dayjs(item.tanggal).isBefore(today.add(1, "day"))
      );

      setBarangMasuk(cleanMasukData);
      setBarangKeluar(cleanKeluarData);
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

  const normalizeUnit = (unit) => {
    const map = {
      "BM100": "BM 100",
      "BM 100": "BM 100",
      "BM 100 / HCR120D": "BM 100",
      "HCR120D": "HCR 120D",
      "HCR 120D": "HCR 120D",
      "Excavator": "Excavator",
      "Excavator 01": "Excavator 01",
      "Excavator 02": "Excavator 02",
      "Forklift": "Forklift",
      "forklift": "Forklift",
      "FORKLIFT": "Forklift",
    };
    return map[unit?.trim()] || unit?.trim() || "Tanpa Unit";
  };

  const formatDataPie = (data) => {
    const result = {};
    data.forEach((item) => {
      const unit = normalizeUnit(item.unit);
      result[unit] = (result[unit] || 0) + item.jumlah;
    });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    return Object.entries(result).map(([unit, value]) => ({
      name: unit,
      value,
      percent: ((value / total) * 100).toFixed(1),
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
        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4"
      >
        Dashboard Gudang Sparepart
      </motion.h1>

      <SummaryCards
        totalMasuk={totalMasuk}
        totalKeluar={totalKeluar}
        totalInventory={totalInventory}
        loading={loading}
      />

      {loading ? (
        <div className="text-center text-gray-500">Loading grafik...</div>
      ) : (
        <div className="space-y-6">
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <ChartPie title="Komposisi Barang Masuk" data={formatDataPie(barangMasuk)} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <ChartPie title="Komposisi Barang Keluar" data={formatDataPie(barangKeluar)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
