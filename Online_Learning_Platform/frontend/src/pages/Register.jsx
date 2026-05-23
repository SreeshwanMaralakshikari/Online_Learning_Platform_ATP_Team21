import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "STUDENT",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Registration failed");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch {
      setError("Unable to reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-[-90px] top-[-90px] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-90px] h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="relative">
            <Brand light />
            <div className="mt-20">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
                Start your journey
              </p>
              <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight">
                Pick a role and build your learning space.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-200/75">
                Join as a student to explore courses, or teach what you know with simple course tools.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">200+</p>
              <p className="mt-1 text-xs text-slate-200/70">Courses</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">24/7</p>
              <p className="mt-1 text-xs text-slate-200/70">Access</p>
            </div>
          </div>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <Brand />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Sign up
            </span>
          </div>

          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Create account
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Let&apos;s get you started
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-blue-700 hover:text-blue-800">
                Sign in
              </Link>
            </p>
          </div>

        {success && (
          <div className="app-success mt-6 max-w-xl">
            Account created. Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              I want to
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "STUDENT", label: "Learn", sub: "Enroll in courses", icon: "ST" },
                { value: "INSTRUCTOR", label: "Teach", sub: "Create courses", icon: "IN" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: option.value })}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    form.role === option.value
                      ? "border-blue-500 bg-blue-50 shadow-[0_14px_30px_-24px_rgba(37,99,235,0.55)]"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${
                    form.role === option.value ? "bg-blue-700 text-white" : "bg-slate-950 text-white"
                  }`}>
                    {option.icon}
                  </span>
                  <span className={`block text-sm font-bold ${form.role === option.value ? "text-blue-700" : "text-slate-950"}`}>
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{option.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Arjun" required />
            <Field label="Last name" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Sharma" />
          </div>

          <Field label="Email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="h-auto w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <div className="app-error">{error}</div>}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.7)] transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}

function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 shadow-lg shadow-blue-950/20">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 12L6 4L10 9L12 6L14 12H2Z" fill="#ffffff" />
        </svg>
      </div>
      <span className={`font-semibold ${light ? "text-white" : "text-slate-950"}`}>
        LearnHub
      </span>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        className="h-auto w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)]"
        {...props}
      />
    </div>
  );
}
