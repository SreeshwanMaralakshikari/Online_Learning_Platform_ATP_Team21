import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: "", newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setSuccess(data.message || "Password reset successfully.");
      setForm({ email: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <section className="app-container-sm">
        <div className="app-panel p-6">
          <p className="app-eyebrow">Account Recovery</p>
          <h1 className="app-title">Forgot Password</h1>
          <p className="app-subtitle">
            Enter your account email and choose a new password.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Field label="Email address">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="app-input"
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label="New password">
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                className="app-input"
                placeholder="Enter a new password"
                required
              />
            </Field>

            <Field label="Confirm password">
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="app-input"
                placeholder="Confirm your new password"
                required
              />
            </Field>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show password
            </label>

            {error && <div className="app-error">{error}</div>}
            {success && <div className="app-success">{success}</div>}

            <button type="submit" disabled={loading} className="app-button-primary w-full">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            Remembered it?{" "}
            <Link to="/login" className="font-bold text-blue-700 hover:text-blue-800">
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
