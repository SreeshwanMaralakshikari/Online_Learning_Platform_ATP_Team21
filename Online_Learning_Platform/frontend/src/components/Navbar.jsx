import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/theme";

const NAV_LINKS = {
  STUDENT: [
    { label: "Browse", to: "/student/courses" },
    { label: "Wishlist", to: "/student/wishlist" },
    { label: "My Learning", to: "/student/dashboard" },
    { label: "Completed", to: "/student/completed-courses" },
    { label: "Profile", to: "/profile" },
  ],
  INSTRUCTOR: [
    { label: "My Courses", to: "/instructor/dashboard" },
    { label: "Doubts", to: "/instructor/doubts", badge: true },
    { label: "Create Course", to: "/instructor/courses/new" },
    { label: "Profile", to: "/profile" },
  ],
  ADMIN: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Users", to: "/admin/users" },
    { label: "Courses", to: "/admin/courses" },
    { label: "Profile", to: "/profile" },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [newDoubts, setNewDoubts] = useState(0);
  const links = user ? NAV_LINKS[user.role] ?? [] : [];
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.role?.toLowerCase();

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR") {
      setNewDoubts(0);
      return;
    }

    if (location.pathname.startsWith("/instructor/doubts")) {
      setNewDoubts(0);
      return;
    }

    let ignore = false;
    const loadDoubtCount = async () => {
      try {
        const res = await fetch("/instructor-api/doubts", { credentials: "include" });
        const data = await res.json();
        if (!res.ok || ignore) return;

        const lastSeen = Number(window.localStorage.getItem("instructor-doubts-last-seen") || 0);
        const count = (data.payload || []).filter((doubt) => new Date(doubt.createdAt).getTime() > lastSeen).length;
        setNewDoubts(count);
      } catch {
        if (!ignore) setNewDoubts(0);
      }
    };

    loadDoubtCount();
    const intervalId = window.setInterval(loadDoubtCount, 30000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [user?.role, location.pathname]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 12L6 4L10 9L12 6L14 12H2Z" fill="#ffffff" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-950">LearnHub</span>
        </Link>

        {user && (
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {link.label}
                  {link.badge && newDoubts > 0 && (
                    <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      New
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 14.2A7.5 7.5 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {user ? (
            <>
              <span className="hidden text-sm font-semibold capitalize text-slate-700 sm:block">
                {displayName}
              </span>
              <button type="button" onClick={logout} className="app-button-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="app-button-secondary">
                Login
              </Link>
              <Link to="/register" className="app-button-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
