
import { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getVideoEmbed } from "../../utils/media";

function formatPrice(price) {
  return Number(price || 0) === 0 ? "Free" : `Rs. ${Number(price).toLocaleString("en-IN")}`;
}

function getCourseImage(course) {
  const image = course.thumbnail || course.image || course.courseImage || course.coverImage || "";
  if (!image) return "";
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return `/${image}`;
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, enrollRes, wishlistRes] = await Promise.all([
          axiosInstance.get("/student-api/courses"),
          axiosInstance.get("/student-api/course"),
          axiosInstance.get("/student-api/wishlist")
        ]);

        const found = coursesRes.data.payload?.find((item) => item._id === id);
        if (!found) throw new Error("Course not found");
        setCourse(found);

        const myEnrollment = enrollRes.data.payload?.find((item) => (item.course?._id ?? item.course) === id);
        setEnrollment(myEnrollment ?? null);
        setIsWishlisted((wishlistRes.data.payload || []).some((item) => (item.course?._id ?? item.course) === id));
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} />;
  if (!course) return null;

  const avgRating = course.reviews?.length
    ? (course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length).toFixed(1)
    : null;
  const isEnrolled = Boolean(enrollment);
  const isCompleted = enrollment?.status === "Completed";
  const isDropped = enrollment?.status === "Dropped";

  const toggleWishlist = async () => {
    setWishlistLoading(true);
    setActionError("");

    try {
      await (isWishlisted
        ? axiosInstance.delete(`/student-api/wishlist/${id}`)
        : axiosInstance.post("/student-api/wishlist", { courseId: id }));
      // axios throws on non-2xx automatically
      setIsWishlisted((current) => !current);
    } catch (err) {
      setActionError(err.message || "Unable to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <main className="app-page">
      <section className="app-container">
        <Link to="/student/courses" className="mb-8 inline-flex text-sm font-semibold text-slate-600 hover:text-slate-950">
          Back to courses
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            {getCourseImage(course) && (
              <img
                src={getCourseImage(course)}
                alt={course.title}
                className="mb-6 h-72 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
              />
            )}
            <span className="app-badge">{course.category}</span>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              {course.content}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="app-card px-3 py-2">{course.chapters?.length ?? 0} chapters</span>
              <span className="app-card px-3 py-2">{avgRating ? `${avgRating} rating` : "No ratings yet"}</span>
              <span className="app-card px-3 py-2">{course.reviews?.length ?? 0} reviews</span>
            </div>
          </div>

          <aside className="app-panel h-fit">
            {course.demoVideo && (
              <div className="mb-6">
                <p className="mb-3 text-sm font-bold text-slate-950">Watch demo class</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                  <VideoEmbed url={course.demoVideo} />
                </div>
                {!isEnrolled && (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Preview the teaching style before enrolling.
                  </p>
                )}
              </div>
            )}
            <p className="text-3xl font-bold text-blue-700">{formatPrice(course.price)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {Number(course.price || 0) === 0 ? "No payment needed" : "One-time payment"}
            </p>

            <div className="mt-6 space-y-3">
              {actionError && <div className="app-error">{actionError}</div>}
              {isCompleted ? (
                <>
                  <Link to={`/student/learn/${id}`} className="app-button-secondary w-full">
                    Watch again
                  </Link>
                  <Link to={`/student/review/${id}`} className="app-button-primary w-full">
                    Rate course
                  </Link>
                </>
              ) : isEnrolled && !isDropped ? (
                <>
                  <Link to={`/student/learn/${id}`} className="app-button-primary w-full">
                    Continue learning
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700"
                        style={{ width: `${enrollment?.progress ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500">{enrollment?.progress ?? 0}%</span>
                  </div>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => navigate(`/student/payment/${id}`)} className="app-button-primary w-full">
                    {isDropped ? "Re-enroll" : Number(course.price || 0) === 0 ? "Enroll free" : "Pay and enroll"}
                  </button>
                  {!isDropped && (
                    <button
                      type="button"
                      onClick={toggleWishlist}
                      disabled={wishlistLoading}
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                        isWishlisted
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                      }`}
                    >
                      {wishlistLoading ? "Saving..." : isWishlisted ? "Saved for later" : "Save for later"}
                    </button>
                  )}
                </>
              )}
            </div>

            <ul className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
              {[
                "Full lifetime access",
                course.demoVideo ? "Demo class available before enrollment" : null,
                `${course.chapters?.length ?? 0} chapters`,
                `${course.chapters?.reduce((sum, chapter) => sum + (chapter.units?.length ?? 0), 0) ?? 0} units`,
                "Progress tracking",
                "Review after completion",
              ].filter(Boolean).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="font-bold text-emerald-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-950">Course content</h2>
          {course.chapters?.length ? (
            <div className="space-y-3">
              {course.chapters.map((chapter, index) => (
                <div key={chapter._id ?? index} className="app-panel flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-bold text-slate-950">{chapter.title || `Chapter ${index + 1}`}</h3>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {chapter.units?.length ?? 0} unit{chapter.units?.length === 1 ? "" : "s"} | {(chapter.quiz?.length ?? 0) > 0 ? "1 assignment" : "0 assignments"}
                    </p>
                    {(chapter.units ?? []).some((unit) => unit.videoContent || unit.documentContent) && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">Unit media included</p>
                    )}
                  </div>
                  {!isEnrolled && <span className="text-xs font-semibold text-slate-400">Locked</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="app-card border-dashed px-6 py-12 text-center text-sm text-slate-500">
              No chapters added yet.
            </div>
          )}
        </section>

        {course.reviews?.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">Student reviews</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {course.reviews.map((review, index) => (
                <div key={review._id ?? index} className="app-panel">
                  <p className="mb-2 text-sm font-semibold text-amber-500">
                    {"★".repeat(review.rating)}
                  </p>
                  <p className="text-sm leading-6 text-slate-700">{review.comment}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {review.student?.firstName ? `${review.student.firstName} ${review.student.lastName ?? ""}` : "Student"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function VideoEmbed({ url }) {
  const video = getVideoEmbed(url);

  if (!video) return null;

  if (video.type === "iframe") {
    return (
      <iframe
        key={video.src}
        src={video.src}
        title="Demo class preview"
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; compute-pressure; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return <video key={video.src} src={video.src} controls className="aspect-video w-full object-contain" />;
}

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="app-loader" />
    </div>
  );
}

function ErrorView({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6">
      <div className="app-panel max-w-sm text-center">
        <p className="text-lg font-semibold text-slate-950">Unable to load course</p>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Link to="/student/courses" className="app-button-primary mt-5">
          Back to courses
        </Link>
      </div>
    </div>
  );
}

