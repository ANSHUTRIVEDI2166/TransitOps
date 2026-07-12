import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
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

const ROLES = [
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "safety_officer", label: "Safety Officer" },
  { value: "financial_analyst", label: "Financial Analyst" },
  { value: "admin", label: "Admin" },
];

const emptyForm = {
  email: "",
  full_name: "",
  role: "dispatcher",
  password: "",
};

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { page, pageSize, total, slice, setPage, setPageSize } =
    usePagination(rows);

  async function load() {
    setRows(await api.users());
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const body = {
        email: form.email,
        full_name: form.full_name,
        role: form.role,
      };
      if (form.password.trim()) body.password = form.password.trim();
      await api.createUser(body);
      setOpen(false);
      setForm(emptyForm);
      setInfo("User created. Login credentials were emailed.");
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
        eyebrow="Access control"
        title="Users"
        action={
          <button className="primary-btn" onClick={() => setOpen(true)}>
            Create user
          </button>
        }
      />

      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-success">{info}</p>}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No users yet"
          body="Create a user and they’ll get email + password by email."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr key={row.id}>
                  <td>{row.full_name}</td>
                  <td className="mono">{row.email}</td>
                  <td>{row.role.replace(/_/g, " ")}</td>
                  <td>
                    <StatusPill value={row.is_active ? "available" : "suspended"} />
                  </td>
                  <td>
                    <div className="trip-actions">
                      <button
                        className="ghost-btn"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            const res = await api.resendCredentials(row.id);
                            setInfo(res.message);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Resend login
                      </button>
                      {row.id !== user.id && (
                        <button
                          className="ghost-btn"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              if (row.is_active) {
                                await api.deactivateUser(row.id);
                              } else {
                                await api.updateUser(row.id, { is_active: true });
                              }
                              await load();
                            } catch (err) {
                              setError(err.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {row.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
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
        <Modal title="Create user" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={onCreate}>
            <Field label="Full name">
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Password (optional — auto-generated if empty)">
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to auto-generate"
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-btn" disabled={busy}>
              {busy ? "Creating & emailing…" : "Create & email credentials"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
