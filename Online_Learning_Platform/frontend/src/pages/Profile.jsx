import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
};

const ROLE_COPY = {
  STUDENT: {
    eyebrow: "Learner profile",
    title: "Student Profile",
    description: "Manage your learning identity, contact details, and personal bio.",
    primaryLink: "/student/dashboard",
    primaryLabel: "My Learning",
  },
  INSTRUCTOR: {
    eyebrow: "Teaching profile",
    title: "Instructor Profile",
    description: "Keep your instructor profile polished for students who view your courses.",
    primaryLink: "/instructor/dashboard",
    primaryLabel: "My Courses",
  },
  ADMIN: {
    eyebrow: "Account profile",
    title: "Admin Profile",
    description: "Manage your account details.",
    primaryLink: "/admin/dashboard",
    primaryLabel: "Dashboard",
  },
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  profileImageUrl: "",
  headline: "",
  bio: "",
  location: "",
  phone: "",
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function getInitials(user) {
  const first = user?.firstName?.[0] || "";
  const last = user?.lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "LH";
}

function formatDate(date) {
  if (!date) return "Not available";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [form, setForm] = useState(emptyForm);
  const [stats, setStats] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleInfo = ROLE_COPY[profile?.role] || ROLE_COPY.ADMIN;
  const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "LearnHub User";

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/auth/profile", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load profile");

        setProfile(data.payload);
        updateUser(data.payload);
        setFormFromUser(data.payload);
      } catch (err) {
        setError(err.message || "Failed to load profile");
        if (user) setFormFromUser(user);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!profile?.role) return;

      try {
        if (profile.role === "STUDENT") {
          const res = await fetch("/student-api/course", { credentials: "include" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          const enrollments = data.payload || [];
          const completed = enrollments.filter((item) => item.status === "Completed" && item.course);
          setStats([
            { label: "Enrolled", value: enrollments.length },
            { label: "Completed", value: completed.length },
            { label: "Active", value: enrollments.filter((item) => item.status !== "Completed" && item.status !== "Dropped").length },
          ]);
        }

        if (profile.role === "INSTRUCTOR") {
          const res = await fetch("/instructor-api/courses", { credentials: "include" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          const courses = data.payload || [];
          setStats([
            { label: "Courses", value: courses.length },
            { label: "Active", value: courses.filter((course) => course.isCourseActive).length },
            { label: "Reviews", value: courses.reduce((sum, course) => sum + (course.reviews?.length || 0), 0) },
          ]);
        }

        if (profile.role === "ADMIN") {
          const [usersRes, coursesRes] = await Promise.all([
            fetch("/admin-api/users", { credentials: "include" }),
            fetch("/admin-api/courses", { credentials: "include" }),
          ]);
          const usersData = await usersRes.json();
          const coursesData = await coursesRes.json();
          if (!usersRes.ok) throw new Error(usersData.message);
          if (!coursesRes.ok) throw new Error(coursesData.message);
          const users = usersData.payload || [];
          const courses = coursesData.payload || [];
          setStats([
            { label: "Users", value: users.length },
            { label: "Courses", value: courses.length },
            { label: "Active", value: courses.filter((course) => course.isCourseActive).length },
          ]);
        }
      } catch {
        setStats([]);
      }
    };

    loadStats();
  }, [profile?.role]);

  const profileDetails = useMemo(
    () => [
      { label: "Email", value: profile?.email || "Not added" },
      { label: "Phone", value: profile?.phone || "Not added" },
      { label: "Location", value: profile?.location || "Not added" },
      { label: "Joined", value: formatDate(profile?.createdAt) },
    ],
    [profile]
  );

  function setFormFromUser(userData) {
    setForm({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      profileImageUrl: userData?.profileImageUrl || "",
      headline: userData?.headline || "",
      bio: userData?.bio || "",
      location: userData?.location || "",
      phone: userData?.phone || "",
    });
  }

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError("");
    setSuccess("");
  }

  function handlePasswordChange(event) {
    setPasswordForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setPasswordError("");
    setPasswordSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to update profile");

      setProfile(data.payload);
      updateUser(data.payload);
      setFormFromUser(data.payload);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch("/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change password");

      setPasswordForm(emptyPasswordForm);
      setPasswordSuccess(data.message || "Password changed successfully.");
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="app-loader" />
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="app-container">
        <div className="app-section-header app-panel p-6">
          <div>
            <p className="app-eyebrow">{roleInfo.eyebrow}</p>
            <h1 className="app-title">{roleInfo.title}</h1>
            <p className="app-subtitle">{roleInfo.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={roleInfo.primaryLink} className="app-button-secondary">
              {roleInfo.primaryLabel}
            </Link>
            {profile?.role === "STUDENT" && (
              <Link to="/student/completed-courses" className="app-button-secondary">
                Completed Courses
              </Link>
            )}
            <button type="button" onClick={() => setEditing((value) => !value)} className="app-button-primary">
              {editing ? "View Profile" : "Edit Profile"}
            </button>
          </div>
        </div>

        {error && <div className="app-error mb-6">{error}</div>}
        {success && <div className="app-success mb-6">{success}</div>}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="app-panel h-fit p-6">
            <div className="flex flex-col items-center text-center">
              {profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={fullName}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-700 text-3xl font-bold text-white shadow-md">
                  {getInitials(profile)}
                </div>
              )}

              <span className="mt-5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {ROLE_LABEL[profile?.role] || "User"}
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">{fullName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {profile?.headline ||
                  (profile?.role === "ADMIN"
                    ? "Managing LearnHub"
                    : profile?.role === "INSTRUCTOR"
                      ? "Instructor at LearnHub"
                      : "Learning with LearnHub")}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {(stats.length ? stats : [{ label: "Role", value: ROLE_LABEL[profile?.role] || "User" }]).map((stat) => (
                <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </aside>

          {editing ? (
            <form onSubmit={handleSubmit} className="app-panel space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="app-input h-auto py-3" required />
                </Field>
                <Field label="Last Name">
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="app-input h-auto py-3" />
                </Field>
              </div>

              <Field label="Email">
                <input name="email" type="email" value={form.email} onChange={handleChange} className="app-input h-auto py-3" required />
              </Field>

              <Field label="Profile Image URL">
                <input
                  name="profileImageUrl"
                  type="url"
                  value={form.profileImageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                  className="app-input h-auto py-3"
                />
              </Field>

              <Field label="Headline">
                <input
                  name="headline"
                  value={form.headline}
                  onChange={handleChange}
                  placeholder={
                    profile?.role === "ADMIN"
                      ? "Platform administrator"
                      : profile?.role === "INSTRUCTOR"
                        ? "Java instructor and full-stack developer"
                        : "Aspiring software developer"
                  }
                  className="app-input h-auto py-3"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input name="phone" value={form.phone} onChange={handleChange} className="app-input h-auto py-3" />
                </Field>
                <Field label="Location">
                  <input name="location" value={form.location} onChange={handleChange} className="app-input h-auto py-3" />
                </Field>
              </div>

              <Field label="About">
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write a short introduction about yourself."
                  className="app-textarea resize-none"
                />
              </Field>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setFormFromUser(profile);
                    setEditing(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="app-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="app-button-primary flex-1">
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          ) : (
            <section className="space-y-6">
              <div className="app-panel p-6">
                <h3 className="text-lg font-bold text-slate-950">About</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {profile?.bio ||
                    (profile?.role === "ADMIN"
                      ? "Add a short admin bio for your account profile."
                      : profile?.role === "INSTRUCTOR"
                        ? "Add a short instructor bio so students can understand your teaching style and experience."
                        : "Add a short bio about your learning goals and interests.")}
                </p>
              </div>

              <div className="app-panel p-6">
                <h3 className="text-lg font-bold text-slate-950">Details</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {profileDetails.map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </section>
          )}
        </div>

        <form onSubmit={handlePasswordSubmit} className="app-panel mt-6 p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="app-eyebrow">Security</p>
              <h3 className="text-lg font-bold text-slate-950">Change Password</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Update your password using your current password.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(event) => setShowPasswords(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show passwords
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Current Password">
              <input
                type={showPasswords ? "text" : "password"}
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className="app-input h-auto py-3"
                required
              />
            </Field>

            <Field label="New Password">
              <input
                type={showPasswords ? "text" : "password"}
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className="app-input h-auto py-3"
                required
              />
            </Field>

            <Field label="Confirm Password">
              <input
                type={showPasswords ? "text" : "password"}
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="app-input h-auto py-3"
                required
              />
            </Field>
          </div>

          {passwordError && <div className="app-error mt-5">{passwordError}</div>}
          {passwordSuccess && <div className="app-success mt-5">{passwordSuccess}</div>}

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={passwordSaving} className="app-button-primary w-full sm:w-auto">
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

