import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function formatPrice(price) {
  return Number(price || 0) === 0 ? "Free" : `Rs. ${Number(price).toLocaleString("en-IN")}`;
}

function getCourseImage(course) {
  const image = course.thumbnail || course.image || course.courseImage || course.coverImage || "";
  if (!image) return "";
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return `/${image}`;
}

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await fetch("/student-api/wishlist", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load wishlist");
        setItems((data.payload || []).filter((item) => item.course));
      } catch (err) {
        setError(err.message || "Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = async (courseId) => {
    setRemovingId(courseId);
    setError("");

    try {
      const res = await fetch(`/student-api/wishlist/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove course");
      setItems((current) => current.filter((item) => (item.course?._id ?? item.course) !== courseId));
    } catch (err) {
      setError(err.message || "Failed to remove course");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header">
          <div>
            <p className="app-eyebrow">Wishlist</p>
            <h1 className="app-title">Saved for later</h1>
            <p className="app-subtitle">
              Keep courses here while you decide what to buy or enroll in next.
            </p>
          </div>
          <Link to="/student/courses" className="app-button-primary">
            Browse courses
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="app-loader" />
          </div>
        )}

        {error && <div className="app-error mb-6">{error}</div>}

        {!loading && items.length === 0 && (
          <div className="app-card border-dashed px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-950">No saved courses yet</p>
            <p className="mt-2 text-sm text-slate-500">Save a course to come back to it later.</p>
            <Link to="/student/courses" className="app-button-primary mt-5">
              Find courses
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item._id} className="app-card flex flex-col overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(`/student/courses/${item.course._id}`)}
                  className="text-left"
                >
                  <div className="flex h-40 items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-100">
                    {getCourseImage(item.course) ? (
                      <img src={getCourseImage(item.course)} alt={item.course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-blue-50">
                        <span className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">LH</span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="app-badge">{item.course.category || "Course"}</span>
                    <span className="text-sm font-semibold text-blue-700">{formatPrice(item.course.price)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/student/courses/${item.course._id}`)}
                    className="mt-3 text-left"
                  >
                    <h2 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950 hover:text-blue-700">
                      {item.course.title}
                    </h2>
                  </button>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.course.content || "Start learning with this course."}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    <Link to={`/student/payment/${item.course._id}`} className="app-button-primary flex-1">
                      {Number(item.course.price || 0) === 0 ? "Enroll free" : "Buy now"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.course._id)}
                      disabled={removingId === item.course._id}
                      className="app-button-secondary flex-1 disabled:opacity-60"
                    >
                      {removingId === item.course._id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
