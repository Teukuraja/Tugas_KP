import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ChartLine({ title, data }) {
  return (
    <div className="w-full h-[400px] px-2">
      <h2 className="text-lg font-semibold mb-4 text-center dark:text-white">{title}</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bulan" />
          <YAxis />
          <Tooltip />
          <Legend />
          {/* Tambahin Area Transparan */}
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#3182CE" 
            fill="#3182CE" 
            fillOpacity={0.2}
          />
          {/* Garis tebal di atas Area */}
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3182CE"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
