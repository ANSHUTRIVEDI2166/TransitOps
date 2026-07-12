import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  FleetStatusPie,
  SimpleBars,
  UtilizationGauge,
  HorizontalBars,
} from "../components/Charts";
import { PageHeader, StatusPill, formatStatus, formatMoney } from "../components/ui";
import {
  DISPATCH_ROLES,
  FINANCE_ROLES,
  SAFETY_ROLES,
  hasRole,
} from "../lib/roles";

const kpiMeta = [
  { key: "active_vehicles", label: "Active fleet" },
  { key: "available_vehicles", label: "Available" },
  { key: "vehicles_in_maintenance", label: "In shop" },
  { key: "active_trips", label: "Live trips" },
  { key: "pending_trips", label: "Pending" },
  { key: "drivers_on_duty", label: "Drivers on duty" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;
  const [kpis, setKpis] = useState(null);
  const [fleetMix, setFleetMix] = useState([]);
  const [tripMix, setTripMix] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [opsCost, setOpsCost] = useState(null);
  const [filters, setFilters] = useState({
    vehicle_type: "",
    status: "",
    region: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const showDispatch = hasRole(role, DISPATCH_ROLES);
  const showSafety = hasRole(role, SAFETY_ROLES) || role === "dispatcher";
  const showFinance = hasRole(role, FINANCE_ROLES);
  const showFleetCharts = hasRole(role, ["fleet_manager", "dispatcher", "admin"]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v)
        );
        const data = await api.dashboardOverview(params);
        if (!alive) return;
        setKpis(data.kpis);
        setFleetMix(data.fleet_mix || []);
        setTripMix(data.trip_mix || []);
        setLiveTrips(data.live_trips || []);
        setDrivers(data.license_watch || []);
        setOpsCost(data.ops_cost);
        setError("");
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [filters]);

  const safetyBars = drivers.map((d) => ({
    name: d.full_name.split(" ")[0],
    score: Number(d.safety_score),
  }));

  const titleByRole = {
    admin: "Command center",
    fleet_manager: "Fleet operations",
    dispatcher: "Dispatch desk",
    safety_officer: "Safety desk",
    financial_analyst: "Finance overview",
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Home"
        title={titleByRole[role] || "Operations board"}
        action={
          showDispatch ? (
            <Link className="primary-btn" to="/trips">
              New dispatch
            </Link>
          ) : showFinance ? (
            <Link className="primary-btn" to="/reports">
              Open insights
            </Link>
          ) : (
            <Link className="primary-btn" to="/drivers">
              Review drivers
            </Link>
          )
        }
      />

      {showFleetCharts && (
        <div className="filter-row">
          <select
            value={filters.vehicle_type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, vehicle_type: e.target.value }))
            }
          >
            <option value="">All types</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="trailer">Trailer</option>
            <option value="bike">Bike</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="on_trip">On Trip</option>
            <option value="in_shop">In Shop</option>
            <option value="retired">Retired</option>
          </select>
          <select
            value={filters.region}
            onChange={(e) =>
              setFilters((f) => ({ ...f, region: e.target.value }))
            }
          >
            <option value="">All regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="West">West</option>
            <option value="East">East</option>
          </select>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {loading && !kpis && (
        <>
          <div className="skeleton-strip">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
          <div className="chart-grid">
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
          </div>
        </>
      )}

      {kpis && (
        <section className="kpi-strip">
          {kpiMeta.map((item) => (
            <div key={item.key} className="kpi">
              <span>{item.label}</span>
              <strong>{kpis[item.key]}</strong>
            </div>
          ))}
          <div className="kpi kpi-accent">
            <span>Fleet utilization</span>
            <strong>{kpis.fleet_utilization_pct}%</strong>
          </div>
          {showFinance && opsCost != null && (
            <div className="kpi">
              <span>Ops cost</span>
              <strong>{formatMoney(opsCost)}</strong>
            </div>
          )}
        </section>
      )}

      {!loading || kpis ? (
      <div className="chart-grid">
        {showFleetCharts && (
          <section className="panel">
            <div className="panel-head">
              <h2>Fleet mix</h2>
            </div>
            {fleetMix.length ? (
              <FleetStatusPie data={fleetMix} />
            ) : (
              <p className="muted">No fleet data yet.</p>
            )}
          </section>
        )}

        {showFleetCharts && kpis && (
          <section className="panel">
            <div className="panel-head">
              <h2>Utilization</h2>
            </div>
            <UtilizationGauge value={kpis.fleet_utilization_pct} />
          </section>
        )}

        {showDispatch && (
          <section className="panel">
            <div className="panel-head">
              <h2>Trip pipeline</h2>
            </div>
            <SimpleBars
              data={tripMix}
              xKey="name"
              bars={[{ key: "trips", name: "Trips", color: "#1f7a6b" }]}
            />
          </section>
        )}

        {showSafety && (
          <section className="panel">
            <div className="panel-head">
              <h2>Expiring licenses · safety scores</h2>
            </div>
            {safetyBars.length ? (
              <HorizontalBars
                data={safetyBars}
                xKey="score"
                yKey="name"
                color="#c45c26"
              />
            ) : (
              <p className="muted">No licenses expiring in the next 30 days.</p>
            )}
          </section>
        )}
      </div>
      ) : null}

      {!loading || kpis ? (
      <div className="board-grid">
        {showDispatch && (
          <section className="panel">
            <div className="panel-head">
              <h2>Active deliveries</h2>
              <Link to="/trips">View all</Link>
            </div>
            {liveTrips.length === 0 ? (
              <p className="muted">No trips on the road right now.</p>
            ) : (
              <ul className="timeline">
                {liveTrips.map((trip) => (
                  <li key={trip.id}>
                    <div>
                      <strong>
                        {trip.source} → {trip.destination}
                      </strong>
                      <p>
                        {trip.vehicle_reg} · {trip.driver_name}
                      </p>
                    </div>
                    <StatusPill value={trip.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showSafety && (
          <section className="panel">
            <div className="panel-head">
              <h2>License watch</h2>
              <Link to="/drivers">Drivers</Link>
            </div>
            {drivers.length === 0 ? (
              <p className="muted">No licenses expiring in the next 30 days.</p>
            ) : (
              <ul className="timeline">
                {drivers.map((d) => (
                  <li key={d.id}>
                    <div>
                      <strong>{d.full_name}</strong>
                      <p>
                        Expires {d.license_expiry} · Score {d.safety_score}
                      </p>
                    </div>
                    <StatusPill value={formatStatus(d.status)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      ) : null}
    </div>
  );
}
