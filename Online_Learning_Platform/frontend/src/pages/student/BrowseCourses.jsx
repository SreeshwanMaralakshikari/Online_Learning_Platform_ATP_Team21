import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatPrice(price) {
  return Number(price || 0) === 0 ? "Free" : `Rs. ${Number(price).toLocaleString("en-IN")}`;
}

function getCourseImage(course) {
  const image = course.thumbnail || course.image || course.courseImage || course.coverImage || "";
  if (!image) return "";
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return `/${image}`;
}

export default function BrowseCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => new Set());
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const [res, wishlistRes] = await Promise.all([
          fetch("/student-api/courses", { credentials: "include" }),
          fetch("/student-api/wishlist", { credentials: "include" }),
        ]);
        const data = await res.json();
        const wishlistData = await wishlistRes.json();
        if (!res.ok) throw new Error(data.message || "Failed to load courses");
        setCourses(data.payload || []);
        setFiltered(data.payload || []);
        if (wishlistRes.ok) {
          setWishlistIds(new Set((wishlistData.payload || []).map((item) => item.course?._id ?? item.course)));
        }
      } catch (err) {
        setError(err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const categories = ["All", ...new Set(courses.map((course) => course.category).filter(Boolean))];

  useEffect(() => {
    const query = search.trim().toLowerCase();
    let result = courses;

    if (category !== "All") {
      result = result.filter((course) => course.category === category);
    }

    if (query) {
      result = result.filter(
        (course) =>
          course.title?.toLowerCase().includes(query) ||
          course.category?.toLowerCase().includes(query) ||
          course.content?.toLowerCase().includes(query)
      );
    }

    setFiltered(result);
  }, [search, category, courses]);

  const toggleWishlist = async (courseId) => {
    const isSaved = wishlistIds.has(courseId);
    setSavingId(courseId);
    setActionError("");

    try {
      const res = await fetch(isSaved ? `/student-api/wishlist/${courseId}` : "/student-api/wishlist", {
        method: isSaved ? "DELETE" : "POST",
        headers: isSaved ? undefined : { "Content-Type": "application/json" },
        credentials: "include",
        body: isSaved ? undefined : JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update wishlist");

      setWishlistIds((current) => {
        const next = new Set(current);
        if (isSaved) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
    } catch (err) {
      setActionError(err.message || "Unable to update wishlist");
    } finally {
      setSavingId("");
    }
  };

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">Explore</p>
            <h1 className="app-title">All courses</h1>
            <p className="app-subtitle">{courses.length} course{courses.length === 1 ? "" : "s"} available</p>
          </div>

          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="app-input lg:max-w-sm"
          />
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                category === cat
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="app-card overflow-hidden p-4">
                <div className="app-skeleton h-32" />
                <div className="app-skeleton mt-4 h-4 w-24" />
                <div className="app-skeleton mt-4 h-5 w-4/5" />
                <div className="app-skeleton mt-3 h-4 w-full" />
                <div className="app-skeleton mt-6 h-9 w-full" />
              </div>
            ))}
          </div>
        )}

        {error && <div className="app-error">{error}</div>}
        {actionError && <div className="app-error mb-4">{actionError}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="app-card border-dashed px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-sm font-black text-blue-700">
              LH
            </div>
            <p className="text-lg font-semibold text-slate-950">No courses found</p>
            <p className="mt-2 text-sm text-slate-500">Try another search or category.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="app-button-secondary mt-5 px-4 py-2 text-sm"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                isSaved={wishlistIds.has(course._id)}
                isSaving={savingId === course._id}
                onClick={() => navigate(`/student/courses/${course._id}`)}
                onToggleWishlist={() => toggleWishlist(course._id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CourseCard({ course, isSaved, isSaving, onClick, onToggleWishlist }) {
  const avgRating = course.reviews?.length
    ? (course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length).toFixed(1)
    : null;

  return (
    <article className="app-card group flex min-h-64 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <button type="button" onClick={onClick} className="relative text-left">
        <div className="flex h-32 items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-100">
          {getCourseImage(course) ? (
            <img src={getCourseImage(course)} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-blue-50">
              <span className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">LH</span>
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="app-badge">{course.category || "Course"}</span>
          <span className="text-sm font-semibold text-blue-700">{formatPrice(course.price)}</span>
        </div>
        {course.demoVideo && (
          <span className="mt-3 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            Demo class
          </span>
        )}

        <button type="button" onClick={onClick} className="mt-3 text-left">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950 group-hover:text-blue-700">
            {course.title}
          </h3>
        </button>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {course.content || "Start learning with this course."}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
          <span>{course.chapters?.length ?? 0} chapter{course.chapters?.length === 1 ? "" : "s"}</span>
          <span>{avgRating ? `${avgRating} rating` : "No ratings yet"}</span>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="mt-3 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          View course
        </button>

        <button
          type="button"
          onClick={onToggleWishlist}
          disabled={isSaving}
          className={`mt-3 rounded-lg border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
            isSaved
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
          }`}
        >
          {isSaving ? "Saving..." : isSaved ? "Saved" : "Save for later"}
        </button>
      </div>
    </article>
  );
}
