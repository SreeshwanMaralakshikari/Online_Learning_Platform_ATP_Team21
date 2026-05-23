
import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../axiosInstance";
import { Link } from "react-router-dom";

const LAST_SEEN_KEY = "instructor-doubts-last-seen";

function formatDateTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InstructorDoubts() {
  const [doubts, setDoubts] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replying, setReplying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSeen] = useState(() => Number(window.localStorage.getItem(LAST_SEEN_KEY) || 0));

  useEffect(() => {
    const loadDoubts = async () => {
      try {
        const res = await axiosInstance.get("/instructor-api/doubts");
        // axios throws on non-2xx automatically
        setDoubts(res.data.payload || []);
        window.localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load doubts");
      } finally {
        setLoading(false);
      }
    };

    loadDoubts();
  }, []);

  const newDoubtCount = useMemo(() => {
    return doubts.filter((doubt) => new Date(doubt.createdAt).getTime() > lastSeen).length;
  }, [doubts, lastSeen]);

  const pendingCount = doubts.filter((doubt) => doubt.status !== "Answered").length;

  const handleReply = async (doubtId) => {
    const reply = replyDrafts[doubtId] || "";
    if (!reply.trim()) {
      setError("Reply cannot be empty");
      return;
    }

    setReplying(doubtId);
    setError("");

    try {
      const res = await axiosInstance.patch(`/instructor-api/doubts/${doubtId}/reply`, { reply });
      // axios throws on non-2xx automatically
      setDoubts((items) => items.map((item) => (item._id === doubtId ? res.data.payload : item)));
      setReplyDrafts((items) => ({ ...items, [doubtId]: "" }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to reply");
    } finally {
      setReplying(null);
    }
  };

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">Instructor</p>
            <h1 className="app-title">Student Doubts</h1>
            <p className="app-subtitle">Reply to doubts from students enrolled in your courses.</p>
          </div>
          <Link to="/instructor/dashboard" className="app-button-secondary">
            My Courses
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Doubts" value={doubts.length} />
          <StatCard label="Pending Replies" value={pendingCount} tone="amber" />
          <StatCard label="New Msg" value={newDoubtCount} tone={newDoubtCount ? "blue" : "slate"} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error mb-6">{error}</div>}

        {!loading && !error && doubts.length === 0 && (
          <div className="app-panel border-dashed px-6 py-16 text-center text-sm text-slate-500">
            No student doubts yet.
          </div>
        )}

        {!loading && !error && doubts.length > 0 && (
          <div className="space-y-4">
            {doubts.map((doubt) => (
              <DoubtCard
                key={doubt._id}
                doubt={doubt}
                replyValue={replyDrafts[doubt._id] || ""}
                replying={replying === doubt._id}
                onReplyChange={(value) => setReplyDrafts((items) => ({ ...items, [doubt._id]: value }))}
                onReply={() => handleReply(doubt._id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const color = {
    slate: "text-slate-950",
    amber: "text-amber-700",
    blue: "text-blue-700",
  }[tone];

  return (
    <div className="app-stat-card">
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function DoubtCard({ doubt, replyValue, replying, onReplyChange, onReply }) {
  const studentName = [doubt.student?.firstName, doubt.student?.lastName].filter(Boolean).join(" ") || doubt.student?.email || "Student";
  const instructorName = [doubt.repliedBy?.firstName, doubt.repliedBy?.lastName].filter(Boolean).join(" ") || doubt.repliedBy?.email || "Instructor";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-slate-950">{doubt.topic}</h2>
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
        {studentName} | {doubt.course?.title || "Course"} | {formatDateTime(doubt.createdAt)}
      </p>

      {(doubt.chapterTitle || doubt.unitTitle) && (
        <p className="mt-1 text-xs font-semibold text-blue-700">
          {[doubt.chapterTitle, doubt.unitTitle].filter(Boolean).join(" | ")}
        </p>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-700">{doubt.description}</p>

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
          value={replyValue}
          onChange={(event) => onReplyChange(event.target.value)}
          placeholder={doubt.instructorReply ? "Update your reply" : "Write a reply for this student"}
          className="app-textarea resize-none"
        />
        <button
          type="button"
          onClick={onReply}
          disabled={replying}
          className="app-button-primary shrink-0 sm:self-start"
        >
          {replying ? "Sending..." : doubt.instructorReply ? "Update" : "Reply"}
        </button>
      </div>
    </article>
  );
}
