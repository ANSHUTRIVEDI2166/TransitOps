import { useEffect, useState } from "react";
import { api, getToken } from "../api/client";
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

const emptyForm = {
  registration_number: "",
  name: "",
  vehicle_type: "van",
  max_load_kg: "",
  odometer_km: "0",
  acquisition_cost: "",
  region: "West",
  status: "available",
};

export default function Vehicles() {
  const { user } = useAuth();
  const canEdit = ["fleet_manager", "admin"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [docsFor, setDocsFor] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { page, pageSize, total, slice, setPage, setPageSize } =
    usePagination(rows);

  async function load() {
    const data = await api.vehicles(q ? { q } : {});
    setRows(data);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function openDocs(vehicle) {
    setDocsFor(vehicle);
    setError("");
    try {
      setDocs(await api.vehicleDocuments(vehicle.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createVehicle({
        ...form,
        max_load_kg: Number(form.max_load_kg),
        odometer_km: Number(form.odometer_km),
        acquisition_cost: Number(form.acquisition_cost || 0),
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

  async function onUploadDoc(e) {
    e.preventDefault();
    if (!docFile || !docsFor) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadVehicleDocument(
        docsFor.id,
        docTitle || docFile.name,
        docFile
      );
      setDocTitle("");
      setDocFile(null);
      setDocs(await api.vehicleDocuments(docsFor.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Asset registry"
        title="Fleet"
        action={
          canEdit && (
            <button className="primary-btn" onClick={() => setOpen(true)}>
              Register vehicle
            </button>
          )
        }
      />

      <div className="toolbar">
        <input
          placeholder="Search reg no or model"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="ghost-btn" onClick={load}>
          Search
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No vehicles yet" body="Register your first asset." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Odometer</th>
                <th>Acquisition</th>
                <th>Region</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.registration_number}</td>
                  <td>{v.name}</td>
                  <td>{v.vehicle_type}</td>
                  <td>{Number(v.max_load_kg)} kg</td>
                  <td>{Number(v.odometer_km).toLocaleString()} km</td>
                  <td>{formatMoney(v.acquisition_cost)}</td>
                  <td>{v.region || "—"}</td>
                  <td>
                    <StatusPill value={v.status} />
                  </td>
                  <td>
                    <button className="ghost-btn" onClick={() => openDocs(v)}>
                      Docs
                    </button>
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
        <Modal title="Register vehicle" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Registration number">
              <input
                required
                value={form.registration_number}
                onChange={(e) =>
                  setForm({ ...form, registration_number: e.target.value })
                }
                placeholder="Van-05"
              />
            </Field>
            <Field label="Name / model">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.vehicle_type}
                onChange={(e) =>
                  setForm({ ...form, vehicle_type: e.target.value })
                }
              >
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="trailer">Trailer</option>
                <option value="bike">Bike</option>
              </select>
            </Field>
            <Field label="Max load (kg)">
              <input
                required
                type="number"
                min="1"
                value={form.max_load_kg}
                onChange={(e) =>
                  setForm({ ...form, max_load_kg: e.target.value })
                }
              />
            </Field>
            <Field label="Odometer (km)">
              <input
                type="number"
                min="0"
                value={form.odometer_km}
                onChange={(e) =>
                  setForm({ ...form, odometer_km: e.target.value })
                }
              />
            </Field>
            <Field label="Acquisition cost">
              <input
                type="number"
                min="0"
                value={form.acquisition_cost}
                onChange={(e) =>
                  setForm({ ...form, acquisition_cost: e.target.value })
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
              {busy ? "Saving…" : "Save vehicle"}
            </button>
          </form>
        </Modal>
      )}

      {docsFor && (
        <Modal
          title={`Documents · ${docsFor.registration_number}`}
          onClose={() => setDocsFor(null)}
          wide
        >
          {canEdit && (
            <form className="form-grid two" onSubmit={onUploadDoc}>
              <Field label="Title">
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="RC / Insurance / Permit"
                />
              </Field>
              <Field label="File">
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
              </Field>
              <button className="primary-btn" disabled={busy || !docFile}>
                {busy ? "Uploading…" : "Upload document"}
              </button>
            </form>
          )}

          {docs.length === 0 ? (
            <EmptyState
              title="No documents yet"
              body="Upload RC, insurance, or permits for this vehicle."
            />
          ) : (
            <ul className="timeline" style={{ marginTop: "1rem" }}>
              {docs.map((doc) => (
                <li key={doc.id}>
                  <div>
                    <strong>{doc.title}</strong>
                    <p>
                      {doc.original_name} ·{" "}
                      {(doc.size_bytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="trip-actions">
                    <button
                      className="ghost-btn"
                      onClick={async () => {
                        const res = await fetch(
                          api.downloadDocumentUrl(doc.id),
                          {
                            headers: {
                              Authorization: `Bearer ${getToken()}`,
                            },
                          }
                        );
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.original_name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Download
                    </button>
                    {canEdit && (
                      <button
                        className="ghost-btn"
                        onClick={async () => {
                          await api.deleteDocument(doc.id);
                          setDocs(await api.vehicleDocuments(docsFor.id));
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
