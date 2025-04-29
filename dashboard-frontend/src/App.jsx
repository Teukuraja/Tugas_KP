import { useState } from "react";
import {
  Routes, Route, Link, useLocation, Navigate, useNavigate,
} from "react-router-dom";
import {
  Menu, Sun, Moon, ChevronDown, ChevronUp,
  LayoutDashboard, Package, FileDown, FileUp, UploadCloud
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import BarangMasuk from "./pages/BarangMasuk";
import BarangKeluar from "./pages/BarangKeluar";
import DashboardRingkasan from "./pages/DashboardRingkasan";
import UploadResetData from "./pages/UploadResetData";
import InventoryData from "./pages/InventoryData";
import Login from "./pages/Login";
import Logo from "./assets/logo.png";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [openInventoryMenu, setOpenInventoryMenu] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    if (window.confirm("Yakin mau logout?")) {
      localStorage.removeItem("isLoggedIn");
      toast.success("Logout berhasil!");
      setTimeout(() => navigate("/login"), 800);
    }
  };

  const NavItem = ({ to, label, icon: Icon }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={closeSidebar}
        className={`flex items-center gap-3 px-4 py-2 rounded-md transition font-medium ${
          isActive
            ? "bg-white text-blue-600 shadow font-semibold"
            : "text-gray-800 hover:bg-blue-100 dark:text-white"
        }`}
      >
        <Icon size={18} />
        {label}
      </Link>
    );
  };

  if (!isLoggedIn && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen flex flex-col`}>
      <Toaster position="top-right" reverseOrder={false} />

      {/* Header */}
      {location.pathname !== "/login" && (
        <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow relative z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="z-20 md:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold w-full text-center absolute left-0 right-0">
            Dashboard Analitik
          </h1>
          <div className="absolute right-6 flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </header>
      )}

      {/* Overlay sidebar mobile */}
      {sidebarOpen && location.pathname !== "/login" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-10 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className="flex flex-1 bg-white dark:bg-gray-900 transition-all">
        {/* Sidebar */}
        {location.pathname !== "/login" && (
          <AnimatePresence>
            {(sidebarOpen || window.innerWidth >= 768) && (
              <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-300 dark:bg-gray-800 text-black dark:text-white w-64 p-6 flex flex-col h-screen shadow-xl fixed md:relative z-20"
              >
                {/* Tombol Grid Toggle Sidebar (di kiri atas sidebar) */}
                <div className="mb-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="bg-white p-2 rounded-lg shadow hover:bg-gray-100"
                    title="Toggle Sidebar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-6 h-6"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                </div>

                <div className="mb-8 flex justify-center">
                  <img src={Logo} alt="Logo" className="w-24 h-24 object-contain" />
                </div>

                <nav className="flex flex-col gap-2">
                  <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
                  <button
                    onClick={() => setOpenInventoryMenu(!openInventoryMenu)}
                    className="py-2 px-4 rounded-lg flex justify-between items-center w-full text-left hover:bg-blue-200 dark:hover:bg-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <Package size={18} />
                      Inventory
                    </span>
                    {openInventoryMenu ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {openInventoryMenu && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pl-6 flex flex-col gap-1"
                    >
                      <NavItem to="/inventory" label="Data Inventory" icon={Package} />
                      <NavItem to="/barang-masuk" label="Barang Masuk" icon={FileDown} />
                      <NavItem to="/barang-keluar" label="Barang Keluar" icon={FileUp} />
                    </motion.div>
                  )}

                  <NavItem to="/upload-reset" label="Upload & Reset Data" icon={UploadCloud} />
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto relative transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={<DashboardRingkasan sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                />
                <Route path="/barang-masuk" element={<BarangMasuk />} />
                <Route path="/barang-keluar" element={<BarangKeluar />} />
                <Route path="/inventory" element={<InventoryData />} />
                <Route path="/upload-reset" element={<UploadResetData />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="*"
                  element={<div className="text-center text-red-600 mt-10">404 - Halaman tidak ditemukan</div>}
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
