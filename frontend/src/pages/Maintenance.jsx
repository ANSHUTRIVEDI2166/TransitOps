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
  formatMoney,
} from "../components/ui";

export default function Maintenance() {
  const { user } = useAuth();
  const canEdit = ["fleet_manager", "admin"].includes(user?.role);
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    vehicle_id: "",
    title: "",
    description: "",
    cost: "",
    service_date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(() => {
    let list = [...logs];
    if (status) list = list.filter((l) => l.status === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.vehicle_reg?.toLowerCase().includes(needle) ||
          l.title?.toLowerCase().includes(needle) ||
          l.description?.toLowerCase().includes(needle)
      );
    }
    list.sort((a, b) => {
      if (sort === "oldest") {
        return String(a.service_date).localeCompare(String(b.service_date));
      }
      if (sort === "cost_high") {
        return Number(b.cost) - Number(a.cost);
      }
      if (sort === "cost_low") {
        return Number(a.cost) - Number(b.cost);
      }
      return (
        String(b.service_date).localeCompare(String(a.service_date)) ||
        b.id - a.id
      );
    });
    return list;
  }, [logs, status, sort, q]);

  const { page, pageSize, total, slice, setPage, setPageSize } =
    usePagination(filtered);

  async function load() {
    const [m, v] = await Promise.all([api.maintenance(), api.vehicles()]);
    setLogs(m);
    setVehicles(
      v.filter((item) => !["retired", "on_trip"].includes(item.status))
    );
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createMaintenance({
        ...form,
        vehicle_id: Number(form.vehicle_id),
        cost: Number(form.cost || 0),
      });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Workshop"
        title="Maintenance"
        action={
          canEdit && (
            <button className="primary-btn" onClick={() => setOpen(true)}>
              Open shop ticket
            </button>
          )
        }
      />

      <div className="filter-row">
        <input
          placeholder="Search vehicle or work…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest date</option>
          <option value="oldest">Oldest date</option>
          <option value="cost_high">Cost high → low</option>
          <option value="cost_low">Cost low → high</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <TableSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Shop is clear"
          body="Open a maintenance log to pull a vehicle off the road."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching tickets"
          body="Try another status or search."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Work</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((log) => (
                <tr key={log.id}>
                  <td className="mono">{log.vehicle_reg}</td>
                  <td>
                    <strong>{log.title}</strong>
                    {log.description && (
                      <p className="muted">{log.description}</p>
                    )}
                  </td>
                  <td>{log.service_date}</td>
                  <td>{formatMoney(log.cost)}</td>
                  <td>
                    <StatusPill value={log.status} />
                  </td>
                  <td>
                    {canEdit && log.status === "open" && (
                      <button
                        className="ghost-btn"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api.closeMaintenance(log.id);
                            await load();
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Close
                      </button>
                    )}
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
      )}

      {open && (
        <Modal title="Maintenance log" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Vehicle">
              <select
                required
                value={form.vehicle_id}
                onChange={(e) =>
                  setForm({ ...form, vehicle_id: e.target.value })
                }
              >
                <option value="">Select</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} · {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Oil Change"
              />
            </Field>
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Cost">
              <input
                type="number"
                min="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Field>
            <Field label="Service date">
              <input
                type="date"
                required
                value={form.service_date}
                onChange={(e) =>
                  setForm({ ...form, service_date: e.target.value })
                }
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-btn" disabled={busy}>
              Create log
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
