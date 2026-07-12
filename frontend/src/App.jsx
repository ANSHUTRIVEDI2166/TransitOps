import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import RoleRoute from "./components/RoleRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Trips from "./pages/Trips";
import Maintenance from "./pages/Maintenance";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import "./styles/global.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/vehicles"
              element={
                <RoleRoute path="/vehicles">
                  <Vehicles />
                </RoleRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <RoleRoute path="/drivers">
                  <Drivers />
                </RoleRoute>
              }
            />
            <Route
              path="/trips"
              element={
                <RoleRoute path="/trips">
                  <Trips />
                </RoleRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <RoleRoute path="/maintenance">
                  <Maintenance />
                </RoleRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <RoleRoute path="/expenses">
                  <Expenses />
                </RoleRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleRoute path="/reports">
                  <Reports />
                </RoleRoute>
              }
            />
            <Route
              path="/users"
              element={
                <RoleRoute path="/users">
                  <Users />
                </RoleRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
