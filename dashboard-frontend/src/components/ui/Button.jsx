// src/components/ui/Button.jsx

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
}) {
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-sm";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700", // ✅ Tambahan hijau buat tombol tambah barang
  };

  const appliedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${appliedVariant} ${className}`}
    >
      {children}
    </button>
  );
}
