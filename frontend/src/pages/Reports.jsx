import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  FleetStatusPie,
  HorizontalBars,
  SimpleBars,
  SimpleLine,
} from "../components/Charts";
import { PageHeader, TableSkeleton, formatMoney } from "../components/ui";
import { INSIGHTS_ROLES, hasRole } from "../lib/roles";
import Pagination from "../components/Pagination";
import { usePagination } from "../components/usePagination";

async function downloadAuth(url, filename) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const allowed = hasRole(user?.role, INSIGHTS_ROLES);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    Promise.all([api.analytics(), api.expenses()])
      .then(([analytics, expenseRows]) => {
        setData(analytics);
        setExpenses(expenseRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [allowed]);

  const costRevenue = useMemo(
    () =>
      data?.vehicles.map((v) => ({
        name: v.registration_number,
        cost: v.operational_cost,
        revenue: v.revenue,
      })) || [],
    [data]
  );

  const efficiencyLine = useMemo(
    () =>
      data?.vehicles
        .filter((v) => v.fuel_efficiency != null)
        .map((v) => ({
          name: v.registration_number,
          efficiency: v.fuel_efficiency,
          distance: v.total_distance,
        })) || [],
    [data]
  );

  const roiBars = useMemo(
    () =>
      data?.vehicles
        .filter((v) => v.roi != null)
        .map((v) => ({
          name: v.registration_number,
          roi: Number((v.roi * 100).toFixed(1)),
        })) || [],
    [data]
  );

  const spendPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Fuel", value: data.total_fuel_cost },
      { name: "Maintenance", value: data.total_maintenance_cost },
    ].filter((x) => x.value > 0);
  }, [data]);

  const categoryPie = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const vehicleRows = data?.vehicles || [];
  const {
    page,
    pageSize,
    total,
    slice,
    setPage,
    setPageSize,
  } = usePagination(vehicleRows);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Analytics"
        title="Insights"
        action={
          <div className="action-group">
            <button
              className="ghost-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await downloadAuth(
                    api.exportCsvUrl(),
                    "transitops-analytics.csv"
                  );
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Export CSV
            </button>
            <button
              className="primary-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await downloadAuth(
                    api.exportPdfUrl(),
                    "transitops-analytics.pdf"
                  );
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Export PDF
            </button>
          </div>
        }
      />

      {error && <p className="form-error">{error}</p>}

      {loading && !data && (
        <>
          <div className="skeleton-strip">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
          <div className="chart-grid">
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
          </div>
          <TableSkeleton rows={5} />
        </>
      )}

      {data && (
        <>
          <section className="kpi-strip">
            <div className="kpi">
              <span>Fleet utilization</span>
              <strong>{data.fleet_utilization_pct}%</strong>
            </div>
            <div className="kpi">
              <span>Operational cost</span>
              <strong>{formatMoney(data.total_operational_cost)}</strong>
            </div>
            <div className="kpi">
              <span>Fuel spend</span>
              <strong>{formatMoney(data.total_fuel_cost)}</strong>
            </div>
            <div className="kpi">
              <span>Maintenance spend</span>
              <strong>{formatMoney(data.total_maintenance_cost)}</strong>
            </div>
            <div className="kpi kpi-accent">
              <span>Avg fuel efficiency</span>
              <strong>
                {data.avg_fuel_efficiency
                  ? `${data.avg_fuel_efficiency} km/L`
                  : "—"}
              </strong>
            </div>
          </section>

          <div className="chart-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Cost vs revenue</h2>
              </div>
              <SimpleBars
                data={costRevenue}
                xKey="name"
                bars={[
                  { key: "cost", name: "Ops cost", color: "#1f7a6b" },
                  { key: "revenue", name: "Revenue", color: "#0b1520" },
                ]}
              />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Spend split</h2>
              </div>
              {spendPie.length ? (
                <FleetStatusPie data={spendPie} />
              ) : (
                <p className="muted">No spend logged yet.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Fuel efficiency by vehicle</h2>
              </div>
              {efficiencyLine.length ? (
                <SimpleLine
                  data={efficiencyLine}
                  xKey="name"
                  lines={[
                    {
                      key: "efficiency",
                      name: "km / L",
                      color: "#3d7ea6",
                    },
                  ]}
                />
              ) : (
                <p className="muted">Complete trips with fuel to unlock this.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Vehicle ROI (%)</h2>
              </div>
              {roiBars.length ? (
                <HorizontalBars
                  data={roiBars}
                  xKey="roi"
                  yKey="name"
                  color="#c45c26"
                />
              ) : (
                <p className="muted">ROI appears after revenue and costs exist.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Expense categories</h2>
              </div>
              {categoryPie.length ? (
                <FleetStatusPie data={categoryPie} />
              ) : (
                <p className="muted">No categorized expenses yet.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Distance covered</h2>
              </div>
              <SimpleBars
                data={
                  data.vehicles.map((v) => ({
                    name: v.registration_number,
                    distance: v.total_distance,
                  })) || []
                }
                xKey="name"
                bars={[
                  { key: "distance", name: "km", color: "#8b5cf6" },
                ]}
              />
            </section>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Efficiency</th>
                  <th>Fuel</th>
                  <th>Maintenance</th>
                  <th>Ops cost</th>
                  <th>Revenue</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((v) => (
                  <tr key={v.vehicle_id}>
                    <td>
                      <strong className="mono">{v.registration_number}</strong>
                      <div className="muted">{v.name}</div>
                    </td>
                    <td>
                      {v.fuel_efficiency != null
                        ? `${v.fuel_efficiency} km/L`
                        : "—"}
                    </td>
                    <td>{formatMoney(v.fuel_cost)}</td>
                    <td>{formatMoney(v.maintenance_cost)}</td>
                    <td>{formatMoney(v.operational_cost)}</td>
                    <td>{formatMoney(v.revenue)}</td>
                    <td>
                      {v.roi != null ? `${(v.roi * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
}
