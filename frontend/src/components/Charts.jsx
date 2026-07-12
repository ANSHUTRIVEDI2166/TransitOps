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

const COLORS = ["#1f7a6b", "#0b1520", "#c45c26", "#3d7ea6", "#8b5cf6", "#b45309"];

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name}>
          <span style={{ color: p.color || p.fill }}>{p.name}</span>:{" "}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

export function FleetStatusPie({ data }) {
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
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, xKey, bars }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color || COLORS[i % COLORS.length]}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, xKey, yKey, color = COLORS[0] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey={yKey}
          width={70}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey={xKey} name={xKey} fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data, xKey, lines }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color || COLORS[i % COLORS.length]}
            strokeWidth={2.4}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function UtilizationGauge({ value }) {
  const data = [{ name: "Utilization", value: Math.min(100, Math.max(0, value)), fill: COLORS[0] }];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadialBarChart
        innerRadius="68%"
        outerRadius="100%"
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar background dataKey="value" cornerRadius={10} />
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

export { COLORS };
