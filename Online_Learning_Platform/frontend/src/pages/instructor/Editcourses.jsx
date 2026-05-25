
import { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getVideoEmbed } from "../../utils/media";

const CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "UI/UX Design",
  "DevOps",
  "Cybersecurity",
  "OOPs",
  "Java",
  "Python",
  "JavaScript",
  "Other",
];

const emptyUnit = (index = 0) => ({
  title: `Unit ${index + 1}`,
  textContent: "",
  videoContent: "",
  documentContent: "",
});

const emptyQuizQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  answerIndex: 0,
});

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category: "",
    price: 0,
    content: "",
    thumbnail: "",
    demoVideo: "",
  });
  const [chapters, setChapters] = useState([]);
  const [isCourseActive, setIsCourseActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingChapters, setSavingChapters] = useState(false);
  const [uploading, setUploading] = useState("");
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedChapters, setExpandedChapters] = useState([]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axiosInstance.get("/instructor-api/courses");
        const found = res.data.payload.find((course) => course._id === id);
        if (!found) throw new Error("Course not found");
        setForm({
          title: found.title,
          category: found.category,
          price: Number(found.price || 0),
          content: found.content,
          thumbnail: found.thumbnail || "",
          demoVideo: found.demoVideo || "",
        });
        setIsCourseActive(found.isCourseActive);
        // Load chapters from the course — clone so we don't mutate the fetched object
        const loadedChapters = (found.chapters || []).map((ch) => ({
          ...ch,
          units: (ch.units || []).map((u) => ({ ...u })),
          quiz: (ch.quiz || []).map((q) => ({ ...q, options: [...(q.options || ["", "", "", ""])] })),
        }));
        setChapters(loadedChapters);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
    setError("");
    setSuccess("");
  };

  // ─── Chapter helpers ────────────────────────────────────────────────────────

  const toggleChapter = (index) => {
    setExpandedChapters((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { title: "", unitCount: 1, units: [emptyUnit()], quiz: [] },
    ]);
    setExpandedChapters((prev) => [...prev, chapters.length]);
  };

  const removeChapter = (chapterIndex) => {
    setChapters((prev) => prev.filter((_, i) => i !== chapterIndex));
    setExpandedChapters((prev) =>
      prev.filter((i) => i !== chapterIndex).map((i) => (i > chapterIndex ? i - 1 : i))
    );
  };

  const handleChapterChange = (chapterIndex, field, value) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === chapterIndex ? { ...ch, [field]: value } : ch))
    );
  };

  // ─── Unit helpers ────────────────────────────────────────────────────────────

  const addUnit = (chapterIndex) => {
    setChapters((prev) =>
      prev.map((ch, i) => {
        if (i !== chapterIndex) return ch;
        const units = [...(ch.units ?? []), emptyUnit(ch.units?.length ?? 0)];
        return { ...ch, unitCount: units.length, units };
      })
    );
  };

  const removeUnit = (chapterIndex, unitIndex) => {
    setChapters((prev) =>
      prev.map((ch, i) => {
        if (i !== chapterIndex) return ch;
        const units = (ch.units ?? []).filter((_, ui) => ui !== unitIndex);
        return { ...ch, unitCount: units.length, units };
      })
    );
  };

  const handleUnitChange = (chapterIndex, unitIndex, field, value) => {
    setChapters((prev) =>
      prev.map((ch, i) => {
        if (i !== chapterIndex) return ch;
        const units = [...(ch.units ?? [])];
        units[unitIndex] = { ...(units[unitIndex] ?? emptyUnit(unitIndex)), [field]: value };
        return { ...ch, units };
      })
    );
  };

  // ─── Quiz helpers ────────────────────────────────────────────────────────────

  const addQuizQuestion = (chapterIndex) => {
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === chapterIndex
          ? { ...ch, quiz: [...(ch.quiz ?? []), emptyQuizQuestion()] }
          : ch
      )
    );
  };

  const removeQuizQuestion = (chapterIndex, qIndex) => {
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === chapterIndex
          ? { ...ch, quiz: (ch.quiz ?? []).filter((_, qi) => qi !== qIndex) }
          : ch
      )
    );
  };

  const handleQuizChange = (chapterIndex, qIndex, field, value) => {
    setChapters((prev) =>
      prev.map((ch, i) => {
        if (i !== chapterIndex) return ch;
        const quiz = [...(ch.quiz ?? [])];
        quiz[qIndex] = { ...(quiz[qIndex] ?? emptyQuizQuestion()), [field]: value };
        return { ...ch, quiz };
      })
    );
  };

  const handleQuizOptionChange = (chapterIndex, qIndex, optionIndex, value) => {
    setChapters((prev) =>
      prev.map((ch, i) => {
        if (i !== chapterIndex) return ch;
        const quiz = [...(ch.quiz ?? [])];
        const question = { ...(quiz[qIndex] ?? emptyQuizQuestion()) };
        const options = [...(question.options ?? ["", "", "", ""])];
        options[optionIndex] = value;
        quiz[qIndex] = { ...question, options };
        return { ...ch, quiz };
      })
    );
  };

  // ─── Upload ──────────────────────────────────────────────────────────────────

  const uploadMedia = async (file, onUploaded, label) => {
    if (!file) return;
    setUploading(label);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await axiosInstance.post("/instructor-api/media", payload);
      onUploaded(res.data.payload.url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to upload media");
    } finally {
      setUploading("");
    }
  };

  // ─── Save course info ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) return setError("Title is required");
    if (!form.content.trim()) return setError("Description is required");

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.put("/instructor-api/course", {
        courseId: id,
        title: form.title,
        category: form.category,
        price: form.price,
        content: form.content,
        thumbnail: form.thumbnail,
        demoVideo: form.demoVideo,
      });
      setSuccess("Course details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  // ─── Save chapters ───────────────────────────────────────────────────────────

  const handleSaveChapters = async () => {
    // Validate chapters
    if (chapters.some((ch) => !ch.title.trim())) {
      return setError("All chapters must have a title");
    }
    if (chapters.some((ch) => (ch.units ?? []).some((u) => !u.title.trim()))) {
      return setError("All units must have a title");
    }
    // A unit is valid if it has textContent (≥10 chars), OR a video, OR a document.
    if (chapters.some((ch) =>
      (ch.units ?? []).some((u) => {
        const hasText = u.textContent.trim().length >= 10;
        const hasVideo = u.videoContent.trim().length > 0;
        const hasDoc = u.documentContent.trim().length > 0;
        return !hasText && !hasVideo && !hasDoc;
      })
    )) {
      return setError("Each unit must have at least one of: text content (≥10 characters), a video, or a document");
    }

    setSavingChapters(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.patch("/instructor-api/course/chapters", {
        courseId: id,
        chapters,
      });
      setSuccess("Chapters saved successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save chapters");
    } finally {
      setSavingChapters(false);
    }
  };

  // ─── Toggle active status ────────────────────────────────────────────────────

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    const newState = !isCourseActive;

    try {
      // FIX: Use the correct unified toggle-status endpoint
      await axiosInstance.patch("/instructor-api/courses/toggle-status", {
        courseId: id,
        isCourseActive: newState,
      });
      setIsCourseActive(newState);
      setSuccess(`Course ${newState ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <main className="app-page">
      <section className="app-container-sm max-w-3xl">
        <Link
          to="/instructor/dashboard"
          className="mb-8 inline-block text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950"
        >
          Back to dashboard
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-eyebrow">Edit Course</p>
            <h1 className="app-title">Update Details</h1>
            <p className="app-subtitle">Keep your course information clear and current.</p>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`h-11 rounded-lg border px-4 text-sm font-bold shadow-sm transition-all disabled:opacity-50 ${
              isCourseActive
                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {toggling ? "Updating..." : isCourseActive ? "Deactivate Course" : "Activate Course"}
          </button>
        </div>

        <div
          className={`mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
            isCourseActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isCourseActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {isCourseActive ? "Currently active - visible to students" : "Currently inactive - hidden from students"}
        </div>

        {error && <div className="app-error mb-4">{error}</div>}
        {success && <div className="app-success mb-4">{success}</div>}

        {/* ── Course Info ─────────────────────────────────────────────── */}
        <div className="app-panel space-y-6 p-6 mb-8">
          <h2 className="text-base font-bold text-slate-950">Course Information</h2>

          <Field label="Course Title">
            <input type="text" name="title" value={form.title} onChange={handleChange} className={inputCls} />
          </Field>

          <Field label="Category">
            <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price (Rs) - set 0 for Free">
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              min={0}
              placeholder="0"
              className={inputCls}
            />
          </Field>

          <Field label="Course Image">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {form.thumbnail ? (
                  <img src={form.thumbnail} alt="Course preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                    Preview
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="url"
                  name="thumbnail"
                  value={form.thumbnail}
                  onChange={handleChange}
                  placeholder="Image URL"
                  className={inputCls}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadMedia(
                      event.target.files?.[0],
                      (url) => setForm((prev) => ({ ...prev, thumbnail: url })),
                      "course-image"
                    )
                  }
                  className={fileCls}
                />
                {uploading === "course-image" && (
                  <p className="text-[11px] font-semibold text-blue-700">Uploading image...</p>
                )}
              </div>
            </div>
          </Field>

          <Field label="Course Description">
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={5}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <Field label="Demo Video">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
              {form.demoVideo ? (
                <VideoEmbed url={form.demoVideo} />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm font-semibold text-slate-400">
                  Demo video preview
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <input
                type="url"
                name="demoVideo"
                value={form.demoVideo}
                onChange={handleChange}
                placeholder="Demo video URL"
                className={inputCls}
              />
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  uploadMedia(event.target.files?.[0], (url) =>
                    setForm((prev) => ({ ...prev, demoVideo: url })), "demo-video"
                  )
                }
                className={fileCls}
              />
              {uploading === "demo-video" && (
                <p className="text-[11px] font-semibold text-blue-700">Uploading demo video...</p>
              )}
            </div>
          </Field>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link to="/instructor/dashboard" className="app-button-secondary flex-1">
              Cancel
            </Link>
            <button type="button" onClick={handleSave} disabled={saving} className="app-button-primary flex-1">
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                "Save Course Info"
              )}
            </button>
          </div>
        </div>

        {/* ── Chapter Editor ──────────────────────────────────────────── */}
        <div className="app-panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Chapters & Units</h2>
              <p className="mt-1 text-xs text-slate-500">
                Edit or add chapters, units, and quiz questions below.
              </p>
            </div>
            <button type="button" onClick={addChapter} className="app-button-secondary text-sm px-4 py-2">
              + Add Chapter
            </button>
          </div>

          {chapters.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No chapters yet. Click "Add Chapter" to start.
            </div>
          )}

          <div className="space-y-4">
            {chapters.map((chapter, chapterIndex) => {
              const isExpanded = expandedChapters.includes(chapterIndex);
              return (
                <div
                  key={chapter._id ?? chapterIndex}
                  className="overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* Chapter header */}
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleChapter(chapterIndex)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
                        {chapterIndex + 1}
                      </span>
                      <span className="flex-1 text-sm font-bold text-slate-950">
                        {chapter.title || `Chapter ${chapterIndex + 1}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {isExpanded ? "▲ Collapse" : "▼ Expand"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChapter(chapterIndex)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800"
                    >
                      Remove
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-5 p-4">
                      <Field label="Chapter Title">
                        <input
                          type="text"
                          value={chapter.title}
                          onChange={(e) => handleChapterChange(chapterIndex, "title", e.target.value)}
                          placeholder="Chapter title"
                          className={inputCls}
                        />
                      </Field>

                      {/* Units */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Units ({chapter.units?.length ?? 0})
                          </p>
                          <button
                            type="button"
                            onClick={() => addUnit(chapterIndex)}
                            className="text-xs font-bold text-blue-700 hover:text-blue-900"
                          >
                            + Add Unit
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(chapter.units ?? []).map((unit, unitIndex) => (
                            <div
                              key={unit._id ?? unitIndex}
                              className="rounded-lg border border-slate-200 bg-white p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500">Unit {unitIndex + 1}</p>
                                <button
                                  type="button"
                                  onClick={() => removeUnit(chapterIndex, unitIndex)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-700"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="space-y-3">
                                <Field label="Unit Title">
                                  <input
                                    type="text"
                                    value={unit.title}
                                    onChange={(e) =>
                                      handleUnitChange(chapterIndex, unitIndex, "title", e.target.value)
                                    }
                                    className={inputCls}
                                  />
                                </Field>

                                <Field label="Unit Content">
                                  <textarea
                                    rows={4}
                                    value={unit.textContent}
                                    onChange={(e) =>
                                      handleUnitChange(chapterIndex, unitIndex, "textContent", e.target.value)
                                    }
                                    placeholder="Explain the unit topic..."
                                    className={`${inputCls} resize-none`}
                                  />
                                </Field>

                                <Field label="Video URL (optional)">
                                  <input
                                    type="url"
                                    value={unit.videoContent}
                                    onChange={(e) =>
                                      handleUnitChange(chapterIndex, unitIndex, "videoContent", e.target.value)
                                    }
                                    placeholder="YouTube / Vimeo / direct URL"
                                    className={inputCls}
                                  />
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) =>
                                      uploadMedia(
                                        e.target.files?.[0],
                                        (url) => handleUnitChange(chapterIndex, unitIndex, "videoContent", url),
                                        `unit-${chapterIndex}-${unitIndex}-video`
                                      )
                                    }
                                    className={`${fileCls} mt-2`}
                                  />
                                  {uploading === `unit-${chapterIndex}-${unitIndex}-video` && (
                                    <p className="text-[11px] font-semibold text-blue-700">Uploading video...</p>
                                  )}
                                </Field>

                                <Field label="Document URL (optional)">
                                  <input
                                    type="url"
                                    value={unit.documentContent}
                                    onChange={(e) =>
                                      handleUnitChange(chapterIndex, unitIndex, "documentContent", e.target.value)
                                    }
                                    placeholder="Publicly accessible document URL"
                                    className={inputCls}
                                  />
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    onChange={(e) =>
                                      uploadMedia(
                                        e.target.files?.[0],
                                        (url) => handleUnitChange(chapterIndex, unitIndex, "documentContent", url),
                                        `unit-${chapterIndex}-${unitIndex}-doc`
                                      )
                                    }
                                    className={`${fileCls} mt-2`}
                                  />
                                  {uploading === `unit-${chapterIndex}-${unitIndex}-doc` && (
                                    <p className="text-[11px] font-semibold text-blue-700">Uploading document...</p>
                                  )}
                                </Field>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quiz */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Quiz Questions ({chapter.quiz?.length ?? 0})
                          </p>
                          <button
                            type="button"
                            onClick={() => addQuizQuestion(chapterIndex)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            + Add Question
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(chapter.quiz ?? []).map((question, qIndex) => (
                            <div
                              key={question._id ?? qIndex}
                              className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-bold text-emerald-700">
                                  Question {qIndex + 1}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeQuizQuestion(chapterIndex, qIndex)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-700"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="space-y-3">
                                <Field label="Question">
                                  <input
                                    type="text"
                                    value={question.question}
                                    onChange={(e) =>
                                      handleQuizChange(chapterIndex, qIndex, "question", e.target.value)
                                    }
                                    placeholder="Enter question..."
                                    className={inputCls}
                                  />
                                </Field>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  {(question.options ?? ["", "", "", ""]).map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct-${chapterIndex}-${qIndex}`}
                                        checked={Number(question.answerIndex) === optionIndex}
                                        onChange={() =>
                                          handleQuizChange(chapterIndex, qIndex, "answerIndex", optionIndex)
                                        }
                                        className="accent-emerald-600"
                                      />
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) =>
                                          handleQuizOptionChange(chapterIndex, qIndex, optionIndex, e.target.value)
                                        }
                                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                        className={`${inputCls} flex-1`}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Select the radio button next to the correct answer.
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {chapters.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={addChapter}
                className="app-button-secondary flex-1"
              >
                + Add Another Chapter
              </button>
              <button
                type="button"
                onClick={handleSaveChapters}
                disabled={savingChapters}
                className="app-button-primary flex-1"
              >
                {savingChapters ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  "Save Chapters"
                )}
              </button>
            </div>
          )}
        </div>
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

function VideoEmbed({ url }) {
  const video = getVideoEmbed(url);

  if (!video) return null;

  if (video.type === "iframe") {
    return (
      <iframe
        key={video.src}
        src={video.src}
        title="Demo video preview"
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

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const fileCls =
  "w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:border-blue-200";
