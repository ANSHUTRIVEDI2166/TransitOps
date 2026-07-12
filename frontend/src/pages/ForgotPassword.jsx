import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
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
        <h1>Reset access</h1>
        <p className="login-copy">
          We’ll email you a secure link to set a new password.
        </p>
      </div>
      <form className="login-panel" onSubmit={onSubmit}>
        <h2>Forgot password</h2>
        <label className="field">
          <span>Account email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button className="primary-btn" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
