import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../axiosInstance";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["All", "Web Dev", "Data Science", "Design", "Mobile", "Cloud", "DevOps", "OOPS"];

const CATEGORY_STYLES = {
  "Web Dev": {
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    color: "bg-violet-600",
    soft: "bg-violet-50 text-violet-700 border-violet-100",
  },
  "Data Science": {
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
    color: "bg-sky-600",
    soft: "bg-sky-50 text-sky-700 border-sky-100",
  },
  Design: {
    image:
      "https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=900&q=80",
    color: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700 border-rose-100",
  },
  Mobile: {
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80",
    color: "bg-emerald-600",
    soft: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  Cloud: {
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80",
    color: "bg-cyan-600",
    soft: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  DevOps: {
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    color: "bg-amber-500",
    soft: "bg-amber-50 text-amber-800 border-amber-100",
  },
  OOPS: {
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
    color: "bg-fuchsia-600",
    soft: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
  },
  Course: {
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    color: "bg-indigo-600",
    soft: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
};

const FEATURED_TOPICS = [
  { label: "Web Development", detail: "Build apps", image: CATEGORY_STYLES["Web Dev"].image },
  { label: "Data Science", detail: "Analyze data", image: CATEGORY_STYLES["Data Science"].image },
  { label: "Creative Design", detail: "Make visuals", image: CATEGORY_STYLES.Design.image },
];

function formatPrice(price) {
  if (!price) return "Free";
  return `Rs ${Number(price).toLocaleString("en-IN")}`;
}

function getCourseImage(course) {
  const image = course.thumbnail || course.image || course.courseImage || course.coverImage || "";
  if (!image) return "";
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return `/${image}`;
}

function getCategoryStyle(category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.Course;
}

function CourseCard({ course, onEnroll, isLoggedIn, isEnrolled }) {
  const style = getCategoryStyle(course.category);
  const courseImage = getCourseImage(course) || style.image;

  return (
    <article className="group flex min-h-80 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl">
      <div className="relative h-40 overflow-hidden">
        <img
          src={courseImage}
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 rounded bg-white px-2.5 py-1 text-xs font-bold text-slate-950 shadow-sm">
          {formatPrice(course.price)}
        </span>
        {isEnrolled && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Enrolled
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <span
          className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${style.soft}`}
        >
          {course.category || "Course"}
        </span>

        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-6 text-slate-950 group-hover:text-violet-700">
            {course.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {course.content || "Start learning with this course and build practical skills."}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1 text-amber-500" aria-label="Course rating">
            <span className="text-sm font-bold">4.7</span>
            <span className="text-xs">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          </div>
          <button
            type="button"
            onClick={() => onEnroll(course)}
            className="rounded bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-700"
          >
            {!isLoggedIn ? "Login" : isEnrolled ? "Continue" : "Enroll"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coursesRes = await axiosInstance.get("/auth/courses");
        setCourses(coursesRes.data.payload || []);
        setError("");

        // If user is a logged-in student, fetch their enrollments to know which
        // courses they are already in so the Enroll button routes them correctly.
        if (user?.role === "STUDENT") {
          try {
            const enrollRes = await axiosInstance.get("/student-api/course");
            setEnrolledIds(
              new Set(
                (enrollRes.data.payload || [])
                  .filter((item) => item.status !== "Dropped" && item.course)
                  .map((item) => item.course?._id ?? item.course)
              )
            );
          } catch {
            // Non-fatal: enrollment fetch failure just means we fall back to payment flow
          }
        }
      } catch {
        setError("Could not load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesCategory = activeTab === "All" || course.category === activeTab;
      const matchesSearch =
        !query ||
        course.title?.toLowerCase().includes(query) ||
        course.content?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeTab, courses, search]);

  function handleEnroll(course) {
    if (!user) {
      navigate("/login");
      return;
    }

    // If the student is already enrolled, go straight to the course player
    if (user.role === "STUDENT" && enrolledIds.has(course._id)) {
      navigate(`/student/learn/${course._id}`);
      return;
    }

    navigate(`/student/payment/${course._id}`, { state: { course } });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.92)_47%,rgba(59,130,246,0.72)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex rounded-full bg-slate-100/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
              LearnHub courses
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Learn skills that move your career forward.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-200 md:text-lg">
              Discover practical courses in coding, design, cloud, data, and more with a clean professional experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="app-button-primary">
                Get started
              </Link>
              <Link to="/login" className="app-button-secondary">
                Login
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-3xl font-black text-white">{courses.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Courses</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-3xl font-black text-white">{CATEGORIES.length - 1}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Categories</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-3xl font-black text-white">4.7</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Avg rating</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 lg:min-h-[430px]">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85"
              alt="Students learning together"
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 rounded-lg bg-white/90 p-4 text-slate-950 shadow-lg sm:left-8 sm:top-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Popular now</p>
              <p className="mt-1 text-lg font-black">Java Programming</p>
              <p className="mt-1 text-sm text-slate-600">OOPS | Free course</p>
            </div>
            <div className="absolute bottom-4 right-4 rounded-lg bg-slate-950/90 p-4 text-white shadow-lg sm:bottom-8 sm:right-8">
              <p className="text-2xl font-black">50K+</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">learning hours</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
          {FEATURED_TOPICS.map((topic) => (
            <div key={topic.label} className="group relative h-36 overflow-hidden rounded-lg shadow-lg">
              <img
                src={topic.image}
                alt={topic.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-slate-950/60" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-lg font-bold">{topic.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-200">{topic.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Explore courses</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">A broad selection of courses</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Search by title or choose a category to find your next course.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses..."
            className="app-input lg:w-96"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2 pb-2">
          {CATEGORIES.map((category) => {
            const active = activeTab === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveTab(category)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-950"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="app-skeleton h-40" />
                <div className="app-skeleton mt-4 h-4 w-24" />
                <div className="app-skeleton mt-4 h-5 w-4/5" />
                <div className="app-skeleton mt-3 h-4 w-full" />
                <div className="app-skeleton mt-6 h-10 w-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="mt-8 text-sm font-semibold text-slate-600">
              {filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"} available
            </p>

            {filteredCourses.length > 0 ? (
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    isLoggedIn={Boolean(user)}
                    isEnrolled={enrolledIds.has(course._id)}
                    onEnroll={handleEnroll}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <p className="text-lg font-black text-slate-950">No courses found</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveTab("All");
                  }}
                  className="mt-3 text-sm font-black text-violet-700 hover:text-violet-900"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

