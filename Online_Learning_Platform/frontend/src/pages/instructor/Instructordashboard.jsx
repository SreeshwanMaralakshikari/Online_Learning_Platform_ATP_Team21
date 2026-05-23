import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const STATUS_STYLE = {
  true: "bg-emerald-50 text-emerald-700 border-emerald-200",
  false: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replying, setReplying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [coursesRes, doubtsRes] = await Promise.all([
          fetch("/instructor-api/courses", { credentials: "include" }),
          fetch("/instructor-api/doubts", { credentials: "include" }),
        ]);
        const coursesData = await coursesRes.json();
        const doubtsData = await doubtsRes.json();
        if (!coursesRes.ok) throw new Error(coursesData.message);
        setCourses(coursesData.payload || []);
        if (doubtsRes.ok) setDoubts(doubtsData.payload || []);
      } catch (err) {
        setError(err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleReply = async (doubtId) => {
    const reply = replyDrafts[doubtId] || "";
    if (!reply.trim()) {
      setError("Reply cannot be empty");
      return;
    }

    setReplying(doubtId);
    setError("");

    try {
      const res = await fetch(`/instructor-api/doubts/${doubtId}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reply");
      setDoubts((items) => items.map((item) => (item._id === doubtId ? data.payload : item)));
      setReplyDrafts((items) => ({ ...items, [doubtId]: "" }));
    } catch (err) {
      setError(err.message || "Failed to reply");
    } finally {
      setReplying(null);
    }
  };

  const handleActivate = async (course) => {
    setToggling(course._id);
    try {
      const res = await fetch("/instructor-api/courses/activate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: course._id, isCourseActive: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isCourseActive: true } : c))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (course) => {
    setToggling(course._id);
    setConfirmDelete(null);
    try {
      const res = await fetch("/instructor-api/courses/deactivate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: course._id, isCourseActive: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isCourseActive: false } : c))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const activeCourses = courses.filter((c) => c.isCourseActive);
  const hiddenCourses = courses.filter((c) => !c.isCourseActive);
  const lastSeenDoubts = Number(window.localStorage.getItem("instructor-doubts-last-seen") || 0);
  const newDoubts = doubts.filter((doubt) => new Date(doubt.createdAt).getTime() > lastSeenDoubts).length;
  const pendingDoubts = doubts.filter((doubt) => doubt.status !== "Answered").length;

  return (
    <main className="app-page">
      <section className="app-container">
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
              onClick={() => setConfirmDelete(null)}
            />
            <div className="relative w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600">
                <WarningIcon />
              </div>

              <h3 className="mb-1 text-center text-lg font-bold text-slate-950">
                Delete this course?
              </h3>
              <p className="mb-1 text-center text-sm text-slate-500">
                <span className="font-semibold text-slate-700">"{confirmDelete.title}"</span>
              </p>
              <p className="mb-6 text-center text-xs leading-5 text-slate-400">
                This will hide the course from students. Your data is kept safe and you can restore it anytime.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">Instructor</p>
            <h1 className="app-title">{user?.firstName}'s Courses</h1>
            <p className="app-subtitle">
              Manage your published courses, restore hidden courses, and keep the catalog tidy.
            </p>
          </div>
          <Link to="/instructor/courses/new" className="app-button-primary">
            + New Course
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Courses", value: courses.length, color: "text-slate-950", accent: "bg-blue-500" },
            { label: "Active", value: activeCourses.length, color: "text-emerald-700", accent: "bg-emerald-500" },
            { label: "Hidden", value: hiddenCourses.length, color: "text-rose-600", accent: "bg-rose-500" },
          ].map((stat) => (
            <div key={stat.label} className="app-stat-card relative overflow-hidden">
              <span className={`absolute left-0 top-0 h-full w-1 ${stat.accent}`} />
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{stat.label}</p>
            </div>
          ))}
          <Link to="/instructor/doubts" className="app-stat-card relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold text-amber-700">{pendingDoubts}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Student Doubts</p>
              </div>
              {newDoubts > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-black text-white">
                  {newDoubts} new msg
                </span>
              )}
            </div>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error mb-6">{error}</div>}

        {!loading && courses.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-950 text-white">
              <CourseIcon />
            </div>
            <p className="mb-4 text-sm font-semibold text-slate-600">
              You haven't created any courses yet.
            </p>
            <Link to="/instructor/courses/new" className="app-button-primary">
              Create your first course
            </Link>
          </div>
        )}

        {!loading && activeCourses.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Active Courses
            </h2>
            <div className="space-y-3">
              {activeCourses.map((course) => (
                <CourseRow
                  key={course._id}
                  course={course}
                  toggling={toggling}
                  onDelete={() => setConfirmDelete(course)}
                  isActive
                />
              ))}
            </div>
          </div>
        )}

        {!loading && hiddenCourses.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Hidden Courses
            </h2>
            <div className="space-y-3">
              {hiddenCourses.map((course) => (
                <CourseRow
                  key={course._id}
                  course={course}
                  toggling={toggling}
                  onActivate={() => handleActivate(course)}
                  isActive={false}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function InstructorDoubtsPanel({ doubts, replyDrafts, replying, onReplyChange, onReply }) {
  return (
    <section className="app-panel mb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-eyebrow">Student doubts</p>
          <h2 className="text-xl font-semibold text-slate-950">Reply to enrolled learners</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          Doubts appear here only when the student is registered in one of your courses.
        </p>
      </div>

      {doubts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
          No student doubts yet.
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.slice(0, 6).map((doubt) => {
            const studentName = [doubt.student?.firstName, doubt.student?.lastName].filter(Boolean).join(" ") || doubt.student?.email || "Student";
            const instructorName = [doubt.repliedBy?.firstName, doubt.repliedBy?.lastName].filter(Boolean).join(" ") || doubt.repliedBy?.email || "Instructor";

            return (
              <article key={doubt._id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-950">{doubt.topic}</h3>
                  {doubt.audience === "instructor" && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Direct to instructor
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    doubt.status === "Answered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {doubt.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {studentName} | {doubt.course?.title || "Course"}
                </p>
                {(doubt.chapterTitle || doubt.unitTitle) && (
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    {[doubt.chapterTitle, doubt.unitTitle].filter(Boolean).join(" | ")}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-slate-700">{doubt.description}</p>

                {doubt.instructorReply && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                      Reply from {instructorName}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-950">{doubt.instructorReply}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <textarea
                    rows={2}
                    value={replyDrafts[doubt._id] || ""}
                    onChange={(event) => onReplyChange((items) => ({ ...items, [doubt._id]: event.target.value }))}
                    placeholder={doubt.instructorReply ? "Update your reply" : "Write a reply for this student"}
                    className="app-textarea resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => onReply(doubt._id)}
                    disabled={replying === doubt._id}
                    className="app-button-primary shrink-0 sm:self-start"
                  >
                    {replying === doubt._id ? "Sending..." : doubt.instructorReply ? "Update" : "Reply"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CourseRow({ course, toggling, onDelete, onActivate, isActive }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:flex-row sm:items-center ${
        isActive ? "border-slate-200" : "border-slate-200 opacity-75"
      }`}
    >
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${
          isActive ? "border-blue-100 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
      >
        <CourseIcon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold text-slate-950">{course.title}</h3>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[course.isCourseActive]}`}>
            {course.isCourseActive ? "Active" : "Deleted"}
          </span>
        </div>
        <p className="mb-1 text-xs font-semibold text-slate-500">{course.category}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400 sm:gap-3">
          <span>{course.chapters?.length ?? 0} chapters</span>
          <span>|</span>
          <span>{course.reviews?.length ?? 0} reviews</span>
          <span>|</span>
          <span className="font-bold text-slate-700">
            {course.price === 0 ? "Free" : `Rs ${course.price}`}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isActive ? (
          <>
            <Link
              to={`/instructor/courses/${course._id}/edit`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-950"
            >
              Edit
            </Link>
            <button
              onClick={onDelete}
              disabled={toggling === course._id}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-40"
            >
              {toggling === course._id ? "..." : "Delete"}
            </button>
          </>
        ) : (
          <button
            onClick={onActivate}
            disabled={toggling === course._id}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-40"
          >
            {toggling === course._id ? "..." : "Restore"}
          </button>
        )}
      </div>
    </div>
  );
}

function CourseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5L12 4l8 3.5-8 3.5-8-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 10v4.5c0 1.35 2.24 2.5 5 2.5s5-1.15 5-2.5V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 8v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 7v5M11 15h.01M9.172 3.172a4 4 0 015.656 0l4 4a4 4 0 010 5.656l-4 4a4 4 0 01-5.656 0l-4-4a4 4 0 010-5.656l4-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
