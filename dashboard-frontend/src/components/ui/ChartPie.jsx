import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

const COLORS = [
  "#3182CE", "#63B3ED", "#90CDF4", "#4299E1", "#2B6CB0",
  "#7F9CF5", "#805AD5", "#9F7AEA", "#B794F4", "#D53F8C"
];

// Biar warna glow pas hover
function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return (
    "#" +
    (0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255))
      .toString(16)
      .slice(1)
  );
}

// Hover efek
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // Sedikit mekar pas hover
        startAngle={startAngle}
        endAngle={endAngle}
        fill={lightenColor(fill, 10)}
        filter="url(#glow)"
      />
    </g>
  );
};

// Label cakep di luar pie
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      fontSize={12}
      fontWeight="500"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name}: ${value}`}
    </text>
  );
};

export default function ChartPie({ title, data }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [startAngle, setStartAngle] = useState(360);
  const [endAngle, setEndAngle] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStartAngle(0);
      setEndAngle(360);
    }, 300); // Delay dikit biar animasi halus
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-[420px] px-2">
      <h2 className="text-lg font-semibold mb-4 text-center dark:text-white">{title}</h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 70, right: 80, bottom: 10, left: 10 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="40%"
            cy="50%"
            outerRadius={100}
            startAngle={startAngle}
            endAngle={endAngle}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            labelLine={true}
            label={renderCustomLabel}
            isAnimationActive={true}
            animationDuration={1200}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{
              fontSize: "13px",
              top: "50%",
              transform: "translateY(-50%)",
              position: "absolute",
              right: 10,
              lineHeight: "22px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
