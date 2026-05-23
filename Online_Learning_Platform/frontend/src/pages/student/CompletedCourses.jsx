import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function formatDate(date) {
  if (!date) return "Not available";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hasCertificateAccess(enrollment) {
  const coursePrice = Number(enrollment?.course?.price || 0);
  const payment = enrollment?.payment;
  const paymentAmount = typeof payment === "object" ? Number(payment?.amount || 0) : 0;
  const paymentStatus = typeof payment === "object" ? payment?.status : null;

  return coursePrice > 0 || (paymentAmount > 0 && paymentStatus === "SUCCESS");
}

export default function CompletedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCompletedCourses = async () => {
      try {
        const res = await fetch("/student-api/course", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load completed courses");

        setCourses((data.payload || []).filter((item) => item.status === "Completed" && item.course));
      } catch (err) {
        setError(err.message || "Failed to load completed courses");
      } finally {
        setLoading(false);
      }
    };

    loadCompletedCourses();
  }, []);

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">Student profile</p>
            <h1 className="app-title">Completed Courses</h1>
            <p className="app-subtitle">Review finished courses and open eligible certificates.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/profile" className="app-button-secondary">
              Profile
            </Link>
            <Link to="/student/dashboard" className="app-button-primary">
              My Learning
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error mb-6">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <div className="app-panel border-dashed px-6 py-16 text-center text-sm text-slate-500">
            Completed courses will appear here after you finish a course.
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="grid gap-4">
            {courses.map((enrollment) => {
              const course = enrollment.course;
              const courseId = course?._id ?? course;
              const certificateReady = hasCertificateAccess(enrollment);

              return (
                <article
                  key={enrollment._id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        Completed
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDate(enrollment.updatedAt)}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate text-lg font-bold text-slate-950">
                      {course?.title || "Course"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {course?.category || "Learning"} | {certificateReady ? "Certificate ready" : "Certificate payment required"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link to={`/student/learn/${courseId}`} className="app-button-secondary px-4 py-2 text-sm">
                      Review Course
                    </Link>
                    <Link
                      to={certificateReady ? `/student/certificate/${courseId}` : `/student/payment/${courseId}`}
                      state={!certificateReady ? { certificate: true } : undefined}
                      className="app-button-primary px-4 py-2 text-sm"
                    >
                      {certificateReady ? "View Certificate" : "Get Certificate"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
