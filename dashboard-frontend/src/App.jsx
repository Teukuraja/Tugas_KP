import { useState } from "react";
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import BarangMasuk from "./pages/BarangMasuk";
import BarangKeluar from "./pages/BarangKeluar";
import DashboardRingkasan from "./pages/DashboardRingkasan";
import UploadResetData from "./pages/UploadResetData";
import Login from "./pages/Login";
import Logo from "./assets/logo.png";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/barang-masuk", label: "Barang Masuk" },
    { to: "/barang-keluar", label: "Barang Keluar" },
    { to: "/upload-reset", label: "Upload & Reset Data" },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  const getPageTitle = (path) => {
    const current = navItems.find((item) => item.to === path);
    return current ? current.label : "Dashboard Analitik";
  };

  const NavLink = ({ to, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={closeSidebar}
        className={`py-2 px-4 rounded-lg transition font-medium ${
          isActive
            ? "bg-blue-600 text-white shadow-md"
            : "hover:bg-blue-400 hover:text-white text-gray-700 dark:text-gray-300"
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Yakin mau logout?");
    if (confirmLogout) {
      localStorage.removeItem("isLoggedIn");
      toast.success("Logout berhasil! 👋");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    }
  };

  if (!isLoggedIn && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen flex flex-col`}>
      {/* Toast Global */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Navbar */}
      {location.pathname !== "/login" && (
        <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-md relative z-10">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden z-20">
            <Menu className="w-6 h-6" />
          </button>

          <h1 className="text-2xl font-bold w-full text-center absolute left-0 right-0">
            {getPageTitle(location.pathname)}
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

      {/* Backdrop Sidebar Mobile */}
      {sidebarOpen && location.pathname !== "/login" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-10 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content Layout */}
      <div className="flex flex-1 bg-white dark:bg-gray-900 text-black dark:text-white transition-all">

        {/* Sidebar */}
        {location.pathname !== "/login" && (
          <aside className={`bg-slate-300 dark:bg-gray-800 w-64 p-6 flex flex-col items-center shadow-lg
            transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative z-20 h-full md:h-auto transition-transform duration-300`}>

            {/* Logo */}
            <div className="mb-8">
              <img src={Logo} alt="Logo" className="w-24 h-24 object-contain" />
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-4 w-full">
              {navItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </nav>
          </aside>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto relative">
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
                <Route path="/dashboard" element={<DashboardRingkasan />} />
                <Route path="/barang-masuk" element={<BarangMasuk />} />
                <Route path="/barang-keluar" element={<BarangKeluar />} />
                <Route path="/upload-reset" element={<UploadResetData />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<div className="text-center text-red-600 mt-10">404 - Halaman tidak ditemukan</div>} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
