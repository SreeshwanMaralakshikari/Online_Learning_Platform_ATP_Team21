import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const emptyChapter = () => ({
  title: "",
  unitCount: 1,
  units: [emptyUnit()],
  quiz: [],
});

export default function CreateCourse() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category: "Web Development",
    price: 0,
    content: "",
    thumbnail: "",
    demoVideo: "",
  });
  const [chapters, setChapters] = useState([emptyChapter()]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
    setError("");
  };

  const handleChapterChange = (index, field, value) => {
    setChapters((prev) =>
      prev.map((chapter, chapterIndex) =>
        chapterIndex === index ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  const addUnit = (chapterIndex) => {
    setChapters((prev) =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;

        const currentUnits = chapter.units ?? [];
        const nextUnits = [...currentUnits, emptyUnit(currentUnits.length)];

        return { ...chapter, unitCount: nextUnits.length, units: nextUnits };
      })
    );
  };

  const removeUnit = (chapterIndex, unitIndex) => {
    setChapters((prev) =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;

        const nextUnits = (chapter.units ?? []).filter((_, indexOfUnit) => indexOfUnit !== unitIndex);

        return { ...chapter, unitCount: nextUnits.length, units: nextUnits };
      })
    );
  };

  const handleUnitChange = (chapterIndex, unitIndex, field, value) => {
    setChapters((prev) =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;

        const units = [...(chapter.units ?? [])];
        units[unitIndex] = { ...(units[unitIndex] ?? emptyUnit(unitIndex)), [field]: value };

        return { ...chapter, unitCount: units.length, units };
      })
    );
  };

  const addQuizQuestion = (chapterIndex) => {
    setChapters((prev) =>
      prev.map((chapter, index) =>
        index === chapterIndex
          ? { ...chapter, quiz: [...(chapter.quiz ?? []), emptyQuizQuestion()] }
          : chapter
      )
    );
  };

  const removeQuizQuestion = (chapterIndex, questionIndex) => {
    setChapters((prev) =>
      prev.map((chapter, index) =>
        index === chapterIndex
          ? { ...chapter, quiz: (chapter.quiz ?? []).filter((_, quizIndex) => quizIndex !== questionIndex) }
          : chapter
      )
    );
  };

  const handleQuizChange = (chapterIndex, questionIndex, field, value) => {
    setChapters((prev) =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;

        const quiz = [...(chapter.quiz ?? [])];
        quiz[questionIndex] = { ...(quiz[questionIndex] ?? emptyQuizQuestion()), [field]: value };

        return { ...chapter, quiz };
      })
    );
  };

  const handleQuizOptionChange = (chapterIndex, questionIndex, optionIndex, value) => {
    setChapters((prev) =>
      prev.map((chapter, index) => {
        if (index !== chapterIndex) return chapter;

        const quiz = [...(chapter.quiz ?? [])];
        const question = { ...(quiz[questionIndex] ?? emptyQuizQuestion()) };
        const options = [...(question.options ?? ["", "", "", ""])];
        options[optionIndex] = value;
        quiz[questionIndex] = { ...question, options };

        return { ...chapter, quiz };
      })
    );
  };

  const addChapter = () => setChapters((prev) => [...prev, emptyChapter()]);
  const removeChapter = (index) =>
    setChapters((prev) => prev.filter((_, chapterIndex) => chapterIndex !== index));

  const uploadMedia = async (file, onUploaded, label) => {
    if (!file) return;

    setUploading(label);
    setError("");
    try {
      const payload = new FormData();
      payload.append("file", file);

      const res = await fetch("/instructor-api/media", {
        method: "POST",
        credentials: "include",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to upload media");
      onUploaded(data.payload.url);
    } catch (err) {
      setError(err.message || "Failed to upload media");
    } finally {
      setUploading("");
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Course title is required");
    if (!form.content.trim()) return setError("Course description is required");
    if (chapters.some((chapter) => !chapter.title.trim())) {
      return setError("All chapters must have a chapter name");
    }
    if (chapters.some((chapter) => (chapter.units ?? []).some((unit) => !unit.title.trim()))) {
      return setError("All units must have a unit name");
    }
    if (chapters.some((chapter) => (chapter.units ?? []).some((unit) => !unit.textContent.trim()))) {
      return setError("All units must have unit content");
    }
    if (chapters.some((chapter) => (chapter.units ?? []).some((unit) => unit.textContent.trim().length < 10))) {
      return setError("Each unit content must be at least 10 characters");
    }
    if (chapters.some((chapter) => (chapter.quiz ?? []).some((question) => !question.question.trim()))) {
      return setError("All quiz questions must have question text");
    }
    if (chapters.some((chapter) => (chapter.quiz ?? []).some((question) => (question.options ?? []).filter((option) => option.trim()).length < 2))) {
      return setError("Each quiz question needs at least two options");
    }
    if (chapters.some((chapter) => (chapter.quiz ?? []).some((question) => {
      const options = question.options ?? [];
      return !options[Number(question.answerIndex)]?.trim();
    }))) {
      return setError("Each quiz question must have a correct answer selected");
    }

    setLoading(true);
    setError("");
    try {
      const courseChapters = chapters.map((chapter) => ({
        ...chapter,
        unitCount: chapter.units?.length ?? 0,
        quiz: (chapter.quiz ?? []).map((question) => ({
          ...question,
          options: (question.options ?? []).map((option) => option.trim()),
          answerIndex: Number(question.answerIndex || 0),
        })),
      }));

      const res = await fetch("/instructor-api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          chapters: courseChapters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      navigate("/instructor/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-page">
      <section className="app-container-sm max-w-3xl">
        <Link
          to="/instructor/dashboard"
          className="mb-8 inline-block text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950"
        >
          Back to dashboard
        </Link>

        <div className="app-card mb-8 p-6">
          <p className="app-eyebrow">New Course</p>
          <h1 className="app-title">Create a Course</h1>
          <p className="app-subtitle">Add the course details, image, and lesson chapters.</p>
        </div>

        <div className="app-panel space-y-6 p-6">
          <Field label="Course Title">
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Complete Java Programming Bootcamp"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

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
                  placeholder="Image URL or public local path"
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-400">
                  Paste an online image link, a public path, or upload from your device.
                </p>
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
                placeholder="Demo video URL or public local path"
                className={inputCls}
              />
              <p className="text-[11px] text-slate-400">
                Add a short preview students can watch before enrolling.
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  uploadMedia(
                    event.target.files?.[0],
                    (url) => setForm((prev) => ({ ...prev, demoVideo: url })),
                    "demo-video"
                  )
                }
                className={fileCls}
              />
              {uploading === "demo-video" && (
                <p className="text-[11px] font-semibold text-blue-700">Uploading demo video...</p>
              )}
            </div>
          </Field>

          <Field label="Course Description">
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={4}
              placeholder="What will students learn? What are the prerequisites?"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Chapters ({chapters.length})
              </label>
              <button type="button" onClick={addChapter} className="text-xs font-bold text-blue-700 hover:text-blue-800">
                Add chapter
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-indigo-100 bg-[#eef0ff] shadow-sm">
              <div className="grid min-h-[34rem] lg:grid-cols-[17rem_1fr]">
                <div className="border-b border-indigo-100 bg-[#fffde8] lg:border-b-0 lg:border-r">
                  <div className="border-b border-indigo-100 bg-[#f8fff0] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Chapter names</p>
                    <p className="mt-2 text-sm text-slate-600">These appear in the student sidebar.</p>
                  </div>

                  <div className="max-h-[30rem] overflow-y-auto bg-white">
                    {chapters.map((chapter, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => document.getElementById(`chapter-editor-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="grid w-full grid-cols-[1.5rem_1fr] gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <span className="mt-1 h-5 w-5 rounded-full border-2 border-slate-300" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-950">
                            {chapter.title || `Chapter ${index + 1}`}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {chapter.units?.length ?? 0} unit{chapter.units?.length === 1 ? "" : "s"} | {chapter.quiz?.length ?? 0} quiz question{chapter.quiz?.length === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  {chapters.map((chapter, index) => (
                    <div id={`chapter-editor-${index}`} key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          Chapter {index + 1}
                        </span>
                        {chapters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeChapter(index)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <Field label="Chapter Name">
                        <input
                          type="text"
                          value={chapter.title}
                          onChange={(event) => handleChapterChange(index, "title", event.target.value)}
                          placeholder="e.g. Introduction to algorithms"
                          className={inputCls}
                        />
                      </Field>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Units ({chapter.units?.length ?? 0})
                          </label>
                          <button
                            type="button"
                            onClick={() => addUnit(index)}
                            className="text-xs font-bold text-blue-700 hover:text-blue-800"
                          >
                            Add unit
                          </button>
                        </div>

                        {(chapter.units?.length ?? 0) === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                            No units added for this chapter. Use Add unit to create one.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {chapter.units.map((unit, unitIndex) => (
                              <div key={unitIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm">
                                      {unitIndex + 1}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700">Unit {unitIndex + 1}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeUnit(index, unitIndex)}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <Field label="Unit Name">
                                  <input
                                    type="text"
                                    value={unit.title}
                                    onChange={(event) => handleUnitChange(index, unitIndex, "title", event.target.value)}
                                    placeholder="e.g. Variables and data types"
                                    className={inputCls}
                                  />
                                </Field>
                                <div className="mt-3">
                                  <Field label="Unit Content">
                                    <textarea
                                      rows={3}
                                      value={unit.textContent}
                                      onChange={(event) => handleUnitChange(index, unitIndex, "textContent", event.target.value)}
                                      placeholder="Add short notes or learning points for this unit..."
                                      className={`${inputCls} resize-none`}
                                    />
                                  </Field>
                                </div>

                                <div className="mt-3">
                                  <Field label="Unit Video">
                                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                                      {unit.videoContent ? (
                                        <VideoEmbed url={unit.videoContent} />
                                      ) : (
                                        <div className="flex aspect-video items-center justify-center text-xs font-semibold text-slate-400">
                                          Video preview
                                        </div>
                                      )}
                                    </div>
                                    <input
                                      type="url"
                                      value={unit.videoContent}
                                      onChange={(event) => handleUnitChange(index, unitIndex, "videoContent", event.target.value)}
                                      placeholder="Video URL or public local path"
                                      className={`${inputCls} mt-2`}
                                    />
                                    <p className="mt-2 text-[11px] text-slate-400">
                                      Paste a video link or upload from your device.
                                    </p>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={(event) =>
                                        uploadMedia(
                                          event.target.files?.[0],
                                          (url) => handleUnitChange(index, unitIndex, "videoContent", url),
                                          `unit-video-${index}-${unitIndex}`
                                        )
                                      }
                                      className={`${fileCls} mt-2`}
                                    />
                                    {uploading === `unit-video-${index}-${unitIndex}` && (
                                      <p className="mt-1 text-[11px] font-semibold text-blue-700">Uploading unit video...</p>
                                    )}
                                  </Field>
                                </div>

                                <div className="mt-3">
                                  <Field label="Unit Document">
                                    <input
                                      type="url"
                                      value={unit.documentContent}
                                      onChange={(event) => handleUnitChange(index, unitIndex, "documentContent", event.target.value)}
                                      placeholder="PDF/document URL or public local path"
                                      className={inputCls}
                                    />
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                                      onChange={(event) =>
                                        uploadMedia(
                                          event.target.files?.[0],
                                          (url) => handleUnitChange(index, unitIndex, "documentContent", url),
                                          `unit-document-${index}-${unitIndex}`
                                        )
                                      }
                                      className={`${fileCls} mt-2`}
                                    />
                                  </Field>
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Add PDF, DOC, PPT, or text notes for this unit.
                                  </p>
                                  {uploading === `unit-document-${index}-${unitIndex}` && (
                                    <p className="mt-1 text-[11px] font-semibold text-blue-700">Uploading unit document...</p>
                                  )}
                                  {unit.documentContent && (
                                    <a
                                      href={unit.documentContent}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-800"
                                    >
                                      Open document
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Chapter Quiz ({chapter.quiz?.length ?? 0})
                          </label>
                          <button
                            type="button"
                            onClick={() => addQuizQuestion(index)}
                            className="text-xs font-bold text-blue-700 hover:text-blue-800"
                          >
                            Add question
                          </button>
                        </div>

                        {(chapter.quiz?.length ?? 0) === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                            No quiz added. Add questions to show a quiz at the end of this chapter.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {chapter.quiz.map((question, questionIndex) => (
                              <div key={questionIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <span className="text-sm font-bold text-slate-700">Question {questionIndex + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeQuizQuestion(index, questionIndex)}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-700"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <Field label="Question">
                                  <input
                                    type="text"
                                    value={question.question}
                                    onChange={(event) => handleQuizChange(index, questionIndex, "question", event.target.value)}
                                    placeholder="e.g. Which data structure uses FIFO?"
                                    className={inputCls}
                                  />
                                </Field>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  {(question.options ?? ["", "", "", ""]).map((option, optionIndex) => (
                                    <Field key={optionIndex} label={`Option ${optionIndex + 1}`}>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(event) => handleQuizOptionChange(index, questionIndex, optionIndex, event.target.value)}
                                          placeholder={`Option ${optionIndex + 1}`}
                                          className={inputCls}
                                        />
                                        <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-600">
                                          <input
                                            type="radio"
                                            name={`chapter-${index}-quiz-${questionIndex}-answer`}
                                            checked={Number(question.answerIndex) === optionIndex}
                                            onChange={() => handleQuizChange(index, questionIndex, "answerIndex", optionIndex)}
                                            className="sr-only"
                                          />
                                          {Number(question.answerIndex) === optionIndex ? "OK" : ""}
                                        </label>
                                      </div>
                                    </Field>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="app-error">{error}</div>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link to="/instructor/dashboard" className="app-button-secondary flex-1">
              Cancel
            </Link>
            <button type="button" onClick={handleSubmit} disabled={loading} className="app-button-primary flex-1">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </button>
          </div>
        </div>
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
        title="Video preview"
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; compute-pressure; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return <video key={video.src} src={video.src} controls className="aspect-video w-full object-contain" />;
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

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const fileCls =
  "w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:border-blue-200";

