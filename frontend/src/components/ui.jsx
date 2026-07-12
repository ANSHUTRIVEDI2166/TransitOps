import { useEffect } from "react";
import { createPortal } from "react-dom";

export function StatusPill({ value }) {
  const key = String(value || "").replace(/\s+/g, "_").toLowerCase();
  return <span className={`pill pill-${key}`}>{formatStatus(value)}</span>;
}

export function formatStatus(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export function EmptyState({ title, body }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}
