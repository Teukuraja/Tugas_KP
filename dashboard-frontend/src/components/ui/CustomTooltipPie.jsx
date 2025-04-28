// ====================
// components/ui/CustomTooltipPie.jsx
// ====================

export default function CustomTooltipPie({ active, payload }) {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow text-sm">
          <p className="font-bold">{name}</p>
          <p>{`Jumlah: ${value}`}</p>
        </div>
      );
    }
    return null;
  }
  