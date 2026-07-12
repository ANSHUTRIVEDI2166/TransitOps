import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LIGHT_COLORS = ["#1f7a6b", "#243447", "#c45c26", "#3d7ea6", "#7c5cbf", "#b45309"];
const DARK_COLORS = ["#3dbaa5", "#8ec8ff", "#e08a55", "#6cb6e0", "#b39af0", "#e0a45a"];

function useIsDark() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.getAttribute("data-theme") === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

function useChartColors() {
  const dark = useIsDark();
  return useMemo(() => (dark ? DARK_COLORS : LIGHT_COLORS), [dark]);
}

const legendStyle = { color: "var(--muted)" };
const tickProps = { fill: "var(--muted)", fontSize: 11 };

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name}>
          <span style={{ color: p.color || p.fill || "var(--ink)" }}>{p.name}</span>:{" "}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

export function FleetStatusPie({ data }) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, xKey, bars }) {
  const colors = useChartColors();
  const dark = useIsDark();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={tickProps} />
        <YAxis tick={tickProps} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} />
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={resolveBarColor(b.color, i, colors, dark)}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function resolveBarColor(color, index, colors, dark) {
  if (!color) return colors[index % colors.length];
  // Swap near-black series colors in dark mode so they stay visible
  if (dark && (color === "#0b1520" || color === "#243447")) {
    return colors[1];
  }
  if (dark && color === "#1f7a6b") {
    return colors[0];
  }
  return color;
}

export function HorizontalBars({ data, xKey, yKey, color }) {
  const colors = useChartColors();
  const dark = useIsDark();
  const fill = color ? resolveBarColor(color, 0, colors, dark) : colors[0];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis type="number" tick={tickProps} />
        <YAxis
          type="category"
          dataKey={yKey}
          width={70}
          tick={tickProps}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey={xKey} name={xKey} fill={fill} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data, xKey, lines }) {
  const colors = useChartColors();
  const dark = useIsDark();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={tickProps} />
        <YAxis tick={tickProps} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={legendStyle} />
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={resolveBarColor(l.color, i, colors, dark)}
            strokeWidth={2.4}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function UtilizationGauge({ value }) {
  const colors = useChartColors();
  const dark = useIsDark();
  const data = [
    {
      name: "Utilization",
      value: Math.min(100, Math.max(0, value)),
      fill: colors[0],
    },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadialBarChart
        innerRadius="68%"
        outerRadius="100%"
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          background={{ fill: dark ? "#243447" : "#d7dee8" }}
          dataKey="value"
          cornerRadius={10}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-label"
        >
          {value}%
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export { LIGHT_COLORS as COLORS };
