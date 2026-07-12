import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(token, password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-visual">
        <div className="login-glow" />
        <p className="login-kicker">TransitOps</p>
        <h1>Choose a new password</h1>
      </div>
      <form className="login-panel" onSubmit={onSubmit}>
        <h2>Reset password</h2>
        {!token && (
          <p className="form-error">
            Missing reset token. Open the link from your email.
          </p>
        )}
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" disabled={busy || !token}>
          {busy ? "Saving…" : "Update password"}
        </button>
        <p className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
