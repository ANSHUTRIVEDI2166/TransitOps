import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
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
        <h1>
          Run the fleet
          <br />
          like a product.
        </h1>
        <p className="login-copy">
          Your admin creates your account and emails you login credentials.
        </p>
      </div>
      <form className="login-panel" onSubmit={onSubmit}>
        <h2>Sign in</h2>
        <p className="muted">Use the email and password sent to your inbox.</p>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" disabled={busy}>
          {busy ? "Signing in…" : "Enter workspace"}
        </button>
        <p className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </form>
    </div>
  );
}
