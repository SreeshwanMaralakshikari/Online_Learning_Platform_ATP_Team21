import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TONE_STYLE = {
  slate: "text-slate-950 bg-slate-50",
  blue: "text-blue-700 bg-blue-50",
  violet: "text-violet-700 bg-violet-50",
  emerald: "text-emerald-700 bg-emerald-50",
  stone: "text-slate-500 bg-slate-100",
  amber: "text-amber-700 bg-amber-50",
  cyan: "text-cyan-700 bg-cyan-50",
  orange: "text-orange-700 bg-orange-50",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, coursesRes, analyticsRes] = await Promise.all([
          fetch("/admin-api/users", { credentials: "include" }),
          fetch("/admin-api/courses", { credentials: "include" }),
          fetch("/admin-api/analytics", { credentials: "include" }),
        ]);
        const usersData = await usersRes.json();
        const coursesData = await coursesRes.json();
        const analyticsData = await analyticsRes.json();

        if (!usersRes.ok) throw new Error(usersData.message);
        if (!coursesRes.ok) throw new Error(coursesData.message);
        if (!analyticsRes.ok) throw new Error(analyticsData.message);

        const users = usersData.payload || [];
        const courses = coursesData.payload || [];
        const analytics = analyticsData.payload || {};

        setStats({
          totalUsers: users.length,
          students: users.filter((u) => u.role === "STUDENT").length,
          instructors: users.filter((u) => u.role === "INSTRUCTOR").length,
          totalCourses: courses.length,
          activeCourses: courses.filter((c) => c.isCourseActive).length,
          inactiveCourses: courses.filter((c) => !c.isCourseActive).length,
          freeCourses: courses.filter((c) => c.price === 0).length,
          paidCourses: courses.filter((c) => c.price > 0).length,
          totalReviews: courses.reduce((sum, course) => sum + (course.reviews?.length ?? 0), 0),
          totalEnrollments: analytics.totalEnrollments || 0,
          completedEnrollments: analytics.completedEnrollments || 0,
        });
        setLeaderboard(analytics.leaderboard || []);
      } catch (err) {
        setError(err.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header app-panel p-6">
          <div>
            <p className="app-eyebrow">Admin Panel</p>
            <h1 className="app-title">Welcome, {user?.firstName || "Admin"}</h1>
            <p className="app-subtitle">
              Platform overview for users, courses, reviews, and course visibility.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/profile" className="app-button-secondary">
              Admin Profile
            </Link>
            <Link to="/admin/users" className="app-button-primary">
              Manage Users
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error mb-8">{error}</div>}

        {stats && (
          <>
            <p className="app-eyebrow">Users</p>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Users" value={stats.totalUsers} tone="slate" />
              <StatCard label="Students" value={stats.students} tone="blue" />
              <StatCard label="Instructors" value={stats.instructors} tone="violet" />
            </div>

            <p className="app-eyebrow">Courses</p>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Courses" value={stats.totalCourses} tone="slate" />
              <StatCard label="Active" value={stats.activeCourses} tone="emerald" />
              <StatCard label="Inactive" value={stats.inactiveCourses} tone="stone" />
              <StatCard label="Total Reviews" value={stats.totalReviews} tone="amber" />
            </div>

            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Free Courses" value={stats.freeCourses} tone="cyan" />
              <StatCard label="Paid Courses" value={stats.paidCourses} tone="orange" />
            </div>

            <p className="app-eyebrow">Enrollment Analytics</p>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Total Enrollments" value={stats.totalEnrollments} tone="blue" />
              <StatCard label="Completed Courses" value={stats.completedEnrollments} tone="emerald" />
            </div>

            <div className="app-panel mb-10 p-6">
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="app-eyebrow">Leaderboard</p>
                  <h2 className="text-xl font-bold text-slate-950">Top Students</h2>
                </div>
                <span className="text-sm font-semibold text-slate-500">By completed courses</span>
              </div>

              {leaderboard.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  No completed courses yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((student, index) => (
                    <div
                      key={student.studentId}
                      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{student.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{student.email}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">
                        {student.completedCourses} completed
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {student.totalEnrollments} joined
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="app-eyebrow">Quick Actions</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ActionCard
                to="/admin/users"
                title="Manage Users"
                description="View students and instructors, then activate or deactivate accounts."
              />
              <ActionCard
                to="/admin/courses"
                title="Manage Courses"
                description="Review platform courses and update course visibility."
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ActionCard({ to, title, description }) {
  return (
    <Link
      to={to}
      className="app-panel group block p-6 transition hover:-translate-y-0.5 hover:border-slate-300"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
          Admin
        </span>
        <span className="text-lg font-semibold text-slate-400 transition group-hover:text-slate-950">-&gt;</span>
      </div>
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  return (
    <div className="app-stat-card">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${TONE_STYLE[tone]}`}>
        {label}
      </div>
      <p className="text-3xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
