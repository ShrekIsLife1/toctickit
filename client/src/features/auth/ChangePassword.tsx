import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "Be at least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Include upper and lower case letters", test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "Include a number", test: (pw) => /[0-9]/.test(pw) },
  { label: "Include a special character", test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

type SubmitState = "idle" | "submitting" | "error";

export default function ChangePassword() {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const allRulesPass = RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = allRulesPass && passwordsMatch && currentPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to change password");
        setSubmitState("error");
        return;
      }

      await refreshUser();

      if (user?.role === "IT_STAFF") navigate("/staff/queue");
      else if (user?.role === "ADMINISTRATOR") navigate("/admin/users");
      else navigate("/my-tickets");
    } catch {
      setErrorMessage("Unable to change password");
      setSubmitState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm border-0 p-4">
        <h1 className="h5 mb-1">Change Your Password</h1>
        <p className="text-muted small mb-4">You must change your password to continue.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="currentPassword" className="form-label fw-semibold">
              Current (temporary) password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label fw-semibold">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label fw-semibold">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`form-control ${confirmPassword && !passwordsMatch ? "is-invalid" : ""}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && !passwordsMatch && (
              <div className="invalid-feedback">Passwords do not match</div>
            )}
          </div>

          <div className="mb-3 p-2 rounded" style={{ background: "var(--color-pale-green)" }}>
            <p className="fw-semibold small mb-1">Password must:</p>
            <ul className="list-unstyled small mb-0">
              {RULES.map((rule) => (
                <li key={rule.label} style={{ color: rule.test(newPassword) ? "var(--color-success)" : "var(--color-text-muted)" }}>
                  {rule.test(newPassword) ? "✓" : "○"} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          {submitState === "error" && (
            <div className="alert alert-danger py-2" role="alert">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-zen-primary w-100"
            disabled={!canSubmit || submitState === "submitting"}
          >
            {submitState === "submitting" ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}