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
  full_name: "",
  license_number: "",
  license_category: "LMV",
  license_expiry: "",
  contact_number: "",
  safety_score: "100",
  region: "West",
  status: "available",
};

export default function Drivers() {
  const { user } = useAuth();
  const canEdit = ["fleet_manager", "safety_officer", "admin"].includes(user?.role);
  const canRemind = ["fleet_manager", "safety_officer", "admin"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (status) list = list.filter((d) => d.status === status);
    if (region) list = list.filter((d) => d.region === region);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(needle) ||
          d.license_number?.toLowerCase().includes(needle) ||
          d.contact_number?.toLowerCase().includes(needle)
      );
    }
    list.sort((a, b) => {
      if (sort === "safety_high") {
        return Number(b.safety_score) - Number(a.safety_score);
      }
      if (sort === "safety_low") {
        return Number(a.safety_score) - Number(b.safety_score);
      }
      if (sort === "expiry") {
        return String(a.license_expiry).localeCompare(String(b.license_expiry));
      }
      return String(a.full_name).localeCompare(String(b.full_name));
    });
    return list;
  }, [rows, q, status, region, sort]);

  const { page, pageSize, total, slice, setPage, setPageSize } =
    usePagination(filtered);

  async function load() {
    setRows(await api.drivers());
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
      await api.createDriver({
        ...form,
        safety_score: Number(form.safety_score),
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

  return (
    <div className="stack">
      <PageHeader
        eyebrow="People & compliance"
        title="Drivers"
        action={
          <div className="action-group">
            {canRemind && (
              <button
                className="ghost-btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setInfo("");
                  try {
                    const res = await api.sendLicenseReminders();
                    setInfo(res.message);
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Email expiry alerts
              </button>
            )}
            {canEdit && (
              <button className="primary-btn" onClick={() => setOpen(true)}>
                Add driver
              </button>
            )}
          </div>
        }
      />

      {info && <p className="form-success">{info}</p>}

      <div className="filter-row">
        <input
          placeholder="Search name or license"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="on_trip">On trip</option>
          <option value="off_duty">Off duty</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Name A–Z</option>
          <option value="safety_high">Safety high → low</option>
          <option value="safety_low">Safety low → high</option>
          <option value="expiry">License expiry soonest</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No drivers" body="Add your first driver profile." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching drivers"
          body="Try another status, region, or search."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>License</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Contact</th>
                <th>Safety</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((d) => (
                <tr key={d.id} className={d.license_expired ? "row-warn" : ""}>
                  <td>{d.full_name}</td>
                  <td className="mono">{d.license_number}</td>
                  <td>{d.license_category}</td>
                  <td>
                    {d.license_expiry}
                    {d.license_expired && (
                      <span className="warn-tag"> Expired</span>
                    )}
                  </td>
                  <td>{d.contact_number}</td>
                  <td>
                    <div className="score">
                      <i style={{ width: `${d.safety_score}%` }} />
                      <span>{Number(d.safety_score).toFixed(0)}</span>
                    </div>
                  </td>
                  <td>
                    <StatusPill value={d.status} />
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
        <Modal title="Add driver" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Full name">
              <input
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Alex"
              />
            </Field>
            <Field label="License number">
              <input
                required
                value={form.license_number}
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <select
                value={form.license_category}
                onChange={(e) =>
                  setForm({ ...form, license_category: e.target.value })
                }
              >
                <option>LMV</option>
                <option>HMV</option>
                <option>MCWG</option>
              </select>
            </Field>
            <Field label="License expiry">
              <input
                required
                type="date"
                value={form.license_expiry}
                onChange={(e) =>
                  setForm({ ...form, license_expiry: e.target.value })
                }
              />
            </Field>
            <Field label="Contact">
              <input
                required
                value={form.contact_number}
                onChange={(e) =>
                  setForm({ ...form, contact_number: e.target.value })
                }
              />
            </Field>
            <Field label="Safety score">
              <input
                type="number"
                min="0"
                max="100"
                value={form.safety_score}
                onChange={(e) =>
                  setForm({ ...form, safety_score: e.target.value })
                }
              />
            </Field>
            <Field label="Region">
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option>North</option>
                <option>South</option>
                <option>East</option>
                <option>West</option>
              </select>
            </Field>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-btn" disabled={busy}>
              {busy ? "Saving…" : "Save driver"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
