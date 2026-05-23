import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ROLE_STYLE = {
  STUDENT: "bg-blue-50 text-blue-700 border-blue-100",
  INSTRUCTOR: "bg-violet-50 text-violet-700 border-violet-100",
  ADMIN: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== "ALL") result = result.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(query) ||
          u.lastName?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      );
    }
    setFiltered(result);
  }, [search, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/admin-api/users", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers(data.payload || []);
      setFiltered(data.payload || []);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (user) => {
    setToggling(user._id);
    const newState = !user.isUserActive;
    const endpoint = newState ? "activate" : "deactivate";
    try {
      const res = await fetch(`/admin-api/users/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user._id, isUserActive: newState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isUserActive: newState } : u))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const students = users.filter((u) => u.role === "STUDENT").length;
  const instructors = users.filter((u) => u.role === "INSTRUCTOR").length;
  const inactive = users.filter((u) => !u.isUserActive).length;

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header app-panel p-6">
          <div>
            <Link to="/admin/dashboard" className="mb-3 inline-block text-sm font-semibold text-slate-500 hover:text-slate-950">
              Back to dashboard
            </Link>
            <p className="app-eyebrow">Admin</p>
            <h1 className="app-title">Manage Users</h1>
            <p className="app-subtitle">
              {users.length} total, {students} students, {instructors} instructors, {inactive} inactive.
            </p>
          </div>
          <Link to="/profile" className="app-button-secondary">
            Admin Profile
          </Link>
        </div>

        <div className="app-panel mb-6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="app-input flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {["ALL", "STUDENT", "INSTRUCTOR"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    roleFilter === role
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="app-error mb-6">{error}</div>}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="app-loader" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="app-panel py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">No users found.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="app-panel overflow-hidden p-0">
            <div className="hidden grid-cols-[1fr_2fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {filtered.map((user) => (
              <div
                key={user._id}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_2fr_1fr_1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                    {user.firstName?.[0]?.toUpperCase()}
                    {user.lastName?.[0]?.toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-bold text-slate-950">
                    {user.firstName} {user.lastName}
                  </span>
                </div>

                <span className="truncate text-sm text-slate-600">{user.email}</span>

                <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${ROLE_STYLE[user.role]}`}>
                  {user.role}
                </span>

                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    user.isUserActive
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  {user.isUserActive ? "Active" : "Inactive"}
                </span>

                {user.role !== "ADMIN" ? (
                  <button
                    type="button"
                    onClick={() => handleToggle(user)}
                    disabled={toggling === user._id}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      user.isUserActive
                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {toggling === user._id ? "Updating..." : user.isUserActive ? "Deactivate" : "Activate"}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Protected</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
