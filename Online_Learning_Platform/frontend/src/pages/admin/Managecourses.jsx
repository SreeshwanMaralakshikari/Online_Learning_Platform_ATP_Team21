import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    let result = courses;
    if (statusFilter === "ACTIVE") result = result.filter((c) => c.isCourseActive);
    if (statusFilter === "INACTIVE") result = result.filter((c) => !c.isCourseActive);
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, courses]);

  const fetchCourses = async () => {
    try {
      const [res, analyticsRes] = await Promise.all([
        fetch("/admin-api/courses", { credentials: "include" }),
        fetch("/admin-api/analytics", { credentials: "include" }),
      ]);
      const data = await res.json();
      const analyticsData = await analyticsRes.json();
      if (!res.ok) throw new Error(data.message);
      if (!analyticsRes.ok) throw new Error(analyticsData.message);

      const analyticsByCourse = {};
      for (const item of analyticsData.payload?.courseEnrollmentCounts || []) {
        analyticsByCourse[item.courseId] = item;
      }

      setCourseAnalytics(analyticsByCourse);
      setCourses(data.payload || []);
      setFiltered(data.payload || []);
    } catch (err) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (course) => {
    setToggling(course._id);
    const newState = !course.isCourseActive;
    const endpoint = newState ? "activate" : "deactivate";
    try {
      const res = await fetch(`/admin-api/courses/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: course._id, isCourseActive: newState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isCourseActive: newState } : c))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const active = courses.filter((c) => c.isCourseActive).length;
  const inactive = courses.filter((c) => !c.isCourseActive).length;
  const totalEnrollments = Object.values(courseAnalytics).reduce(
    (sum, item) => sum + (item.enrollmentCount || 0),
    0
  );

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header app-panel p-6">
          <div>
            <Link to="/admin/dashboard" className="mb-3 inline-block text-sm font-semibold text-slate-500 hover:text-slate-950">
              Back to dashboard
            </Link>
            <p className="app-eyebrow">Admin</p>
            <h1 className="app-title">Manage Courses</h1>
            <p className="app-subtitle">
              {courses.length} total, {active} active, {inactive} inactive.
            </p>
          </div>
          <Link to="/profile" className="app-button-secondary">
            Admin Profile
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Total" value={courses.length} />
          <StatCard label="Active" value={active} tone="emerald" />
          <StatCard label="Inactive" value={inactive} tone="slate" />
          <StatCard label="Enrollments" value={totalEnrollments} tone="blue" />
        </div>

        <div className="app-panel mb-6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="app-input flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {["ALL", "ACTIVE", "INACTIVE"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    statusFilter === status
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  {status}
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
            <p className="text-sm font-semibold text-slate-500">No courses found.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="app-panel overflow-hidden p-0">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid">
              <span>Course</span>
              <span>Category</span>
              <span>Price</span>
              <span>Joined</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {filtered.map((course) => {
              const avgRating = course.reviews?.length
                ? (course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length).toFixed(1)
                : null;
              const analytics = courseAnalytics[course._id] || {};

              return (
                <div
                  key={course._id}
                  className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{course.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span>{course.chapters?.length ?? 0} chapters</span>
                      {avgRating && <span className="text-amber-700">Rating {avgRating} ({course.reviews.length})</span>}
                    </div>
                  </div>

                  <span className="truncate text-sm text-slate-600">{course.category}</span>

                  <span className={`text-sm font-bold ${course.price === 0 ? "text-cyan-700" : "text-orange-700"}`}>
                    {course.price === 0 ? "Free" : `Rs. ${course.price}`}
                  </span>

                  <div className="text-sm font-bold text-slate-950">
                    {analytics.enrollmentCount || 0}
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {analytics.completedCount || 0} completed
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      course.isCourseActive
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}
                  >
                    {course.isCourseActive ? "Active" : "Inactive"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggle(course)}
                    disabled={toggling === course._id}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      course.isCourseActive
                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {toggling === course._id ? "Updating..." : course.isCourseActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, tone = "default" }) {
  const style =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
      : tone === "slate"
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-950";

  return (
    <div className="app-stat-card">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${style}`}>
        {label}
      </div>
      <p className="text-3xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
