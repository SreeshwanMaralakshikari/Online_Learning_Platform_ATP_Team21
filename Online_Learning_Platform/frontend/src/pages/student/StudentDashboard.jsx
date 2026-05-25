
import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../axiosInstance";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const STATUS_STYLE = {
  Enrolled: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Dropped: "bg-slate-50 text-slate-600 border-slate-200",
};

const hasCertificateAccess = (enrollment) => {
  const payment = enrollment?.payment;
  const paymentAmount = typeof payment === "object" ? Number(payment?.amount || 0) : 0;
  const paymentStatus = typeof payment === "object" ? payment?.status : null;

  return paymentAmount > 0 && paymentStatus === "SUCCESS";
};

const getEnrollmentProgress = (enrollment) => {
  if (enrollment?.status === "Completed") return 100;

  const progress = Number(enrollment?.progress || 0);
  if (!Number.isFinite(progress)) return 0;

  return Math.min(100, Math.max(0, Math.round(progress)));
};

const MOODS = [
  {
    id: "motivated",
    label: "Motivated",
    signal: "High focus",
    format: "Full lessons + quizzes",
    message: "You are ready for deeper learning, course progress, and quiz-based practice.",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "tired",
    label: "Tired",
    signal: "Low energy",
    format: "Short videos",
    message: "Keep the session light with quick videos and small next steps.",
    accent: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    id: "stressed",
    label: "Stressed",
    signal: "Needs calm",
    format: "Easy revision",
    message: "Reduce pressure with familiar topics and low-friction revision.",
    accent: "border-amber-200 bg-amber-50 text-amber-700",
  },
];

const FLOW_STEPS = ["Select mood", "System analyzes", "Suggest content"];

const getCourseId = (course) => course?._id ?? course;

const getLessonCount = (enrollment) => enrollment?.course?.chapters?.length ?? 0;

const getCompletedLessons = (enrollment) => {
  const lessons = getLessonCount(enrollment);
  if (lessons === 0) return 0;
  return Math.min(lessons, Math.ceil((getEnrollmentProgress(enrollment) / 100) * lessons));
};

const getMoodRecommendations = (enrollments, mood) => {
  const activeEnrollments = enrollments.filter((item) => item.status !== "Dropped" && item.status !== "Completed");
  const source = activeEnrollments.length ? activeEnrollments : enrollments.filter((item) => item.status !== "Dropped");

  if (mood === "tired") {
    return source
      .map((enrollment) => {
        const chapters = enrollment.course?.chapters ?? [];
        const completed = getCompletedLessons(enrollment);
        const upcomingChapters = chapters.slice(completed);
        const chapterWithVideo = upcomingChapters.find((chapter) => (chapter.units ?? []).some((unit) => unit.videoContent));
        const videoUnit = chapterWithVideo?.units?.find((unit) => unit.videoContent);
        const nextChapter = chapterWithVideo || chapters[completed] || chapters[0];
        return {
          enrollment,
          title: videoUnit?.title || nextChapter?.title || enrollment.course?.title,
          reason: "Short unit video or next quick lesson",
          action: "Watch now",
          estimate: "Quick session",
        };
      })
      .filter((item) => item.title)
      .slice(0, 3);
  }

  if (mood === "stressed") {
    return source
      .map((enrollment) => {
        const chapters = enrollment.course?.chapters ?? [];
        const completed = getCompletedLessons(enrollment);
        const revisionChapter = chapters[Math.max(0, completed - 1)] || chapters[0];
        return {
          enrollment,
          title: revisionChapter?.title || enrollment.course?.title,
          reason: "Easy revision from a familiar topic",
          action: "Revise",
          estimate: "Gentle pace",
        };
      })
      .filter((item) => item.title)
      .slice(0, 3);
  }

  return source
    .sort((a, b) => getEnrollmentProgress(b) - getEnrollmentProgress(a))
    .slice(0, 3)
    .map((enrollment) => ({
      enrollment,
      title: enrollment.course?.title,
      reason: getEnrollmentProgress(enrollment) >= 80 ? "Finish the course and take the review quiz" : "Continue the full lesson path",
      action: getEnrollmentProgress(enrollment) >= 80 ? "Finish course" : "Continue",
      estimate: "Focused session",
    }))
    .filter((item) => item.title);
};

const getHeatmapTopics = (enrollments) => (
  enrollments
    .filter((enrollment) => enrollment.course && enrollment.status !== "Dropped")
    .map((enrollment) => {
      const progress = getEnrollmentProgress(enrollment);
      const timeSpent = Number(enrollment.timeSpentMinutes || 0);
      const lessons = getLessonCount(enrollment);
      const completedLessons = getCompletedLessons(enrollment);
      const color = progress >= 70 ? "bg-emerald-500" : progress >= 35 ? "bg-amber-400" : "bg-rose-500";
      const label = progress >= 70 ? "Strong topic" : progress >= 35 ? "Needs practice" : "Weak topic";

      return {
        id: enrollment._id,
        courseId: getCourseId(enrollment.course),
        title: enrollment.course.title,
        category: enrollment.course.category || "Learning",
        progress,
        timeSpent,
        lessons,
        completedLessons,
        color,
        label,
      };
    })
);

const formatStudySessionTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

export default function StudentDashboard() {
  const { user, studySessionSeconds } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [mood, setMood] = useState("motivated");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const courseRes = await axiosInstance.get("/student-api/course");
        setEnrollments((courseRes.data.payload || []).filter((enrollment) => enrollment.course));
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  const active = enrollments.filter((item) => item.status !== "Dropped" && item.status !== "Completed");
  const completed = enrollments.filter((item) => item.status === "Completed");
  const recommendations = useMemo(() => getMoodRecommendations(enrollments, mood), [enrollments, mood]);
  const heatmapTopics = useMemo(() => getHeatmapTopics(enrollments), [enrollments]);

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">My learning</p>
            <h1 className="app-title">
              Welcome back, {user?.firstName || "Student"}
            </h1>
            <p className="app-subtitle">
              Track your enrolled, completed, and paused courses from one place.
            </p>
          </div>
          <Link to="/student/courses" className="app-button-primary">
            Browse courses
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Active", value: active.length, suffix: "courses", color: "text-blue-600" },
            { label: "Completed", value: completed.length, suffix: "courses", color: "text-emerald-600" },
            { label: "Study time", value: formatStudySessionTime(studySessionSeconds), suffix: "this login", color: "text-slate-700" },
          ].map((stat) => (
            <div key={stat.label} className="app-stat-card">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label} {stat.suffix}</p>
            </div>
          ))}
        </div>

        {!loading && !error && enrollments.length > 0 && (
          <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <MoodRecommendationPanel
              mood={mood}
              onMoodChange={setMood}
              recommendations={recommendations}
            />
            <LearningHeatmap topics={heatmapTopics} />
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Your courses</h2>
          <p className="text-sm text-slate-500">{enrollments.length} total</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error">{error}</div>}

        {!loading && !error && enrollments.length === 0 && (
          <div className="app-card border-dashed px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-950">No courses yet</p>
            <p className="mt-2 text-sm text-slate-500">Enroll in a course to start learning.</p>
            <Link to="/student/courses" className="app-button-primary mt-5">
              Find a course
            </Link>
          </div>
        )}

        {!loading && !error && enrollments.length > 0 && (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EnrollmentCard({ enrollment }) {
  const { course, status } = enrollment;
  const progress = getEnrollmentProgress(enrollment);
  const title = course?.title ?? "Course";
  const category = course?.category ?? "Learning";
  const courseId = course?._id ?? course;
  const certificateLink = hasCertificateAccess(enrollment)
    ? `/student/certificate/${courseId}`
    : `/student/payment/${courseId}`;

  return (
    <article className="app-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
        LH
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-slate-950">{title}</h3>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.Enrolled}`}>
            {status}
          </span>
        </div>
        <p className="mb-3 text-sm text-slate-500">{category}</p>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium text-slate-500">{progress}%</span>
        </div>
      </div>

      {status === "Completed" ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to={certificateLink}
            state={!hasCertificateAccess(enrollment) ? { certificate: true } : undefined}
            className="app-button-primary"
          >
            Certificate
          </Link>
          <Link to={`/student/review/${courseId}`} className="app-button-secondary">
            Rate
          </Link>
        </div>
      ) : status === "Dropped" ? (
        <span className="text-sm font-medium text-slate-400">Dropped</span>
      ) : (
        <Link to={`/student/learn/${courseId}`} className="app-button-primary shrink-0">
          Continue
        </Link>
      )}
    </article>
  );
}

function MoodRecommendationPanel({ mood, onMoodChange, recommendations }) {
  const selectedMood = MOODS.find((item) => item.id === mood) ?? MOODS[0];

  return (
    <section className="app-panel overflow-hidden">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-eyebrow">Mood-based learning recommendation</p>
          <h2 className="text-xl font-semibold text-slate-950">Choose how you feel before studying</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The dashboard adapts the next learning step to your current focus, energy, and stress level.
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${selectedMood.accent}`}>
          {selectedMood.format}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MOODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onMoodChange(item.id)}
            className={`rounded-lg border p-4 text-left transition ${
              mood === item.id
                ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-bold">{item.label}</span>
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
              mood === item.id ? "border-white/25 bg-white/10 text-white" : item.accent
            }`}>
              {item.signal}
            </span>
            <span className={`mt-3 block text-xs leading-5 ${mood === item.id ? "text-slate-200" : "text-slate-500"}`}>
              {item.format}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {FLOW_STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm">
                {index + 1}
              </span>
              <span className="min-w-0 text-xs font-semibold text-slate-600">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-slate-600">{selectedMood.message}</p>
      </div>

      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">Enroll in a course to receive recommendations.</p>
        ) : (
          recommendations.map((item) => (
            <Link
              key={`${getCourseId(item.enrollment.course)}-${item.title}`}
              to={`/student/learn/${getCourseId(item.enrollment.course)}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {item.action}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                <span>{item.enrollment.course?.category || "Learning"}</span>
                <span>{item.estimate}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function LearningHeatmap({ topics }) {
  return (
    <section className="app-panel">
      <div className="mb-5">
        <p className="app-eyebrow">Learning heatmap</p>
        <h2 className="text-xl font-semibold text-slate-950">Topic strength</h2>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-slate-500">Start a lesson to build your heatmap.</p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/student/learn/${topic.courseId}`}
              className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
            >
              <span className={`h-10 w-10 rounded-lg ${topic.color}`} title={topic.label} />
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold text-slate-950">{topic.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">{topic.progress}%</span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {topic.label} | {topic.completedLessons}/{topic.lessons} topics | {topic.timeSpent}m studied
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" /> Strong</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400" /> Practice</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-rose-500" /> Weak</span>
      </div>
    </section>
  );
}
