const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("transitops_token");
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof URLSearchParams
      ? { "Content-Type": "application/x-www-form-urlencoded" }
      : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof URLSearchParams)
        ? JSON.stringify(options.body)
        : options.body,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || detail;
      if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  login: (email, password) => {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    return request("/api/auth/login", { method: "POST", body });
  },
  me: () => request("/api/auth/me"),
  forgotPassword: (email) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),
  resetPassword: (token, new_password) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: { token, new_password },
    }),
  changePassword: (current_password, new_password) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: { current_password, new_password },
    }),
  users: () => request("/api/users"),
  createUser: (body) => request("/api/users", { method: "POST", body }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: "PATCH", body }),
  deactivateUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
  resendCredentials: (id) =>
    request(`/api/users/${id}/resend-credentials`, { method: "POST" }),
  dashboard: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/dashboard${q ? `?${q}` : ""}`);
  },
  dashboardOverview: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/dashboard/overview${q ? `?${q}` : ""}`);
  },
  vehicles: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/vehicles${q ? `?${q}` : ""}`);
  },
  createVehicle: (body) => request("/api/vehicles", { method: "POST", body }),
  updateVehicle: (id, body) =>
    request(`/api/vehicles/${id}`, { method: "PATCH", body }),
  drivers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/drivers${q ? `?${q}` : ""}`);
  },
  createDriver: (body) => request("/api/drivers", { method: "POST", body }),
  updateDriver: (id, body) =>
    request(`/api/drivers/${id}`, { method: "PATCH", body }),
  trips: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/trips${q ? `?${q}` : ""}`);
  },
  createTrip: (body) => request("/api/trips", { method: "POST", body }),
  dispatchTrip: (id) => request(`/api/trips/${id}/dispatch`, { method: "POST" }),
  completeTrip: (id, body) =>
    request(`/api/trips/${id}/complete`, { method: "POST", body }),
  cancelTrip: (id) => request(`/api/trips/${id}/cancel`, { method: "POST" }),
  maintenance: () => request("/api/maintenance"),
  createMaintenance: (body) =>
    request("/api/maintenance", { method: "POST", body }),
  closeMaintenance: (id) =>
    request(`/api/maintenance/${id}/close`, { method: "POST" }),
  fuel: () => request("/api/fuel"),
  createFuel: (body) => request("/api/fuel", { method: "POST", body }),
  expenses: () => request("/api/expenses"),
  createExpense: (body) => request("/api/expenses", { method: "POST", body }),
  analytics: () => request("/api/analytics"),
  exportCsvUrl: () => `${API_BASE}/api/analytics/export.csv`,
  exportPdfUrl: () => `${API_BASE}/api/analytics/export.pdf`,
  sendLicenseReminders: () =>
    request("/api/drivers/reminders/license-expiry", { method: "POST" }),
  vehicleDocuments: (vehicleId) =>
    request(`/api/vehicles/${vehicleId}/documents`),
  uploadVehicleDocument: async (vehicleId, title, file) => {
    const body = new FormData();
    body.append("title", title);
    body.append("file", file);
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}/documents`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) {
      let detail = "Upload failed";
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },
  downloadDocumentUrl: (docId) =>
    `${API_BASE}/api/vehicles/documents/${docId}/download`,
  deleteDocument: (docId) =>
    request(`/api/vehicles/documents/${docId}`, { method: "DELETE" }),
};

export { API_BASE, getToken };
