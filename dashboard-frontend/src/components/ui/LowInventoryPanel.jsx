import React from "react";

export default function LowInventoryPanel({ data }) {
  return (
    <div className="bg-white shadow-md rounded-2xl p-4 w-full md:w-80">
      <h2 className="text-lg font-semibold mb-3 text-red-600">
        ⚠️ Low Inventory
      </h2>
      <ul className="space-y-2">
        {data.map((item, index) => (
          <li
            key={index}
            className="flex justify-between text-sm border-b pb-1"
          >
            <span>{item.nama}</span>
            <span className="text-red-500 font-bold">{item.stok} pcs</span>
          </li>
        ))}
      </ul>
    </div>
  );
}