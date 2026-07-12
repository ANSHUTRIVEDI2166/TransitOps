import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const saved = localStorage.getItem("transitops_theme");
if (saved === "dark" || saved === "light") {
  document.documentElement.setAttribute("data-theme", saved);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
