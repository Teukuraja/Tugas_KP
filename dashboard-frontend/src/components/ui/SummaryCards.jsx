// =========================
// components/ui/SummaryCards.jsx (FINAL CLEAN SIMPLE VERSION)
// =========================

export default function SummaryCards({ totalMasuk, totalKeluar, loading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Card Total Barang Masuk */}
      <div className="bg-green-100 p-6 rounded-2xl shadow text-center">
        <h2 className="text-gray-700 text-sm font-semibold mb-2">Total Barang Masuk</h2>
        {loading ? (
          <div className="h-10 bg-gray-300 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-green-700">{totalMasuk.toLocaleString()}</p>
        )}
      </div>

      {/* Card Total Barang Keluar */}
      <div className="bg-blue-100 p-6 rounded-2xl shadow text-center">
        <h2 className="text-gray-700 text-sm font-semibold mb-2">Total Barang Keluar</h2>
        {loading ? (
          <div className="h-10 bg-gray-300 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-blue-700">{totalKeluar.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
