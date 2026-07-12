import { useEffect, useState } from "react";
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
  formatMoney,
} from "../components/ui";

export default function Expenses() {
  const { user } = useAuth();
  const canFuel = ["fleet_manager", "dispatcher", "financial_analyst", "admin"].includes(
    user?.role
  );
  const canExpense = ["fleet_manager", "financial_analyst", "admin"].includes(user?.role);
  const [fuel, setFuel] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fuelPage = usePagination(fuel);
  const expensePage = usePagination(expenses);
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: "",
    liters: "",
    cost: "",
    log_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: "",
    category: "toll",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  async function load() {
    const [f, e, v] = await Promise.all([
      api.fuel(),
      api.expenses(),
      api.vehicles(),
    ]);
    setFuel(f);
    setExpenses(e);
    setVehicles(v);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submitFuel(ev) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createFuel({
        ...fuelForm,
        vehicle_id: Number(fuelForm.vehicle_id),
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitExpense(ev) {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createExpense({
        ...expenseForm,
        vehicle_id: expenseForm.vehicle_id
          ? Number(expenseForm.vehicle_id)
          : null,
        amount: Number(expenseForm.amount),
      });
      setMode(null);
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
        eyebrow="Spend control"
        title="Fuel & expenses"
        action={
          <div className="action-group">
            {canFuel && (
              <button className="ghost-btn" onClick={() => setMode("fuel")}>
                Log fuel
              </button>
            )}
            {canExpense && (
              <button className="primary-btn" onClick={() => setMode("expense")}>
                Add expense
              </button>
            )}
          </div>
        }
      />

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
      <div className="board-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Fuel logs</h2>
          </div>
          {fuel.length === 0 ? (
            <EmptyState
              title="No fuel entries"
              body="Trip completions also auto-log fuel."
            />
          ) : (
            <>
              <ul className="timeline">
                {fuelPage.slice.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{row.vehicle_reg}</strong>
                      <p>
                        {row.liters} L · {formatMoney(row.cost)} · {row.log_date}
                      </p>
                    </div>
                    <StatusPill value="fuel" />
                  </li>
                ))}
              </ul>
              <Pagination
                page={fuelPage.page}
                pageSize={fuelPage.pageSize}
                total={fuelPage.total}
                onPageChange={fuelPage.setPage}
                onPageSizeChange={fuelPage.setPageSize}
              />
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>All expenses</h2>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses"
              body="Toll, fuel, and maintenance land here."
            />
          ) : (
            <>
              <ul className="timeline">
                {expensePage.slice.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>
                        {row.vehicle_reg || "General"} · {formatMoney(row.amount)}
                      </strong>
                      <p>
                        {row.description || "—"} · {row.expense_date}
                      </p>
                    </div>
                    <StatusPill value={row.category} />
                  </li>
                ))}
              </ul>
              <Pagination
                page={expensePage.page}
                pageSize={expensePage.pageSize}
                total={expensePage.total}
                onPageChange={expensePage.setPage}
                onPageSizeChange={expensePage.setPageSize}
              />
            </>
          )}
        </section>
      </div>
      )}

      {mode === "fuel" && (
        <Modal title="Log fuel" onClose={() => setMode(null)}>
          <form className="form-grid" onSubmit={submitFuel}>
            <Field label="Vehicle">
              <select
                required
                value={fuelForm.vehicle_id}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, vehicle_id: e.target.value })
                }
              >
                <option value="">Select</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Liters">
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={fuelForm.liters}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, liters: e.target.value })
                }
              />
            </Field>
            <Field label="Cost">
              <input
                required
                type="number"
                min="0"
                value={fuelForm.cost}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, cost: e.target.value })
                }
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                value={fuelForm.log_date}
                onChange={(e) =>
                  setFuelForm({ ...fuelForm, log_date: e.target.value })
                }
              />
            </Field>
            <button className="primary-btn" disabled={busy}>
              Save fuel log
            </button>
          </form>
        </Modal>
      )}

      {mode === "expense" && (
        <Modal title="Add expense" onClose={() => setMode(null)}>
          <form className="form-grid" onSubmit={submitExpense}>
            <Field label="Vehicle (optional)">
              <select
                value={expenseForm.vehicle_id}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })
                }
              >
                <option value="">General</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
              >
                <option value="toll">Toll</option>
                <option value="maintenance">Maintenance</option>
                <option value="fuel">Fuel</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Amount">
              <input
                required
                type="number"
                min="1"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                value={expenseForm.expense_date}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expense_date: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Description">
              <input
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
              />
            </Field>
            <button className="primary-btn" disabled={busy}>
              Save expense
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
