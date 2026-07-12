import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Field, PageHeader } from "../components/ui";

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setInfo(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader eyebrow="Account" title="Settings" />
      <section className="panel" style={{ maxWidth: 480 }}>
        <div className="panel-head">
          <h2>Change password</h2>
        </div>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Signed in as {user?.email}
        </p>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Current password">
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-success">{info}</p>}
          <button className="primary-btn" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
