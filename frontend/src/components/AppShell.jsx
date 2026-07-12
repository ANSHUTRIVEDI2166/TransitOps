import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { filterNav } from "../lib/roles";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/vehicles", label: "Fleet" },
  { to: "/drivers", label: "Drivers" },
  { to: "/trips", label: "Dispatch" },
  { to: "/maintenance", label: "Shop" },
  { to: "/expenses", label: "Costs" },
  { to: "/reports", label: "Insights" },
  { to: "/users", label: "Users" },
];

const roleLabel = {
  admin: "Admin",
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

function getInitialTheme() {
  const saved = localStorage.getItem("transitops_theme");
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("transitops_theme", theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">TransitOps</div>
        <p>Warming up the yard…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const navLinks = filterNav(links, user.role);

  return (
    <div className="shell">
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">TO</span>
          <div>
            <strong>TransitOps</strong>
            <span>Transport command</span>
          </div>
        </div>
        <nav className="nav">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-chip">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 7.2 7.2 0 1 0 20.5 14.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <div>
            <strong>{user.full_name}</strong>
            <span>{roleLabel[user.role] || user.role}</span>
          </div>
          <NavLink className="ghost-btn" to="/settings">
            Settings
          </NavLink>
          <button type="button" className="ghost-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
