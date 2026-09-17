import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type SubmitState = "idle" | "submitting" | "error";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState("submitting");
    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        navigate("/change-password");
      } else if (user.role === "REQUESTER") {
        navigate("/my-tickets");
      } else if (user.role === "IT_STAFF") {
        navigate("/staff/queue");
      } else {
        navigate("/admin/users");
      }
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm border-0 p-4">
        <h1 className="h4 text-center mb-4">Sign in to your account</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-semibold">
              Password
            </label>
            <div className="input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {submitState === "error" && (
            <div className="alert alert-danger py-2" role="alert">
              Invalid email or password.
            </div>
          )}

          <button
            type="submit"
            className="btn btn-zen-primary w-100"
            disabled={submitState === "submitting"}
          >
            {submitState === "submitting" ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-center mt-3 mb-0">
            <span className="text-muted small">Forgot your password?</span>
          </p>
        </form>
      </div>
    </div>
  );
}