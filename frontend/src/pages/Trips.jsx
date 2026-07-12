import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import { usePagination } from "../components/usePagination";
import {
  EmptyState,
  Field,
  Modal,
  PageHeader,
  StatusPill,
  TableSkeleton,
} from "../components/ui";

const emptyForm = {
  source: "",
  destination: "",
  vehicle_id: "",
  driver_id: "",
  cargo_weight_kg: "",
  planned_distance_km: "",
  revenue: "0",
  notes: "",
};

export default function Trips() {
  const { user } = useAuth();
  const canEdit = ["fleet_manager", "dispatcher", "admin"].includes(user?.role);
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [open, setOpen] = useState(false);
  const [completeFor, setCompleteFor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [completeForm, setCompleteForm] = useState({
    final_odometer_km: "",
    fuel_consumed_liters: "",
    fuel_cost: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = [...trips];
    if (status) list = list.filter((t) => t.status === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.id).includes(needle) ||
          t.source?.toLowerCase().includes(needle) ||
          t.destination?.toLowerCase().includes(needle) ||
          t.vehicle_reg?.toLowerCase().includes(needle) ||
          t.driver_name?.toLowerCase().includes(needle)
      );
    }
    list.sort((a, b) => {
      if (sort === "oldest") return a.id - b.id;
      if (sort === "route") {
        return `${a.source}${a.destination}`.localeCompare(
          `${b.source}${b.destination}`
        );
      }
      return b.id - a.id;
    });
    return list;
  }, [trips, status, sort, q]);

  const { page, pageSize, total, slice, setPage, setPageSize } =
    usePagination(filtered);

  async function load() {
    const [t, v, d] = await Promise.all([
      api.trips(),
      api.vehicles({ available_only: true }),
      api.drivers({ available_only: true }),
    ]);
    setTrips(t);
    setVehicles(v);
    setDrivers(d);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createTrip({
        ...form,
        vehicle_id: Number(form.vehicle_id),
        driver_id: Number(form.driver_id),
        cargo_weight_kg: Number(form.cargo_weight_kg),
        planned_distance_km: Number(form.planned_distance_km),
        revenue: Number(form.revenue || 0),
      });
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onComplete(e) {
    e.preventDefault();
    await act(() =>
      api.completeTrip(completeFor.id, {
        final_odometer_km: Number(completeForm.final_odometer_km),
        fuel_consumed_liters: Number(completeForm.fuel_consumed_liters),
        fuel_cost: Number(completeForm.fuel_cost || 0),
      })
    );
    setCompleteFor(null);
    setCompleteForm({
      final_odometer_km: "",
      fuel_consumed_liters: "",
      fuel_cost: "",
    });
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Trip lifecycle"
        title="Dispatch"
        action={
          canEdit && (
            <button className="primary-btn" onClick={() => setOpen(true)}>
              Create trip
            </button>
          )
        }
      />

      <div className="filter-row">
        <input
          placeholder="Search route, vehicle, driver…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="route">Route A–Z</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <TableSkeleton />
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          body="Create a draft trip, then dispatch when ready."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching trips"
          body="Try another status, search, or sort."
        />
      ) : (
        <div className="trip-list">
          {slice.map((trip) => (
            <article key={trip.id} className="trip-row">
              <div className="trip-main">
                <p className="eyebrow">Trip #{trip.id}</p>
                <h3>
                  {trip.source}
                  <span>→</span>
                  {trip.destination}
                </h3>
                <p>
                  {trip.vehicle_reg} · {trip.driver_name} ·{" "}
                  {Number(trip.cargo_weight_kg)} kg ·{" "}
                  {Number(trip.planned_distance_km)} km planned
                </p>
              </div>
              <StatusPill value={trip.status} />
              {canEdit && (
                <div className="trip-actions">
                  {trip.status === "draft" && (
                    <button
                      className="primary-btn"
                      disabled={busy}
                      onClick={() => act(() => api.dispatchTrip(trip.id))}
                    >
                      Dispatch
                    </button>
                  )}
                  {trip.status === "dispatched" && (
                    <button
                      className="primary-btn"
                      onClick={() => setCompleteFor(trip)}
                    >
                      Complete
                    </button>
                  )}
                  {["draft", "dispatched"].includes(trip.status) && (
                    <button
                      className="ghost-btn"
                      disabled={busy}
                      onClick={() => act(() => api.cancelTrip(trip.id))}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {open && (
        <Modal title="Create trip" onClose={() => setOpen(false)} wide>
          <form className="form-grid two" onSubmit={onCreate}>
            <Field label="Source">
              <input
                required
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </Field>
            <Field label="Destination">
              <input
                required
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
              />
            </Field>
            <Field label="Available vehicle">
              <select
                required
                value={form.vehicle_id}
                onChange={(e) =>
                  setForm({ ...form, vehicle_id: e.target.value })
                }
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} · max {v.max_load_kg} kg
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Available driver">
              <select
                required
                value={form.driver_id}
                onChange={(e) =>
                  setForm({ ...form, driver_id: e.target.value })
                }
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} · {d.license_category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cargo weight (kg)">
              <input
                required
                type="number"
                min="1"
                value={form.cargo_weight_kg}
                onChange={(e) =>
                  setForm({ ...form, cargo_weight_kg: e.target.value })
                }
              />
            </Field>
            <Field label="Planned distance (km)">
              <input
                required
                type="number"
                min="1"
                value={form.planned_distance_km}
                onChange={(e) =>
                  setForm({ ...form, planned_distance_km: e.target.value })
                }
              />
            </Field>
            <Field label="Expected revenue">
              <input
                type="number"
                min="0"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-btn" disabled={busy}>
              {busy ? "Creating…" : "Save draft"}
            </button>
          </form>
        </Modal>
      )}

      {completeFor && (
        <Modal
          title={`Complete trip #${completeFor.id}`}
          onClose={() => setCompleteFor(null)}
        >
          <form className="form-grid" onSubmit={onComplete}>
            <Field label="Final odometer (km)">
              <input
                required
                type="number"
                min="1"
                value={completeForm.final_odometer_km}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    final_odometer_km: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Fuel consumed (liters)">
              <input
                required
                type="number"
                min="0"
                step="0.1"
                value={completeForm.fuel_consumed_liters}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    fuel_consumed_liters: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Fuel cost">
              <input
                type="number"
                min="0"
                value={completeForm.fuel_cost}
                onChange={(e) =>
                  setCompleteForm({
                    ...completeForm,
                    fuel_cost: e.target.value,
                  })
                }
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-btn" disabled={busy}>
              Mark completed
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
