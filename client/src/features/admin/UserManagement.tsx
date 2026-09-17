import { useEffect, useState } from "react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  AdminUser,
} from "../../api";
import { useAuth } from "../../context/AuthContext";

type LoadState = "loading" | "success" | "error";
type FormMode = "closed" | "create" | "edit";

const EMPTY_FORM = { name: "", email: "", role: "REQUESTER" as const, isActive: true };

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function load() {
    setLoadState("loading");
    try {
      const data = await fetchAdminUsers({ search: search || undefined, role: roleFilter || undefined });
      setUsers(data);
      setLoadState("success");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  function openCreate() {
    setFormMode("create");
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setSuccessMessage("");
  }

  function openEdit(u: AdminUser) {
    setFormMode("edit");
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
    setFormError("");
    setSuccessMessage("");
  }

  function closeForm() {
    setFormMode("closed");
    setEditingUser(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
        setFormError("Name and email are required.");
        return;
    }
    setSaving(true);
    setFormError("");
    try {
        if (formMode === "create") {
        const created = await createAdminUser(form);
        setSuccessMessage(`User created. Initial password: ${created.initialPassword}`);
        await load();
        // Keep the panel open so the Administrator can read/relay the initial password.
        } else if (editingUser) {
        await updateAdminUser(editingUser.id, form);
        setSuccessMessage("User updated.");
        await load();
        setFormMode("closed");
        }
    } catch (err) {
        setFormError(err instanceof Error ? err.message : "Unable to save user");
    } finally {
        setSaving(false);
    }
}

  async function handleDeactivate() {
    if (!editingUser) return;
    setSaving(true);
    setFormError("");
    try {
      await updateAdminUser(editingUser.id, { isActive: false });
      await load();
      setFormMode("closed");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to deactivate user");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!editingUser) return;
    setSaving(true);
    setFormError("");
    try {
      const result = await resetAdminUserPassword(editingUser.id);
      setSuccessMessage(`New initial password: ${result.newPassword}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setSaving(false);
    }
  }

  const isSelf = editingUser?.id === currentUser?.id;
  const isLastActiveAdmin =
    editingUser?.role === "ADMINISTRATOR" &&
    editingUser.isActive &&
    users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length <= 1;
  const deactivateDisabled = isSelf || isLastActiveAdmin;

  return (
    <div className="container py-5">
      <h1 className="h3 mb-3">Users</h1>

      <div className="row">
        <div className="col-12 col-md-7">
          <div className="d-flex gap-2 mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
            <button className="btn btn-zen-primary text-nowrap" onClick={openCreate}>
              + Create User
            </button>
          </div>

          {loadState === "loading" && <p className="text-muted">Loading users…</p>}
          {loadState === "error" && <div className="alert alert-danger">Unable to load users.</div>}

          {loadState === "success" && (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge bg-secondary">{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-zen-low" : "bg-secondary"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-zen-secondary btn-sm" onClick={() => openEdit(u)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {formMode !== "closed" && (
          <div className="col-12 col-md-5">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">{formMode === "create" ? "Create New User" : "Edit User"}</h2>
                  <button className="btn-close" onClick={closeForm} aria-label="Close" />
                </div>

                {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
                {successMessage && <div className="alert alert-success py-2 small">{successMessage}</div>}

                <div className="mb-3">
                    <label htmlFor="user-name" className="form-label fw-semibold">Full Name *</label>
                    <input
                        id="user-name"
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    </div>

                    <div className="mb-3">
                    <label htmlFor="user-email" className="form-label fw-semibold">Email Address *</label>
                    <input
                        id="user-email"
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    </div>

                    <div className="mb-3">
                    <label htmlFor="user-role" className="form-label fw-semibold">Role *</label>
                    <select
                        id="user-role"
                        className="form-select"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                    >
                    <option value="REQUESTER">Requester</option>
                    <option value="IT_STAFF">IT Staff</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>

                <div className="mb-3 form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="isActive">
                    Active
                  </label>
                </div>

                <button className="btn btn-zen-primary w-100 mb-2" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save User"}
                </button>

                {formMode === "edit" && (
                  <>
                    <button
                      className="btn btn-zen-secondary w-100 mb-2"
                      onClick={handleResetPassword}
                      disabled={saving}
                    >
                      Set New Initial Password
                    </button>
                    <button
                      className="btn btn-zen-destructive w-100 mb-2"
                      onClick={handleDeactivate}
                      disabled={saving || deactivateDisabled}
                      title={
                        isSelf
                          ? "You cannot deactivate your own account"
                          : isLastActiveAdmin
                          ? "At least one active Administrator must remain"
                          : undefined
                      }
                    >
                      Deactivate User
                    </button>
                  </>
                )}

                <button className="btn btn-outline-secondary w-100" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}