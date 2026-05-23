import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function RateCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [isRatingGiven, setIsRatingGiven] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, enrollRes] = await Promise.all([
          fetch("/student-api/courses", { credentials: "include" }),
          fetch("/student-api/course", { credentials: "include" }),
        ]);
        const coursesData = await coursesRes.json();
        const enrollData = await enrollRes.json();

        const found = coursesData.payload?.find((item) => item._id === courseId);
        setCourse(found ?? null);

        const myEnroll = enrollData.payload?.find((item) => (item.course?._id ?? item.course) === courseId);
        if (!myEnroll || myEnroll.status !== "Completed") {
          navigate(`/student/learn/${courseId}`);
        }
      } catch {
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, navigate]);

  const handleSubmit = async () => {
    if (!isRatingGiven || rating === 0) {
      setError("Please give a rating first");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a comment");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/student-api/course", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit review");
      setDone(true);
    } catch (err) {
      setError(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent px-6">
        <section className="app-panel max-w-md text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-lg font-bold text-emerald-700">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Thanks for your review</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your feedback helps other students choose the right course.
          </p>
          <Link to="/student/dashboard" className="app-button-primary mt-6">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="app-container-sm">
        <Link to="/student/dashboard" className="mb-8 inline-flex text-sm font-semibold text-slate-600 hover:text-slate-950">
          Back to dashboard
        </Link>

        <div className="mb-8">
          <p className="app-eyebrow">Course completed</p>
          <h1 className="app-title">Rate this course</h1>
          {course && <p className="app-subtitle line-clamp-1">{course.title}</p>}
        </div>

        <div className="app-panel">
          <div className={isRatingGiven ? "mb-6 border-b border-slate-200 pb-6" : "mb-6"}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Your rating
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                    setIsRatingGiven(true);
                    setError("");
                  }}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-bold transition-all ${
                    star <= (hovered || rating)
                      ? "border-amber-300 bg-amber-50 text-amber-500"
                      : "border-slate-200 bg-white text-slate-300 hover:border-slate-300"
                  }`}
                  aria-label={`${star} star rating`}
                >
                  ★
                </button>
              ))}
              {(hovered || rating) > 0 && (
                <span className="ml-2 text-sm font-medium text-slate-600">
                  {LABELS[hovered || rating]}
                </span>
              )}
            </div>
          </div>

          {isRatingGiven ? (
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Add your comment
              </label>
              <textarea
                rows={5}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                  setError("");
                }}
                placeholder="What worked well? What could be improved?"
                className="app-textarea resize-none"
                autoFocus
              />
              <p className="mt-2 text-right text-xs text-slate-500">{comment.length} characters</p>
            </div>
          ) : (
            <p className="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Select a star rating to add your comment.
            </p>
          )}

          {error && <div className="app-error mb-4">{error}</div>}

          <button type="button" onClick={handleSubmit} disabled={submitting || !isRatingGiven} className="app-button-primary w-full">
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="app-loader" />
    </div>
  );
}

