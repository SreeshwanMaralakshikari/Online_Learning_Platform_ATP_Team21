
import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "../../axiosInstance";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getVideoEmbed } from "../../utils/media";

const hasCertificateAccess = (enrollment) => {
  const payment = enrollment?.payment;
  const paymentAmount = typeof payment === "object" ? Number(payment?.amount || 0) : 0;
  const paymentStatus = typeof payment === "object" ? payment?.status : null;

  return paymentAmount > 0 && paymentStatus === "SUCCESS";
};

const getAssignmentTitle = (chapter, chapterIndex) => {
  const chapterTitle = chapter?.title?.trim() || `Chapter ${chapterIndex + 1}`;
  return `${chapterTitle} Assignment`;
};

const getAssignmentSidebarTitle = (chapter, chapterIndex) => {
  const chapterTitle = chapter?.title?.trim() || `Chapter ${chapterIndex + 1}`;
  return `Quiz: ${chapterTitle}: Assignment ${chapterIndex + 1}`;
};

export default function CoursePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeUnit, setActiveUnit] = useState(0);
  const [activeItemType, setActiveItemType] = useState("unit");
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [courseDoubts, setCourseDoubts] = useState([]);
  const [doubtForm, setDoubtForm] = useState({ topic: "", description: "" });
  const [instructorDoubtForms, setInstructorDoubtForms] = useState({});
  const [answerForms, setAnswerForms] = useState({});
  const [postingDoubt, setPostingDoubt] = useState(false);
  const [postingInstructorDoubt, setPostingInstructorDoubt] = useState("");
  const [postingAnswer, setPostingAnswer] = useState("");
  const [doubtMessage, setDoubtMessage] = useState("");
  const [instructorDoubtMessage, setInstructorDoubtMessage] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const studySecondsRef = useRef(0);

  const sendProgress = useCallback(async (nextProgress) => {
    const safeProgress = Math.min(100, Math.max(0, Math.round(nextProgress)));
    const nextStatus = safeProgress >= 100 ? "Completed" : safeProgress > 0 ? "In Progress" : "Enrolled";

    await axiosInstance.patch("/student-api/course", { courseId: id, status: nextStatus, progress: safeProgress });
  }, [id]);

  const saveProgress = useCallback(async (nextProgress) => {
    const safeProgress = Math.min(100, Math.max(0, Math.round(nextProgress)));
    const nextStatus = safeProgress >= 100 ? "Completed" : safeProgress > 0 ? "In Progress" : "Enrolled";

    setEnrollment((prev) => (
      prev ? { ...prev, status: nextStatus, progress: safeProgress } : prev
    ));

    await sendProgress(nextProgress);
  }, [sendProgress]);

  const saveStudyTime = useCallback(async (minutes) => {
    if (!minutes || minutes < 1) return;

    await axiosInstance.patch("/student-api/course", { courseId: id, timeSpentMinutes: minutes });
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enrollRes, doubtsRes] = await Promise.all([
          axiosInstance.get("/student-api/course"),
          axiosInstance.get(`/student-api/doubts/feed?courseId=${id}`)
        ]);

        const myEnroll = enrollRes.data.payload?.find((item) => (item.course?._id ?? item.course) === id);
        if (!myEnroll) {
          navigate(`/student/courses/${id}`);
          return;
        }

        // Use the course data populated inside the enrollment instead of a separate fetch.
        // This avoids "Course not found" errors when the two requests return inconsistent data.
        if (!myEnroll.course || typeof myEnroll.course !== "object") {
          navigate(`/student/courses/${id}`);
          return;
        }

        setCourse(myEnroll.course);
        setEnrollment(myEnroll);
        setCourseDoubts(doubtsRes.data.payload || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    if (!course || !enrollment || enrollment.status === "Dropped") return;

    const intervalId = window.setInterval(() => {
      studySecondsRef.current += 15;
      if (studySecondsRef.current < 60) return;

      const minutes = Math.floor(studySecondsRef.current / 60);
      studySecondsRef.current -= minutes * 60;
      saveStudyTime(minutes).catch(() => {});
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      const minutes = Math.floor(studySecondsRef.current / 60);
      studySecondsRef.current -= minutes * 60;
      saveStudyTime(minutes).catch(() => {});
    };
  }, [course, enrollment, saveStudyTime]);

  useEffect(() => {
    if (!course || !enrollment || enrollment.status === "Completed") return;

    const chapters = course.chapters ?? [];
    if (chapters.length === 0) return;

    const nextProgress = Math.round(((activeChapter + 1) / chapters.length) * 100);
    if (nextProgress <= Number(enrollment.progress || 0)) return;

    sendProgress(nextProgress).catch((err) => {
      setError(err.response?.data?.message || err.message || "Failed to update progress");
    });
  }, [activeChapter, course, enrollment, sendProgress]);

  const handleComplete = async () => {
    setCompleting(true);
    setError("");

    try {
      await saveProgress(100);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update progress");
    } finally {
      setCompleting(false);
    }
  };

  const handleChapterSelect = (index) => {
    setActiveChapter(index);
    setActiveUnit(0);
    setActiveItemType("unit");
    setExpandedChapters((current) => (
      current.includes(index)
        ? current.filter((chapterIndex) => chapterIndex !== index)
        : [...current, index]
    ));
  };

  const openChapter = (index) => {
    setActiveChapter(index);
    setActiveUnit(0);
    setActiveItemType("unit");
    setExpandedChapters((current) => (current.includes(index) ? current : [...current, index]));
  };

  const handleUnitSelect = (chapterIndex, unitIndex) => {
    setActiveChapter(chapterIndex);
    setActiveUnit(unitIndex);
    setActiveItemType("unit");
    setExpandedChapters((current) => (current.includes(chapterIndex) ? current : [...current, chapterIndex]));
  };

  const handleAssignmentSelect = (chapterIndex) => {
    setActiveChapter(chapterIndex);
    setActiveItemType("assignment");
    setExpandedChapters((current) => (current.includes(chapterIndex) ? current : [...current, chapterIndex]));
  };

  const handleDoubtSubmit = async (event) => {
    event.preventDefault();
    setPostingDoubt(true);
    setDoubtMessage("");

    try {
      const res = await axiosInstance.post("/student-api/doubts", { courseId: id, ...doubtForm });
      // axios throws on non-2xx automatically

      setCourseDoubts((items) => [res.data.payload, ...items]);
      setDoubtForm({ topic: "", description: "" });
      setDoubtMessage(res.data.message || "Doubt posted");
    } catch (err) {
      setDoubtMessage(err.message || "Failed to post doubt");
    } finally {
      setPostingDoubt(false);
    }
  };

  const handleInstructorDoubtSubmit = async (event, unitKey, chapterTitle, unitTitle) => {
    event.preventDefault();
    const formValue = instructorDoubtForms[unitKey] || { topic: "", description: "" };

    if (!formValue.topic.trim() || !formValue.description.trim()) {
      setInstructorDoubtMessage("Topic and doubt are required");
      return;
    }

    setPostingInstructorDoubt(unitKey);
    setInstructorDoubtMessage("");

    try {
      const res = await axiosInstance.post("/student-api/doubts", {
          courseId: id,
          audience: "instructor",
          chapterTitle,
          unitTitle,
          topic: formValue.topic,
          description: formValue.description,
        });
      // axios throws on non-2xx automatically

      setInstructorDoubtForms((current) => ({ ...current, [unitKey]: { topic: "", description: "" } }));
      setInstructorDoubtMessage(res.data.message || "Doubt sent to instructor");
    } catch (err) {
      setInstructorDoubtMessage(err.message || "Failed to send doubt to instructor");
    } finally {
      setPostingInstructorDoubt("");
    }
  };

  const handleAnswerSubmit = async (event, doubtId) => {
    event.preventDefault();
    const solution = answerForms[doubtId] || "";
    if (!solution.trim()) return;

    setPostingAnswer(doubtId);
    setDoubtMessage("");

    try {
      const res = await axiosInstance.post(`/student-api/doubts/${doubtId}/answers`, { solution });
      // axios throws on non-2xx automatically

      setCourseDoubts((items) => items.map((item) => (item._id === doubtId ? res.data.payload : item)));
      setAnswerForms((current) => ({ ...current, [doubtId]: "" }));
      setDoubtMessage(res.data.message || "Solution posted");
    } catch (err) {
      setDoubtMessage(err.message || "Failed to post solution");
    } finally {
      setPostingAnswer("");
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} />;
  if (!course) return null;

  const chapters = course.chapters ?? [];
  const currentChapter = chapters[activeChapter];
  const currentChapterTitle = currentChapter?.title || `Chapter ${activeChapter + 1}`;
  const currentUnits = currentChapter?.units ?? [];
  const safeActiveUnit = currentUnits.length > 0 ? Math.min(activeUnit, currentUnits.length - 1) : 0;
  const currentUnit = currentUnits[safeActiveUnit];
  const currentUnitTitle = currentUnit?.title || `Unit ${safeActiveUnit + 1}`;
  const currentQuiz = currentChapter?.quiz ?? [];
  const isAssignmentActive = currentQuiz.length > 0 && (activeItemType === "assignment" || currentUnits.length === 0);
  const currentAssignmentTitle = getAssignmentTitle(currentChapter, activeChapter);
  const answeredAssignmentCount = currentQuiz.filter((question, questionIndex) => {
    const answerKey = `${currentChapter?._id ?? activeChapter}-${question._id ?? questionIndex}`;
    return quizAnswers[answerKey] !== undefined;
  }).length;
  const correctAssignmentCount = currentQuiz.filter((question, questionIndex) => {
    const answerKey = `${currentChapter?._id ?? activeChapter}-${question._id ?? questionIndex}`;
    return quizAnswers[answerKey] === Number(question.answerIndex);
  }).length;
  const selectedUnitKey = currentUnit?._id ?? `${activeChapter}-${safeActiveUnit}`;
  const selectedInstructorForm = instructorDoubtForms[selectedUnitKey] || { topic: "", description: "" };
  const isCompleted = enrollment?.status === "Completed";
  const certificateAccess = hasCertificateAccess(enrollment);
  const savedProgress = Math.min(100, Math.max(0, Math.round(Number(enrollment?.progress || 0))));
  const progress = isCompleted ? 100 : Math.max(savedProgress, chapters.length ? Math.round(((activeChapter + 1) / chapters.length) * 100) : 0);
  const completedLessons = isCompleted ? chapters.length : Math.min(chapters.length, Math.ceil((progress / 100) * chapters.length));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/student/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
              Back to My Learning
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">{course.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{completedLessons} of {chapters.length} lessons viewed</p>
          </div>

          <div className="w-full sm:w-64">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Chapters</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{course.category || "Course content"}</h2>
              </div>

              <div className="max-h-[26rem] overflow-y-auto p-2">
                {chapters.length === 0 && <p className="p-3 text-sm text-slate-500">No lessons are available yet.</p>}
                {chapters.map((chapter, index) => {
                  const chapterUnits = chapter.units ?? [];
                  const isActiveChapter = activeChapter === index;
                  const isExpandedChapter = expandedChapters.includes(index);

                  return (
                    <div
                      key={chapter._id ?? index}
                      className={`mb-2 overflow-hidden rounded-lg border transition ${
                        isActiveChapter ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleChapterSelect(index)}
                        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            isActiveChapter ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`line-clamp-2 text-sm font-bold ${isActiveChapter ? "text-blue-700" : "text-slate-800"}`}>
                            {chapter.title || `Chapter ${index + 1}`}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {chapterUnits.length} unit{chapterUnits.length === 1 ? "" : "s"} | {(chapter.quiz?.length ?? 0) > 0 ? "1 assignment" : "0 assignments"}
                          </span>
                        </span>
                        <span className={`mt-1 text-xs font-bold ${isExpandedChapter ? "text-blue-700" : "text-slate-400"}`}>
                          {isExpandedChapter ? "Hide" : "Open"}
                        </span>
                      </button>

                      {isExpandedChapter && (chapterUnits.length > 0 || (chapter.quiz?.length ?? 0) > 0) && (
                        <div className="border-t border-blue-100 bg-white px-3 py-2">
                          {chapterUnits.map((unit, unitIndex) => (
                            <button
                              key={unit._id ?? unitIndex}
                              type="button"
                              onClick={() => handleUnitSelect(index, unitIndex)}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                                isActiveChapter && activeItemType === "unit" && safeActiveUnit === unitIndex ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                                isActiveChapter && activeItemType === "unit" && safeActiveUnit === unitIndex ? "border-white bg-white" : "border-slate-300 bg-white"
                              }`}>
                                {isActiveChapter && activeItemType === "unit" && safeActiveUnit === unitIndex && <span className="h-2 w-2 rounded-sm bg-slate-950" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{unit.title || `Unit ${unitIndex + 1}`}</span>
                                <span className={`mt-0.5 block text-xs ${isActiveChapter && activeItemType === "unit" && safeActiveUnit === unitIndex ? "text-slate-300" : "text-slate-400"}`}>
                                  Unit {unitIndex + 1}{unit.videoContent ? " | Video" : ""}
                                </span>
                              </span>
                            </button>
                          ))}
                          {(chapter.quiz?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAssignmentSelect(index)}
                              className={`mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                isActiveChapter && activeItemType === "assignment"
                                  ? "border-emerald-200 bg-emerald-600 text-white"
                                  : "border-emerald-100 bg-emerald-50 text-emerald-800 hover:border-emerald-200"
                              }`}
                            >
                              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                                isActiveChapter && activeItemType === "assignment" ? "border-white bg-white" : "border-emerald-200 bg-white"
                              }`}>
                                {isActiveChapter && activeItemType === "assignment" && <span className="h-2 w-2 rounded-sm bg-emerald-600" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{getAssignmentSidebarTitle(chapter, index)}</span>
                                <span className={`mt-0.5 block text-xs ${isActiveChapter && activeItemType === "assignment" ? "text-emerald-100" : "text-emerald-600"}`}>
                                  MCQ assignment | {chapter.quiz.length} question{chapter.quiz.length === 1 ? "" : "s"}
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 p-4">
                {isCompleted ? (
                  <div className="space-y-3">
                    <Link
                      to={certificateAccess ? `/student/certificate/${id}` : `/student/payment/${id}`}
                      state={!certificateAccess ? { certificate: true } : undefined}
                      className="app-button-primary w-full"
                    >
                      Certificate
                    </Link>
                    <Link to={`/student/review/${id}`} className="app-button-secondary w-full">
                      Rate course
                    </Link>
                  </div>
                ) : (
                  chapters.length > 0 && (
                    <button type="button" onClick={handleComplete} disabled={completing} className="app-button-primary w-full">
                      {completing ? "Marking..." : "Mark as completed"}
                    </button>
                  )
                )}
              </div>
            </div>

            <CourseDoubtPanel
              doubts={courseDoubts}
              form={doubtForm}
              answerForms={answerForms}
              onFormChange={setDoubtForm}
              onAnswerChange={setAnswerForms}
              onSubmit={handleDoubtSubmit}
              onAnswerSubmit={handleAnswerSubmit}
              submitting={postingDoubt}
              postingAnswer={postingAnswer}
              message={doubtMessage}
            />
          </aside>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {chapters.length === 0 ? (
              <div className="flex min-h-[28rem] items-center justify-center text-sm text-slate-500">
                This course has no lessons yet.
              </div>
            ) : (
              <div>
                <p className="app-eyebrow">Chapter {activeChapter + 1} of {chapters.length}</p>
                <h2 className="mb-5 text-2xl font-bold text-slate-950">{currentChapterTitle}</h2>

                {!isAssignmentActive && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="app-eyebrow">Unit {currentUnits.length ? safeActiveUnit + 1 : 0} of {currentUnits.length}</p>
                      <h3 className="text-xl font-bold text-slate-950">{currentUnits.length ? currentUnitTitle : "No units added"}</h3>
                    </div>
                    {currentUnits.length > 0 && (currentUnits.length > 1 || currentQuiz.length > 0) && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveUnit(Math.max(0, safeActiveUnit - 1))}
                          disabled={safeActiveUnit === 0}
                          className="app-button-secondary px-4 py-2 text-sm"
                        >
                          Prev unit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (safeActiveUnit === currentUnits.length - 1 && currentQuiz.length > 0) {
                              setActiveItemType("assignment");
                              return;
                            }
                            setActiveUnit(Math.min(currentUnits.length - 1, safeActiveUnit + 1));
                          }}
                          disabled={safeActiveUnit === currentUnits.length - 1 && currentQuiz.length === 0}
                          className="app-button-primary px-4 py-2 text-sm"
                        >
                          {safeActiveUnit === currentUnits.length - 1 && currentQuiz.length > 0 ? "Assignment" : "Next unit"}
                        </button>
                      </div>
                    )}
                  </div>

                  {currentUnit ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                        {currentUnit.textContent || "No unit content added yet."}
                      </p>

                      {(currentUnit.videoContent || currentUnit.documentContent) && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          {currentUnit.videoContent && (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                              <VideoEmbed url={currentUnit.videoContent} />
                            </div>
                          )}
                          {currentUnit.documentContent && (
                            <a
                              href={currentUnit.documentContent}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-28 items-center justify-center rounded-lg border border-blue-100 bg-white px-4 py-5 text-sm font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                              Open unit document
                            </a>
                          )}
                        </div>
                      )}

                      <form
                        onSubmit={(event) => handleInstructorDoubtSubmit(event, selectedUnitKey, currentChapterTitle, currentUnitTitle)}
                        className="mt-4 rounded-lg border border-blue-100 bg-white p-4"
                      >
                        <div className="mb-3">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Ask instructor</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Send a private doubt about this unit directly to your instructor.</p>
                        </div>
                        <div className="space-y-3">
                          <input
                            value={selectedInstructorForm.topic}
                            onChange={(event) =>
                              setInstructorDoubtForms((current) => ({
                                ...current,
                                [selectedUnitKey]: { ...selectedInstructorForm, topic: event.target.value },
                              }))
                            }
                            placeholder="Doubt topic"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                          <textarea
                            rows={3}
                            value={selectedInstructorForm.description}
                            onChange={(event) =>
                              setInstructorDoubtForms((current) => ({
                                ...current,
                                [selectedUnitKey]: { ...selectedInstructorForm, description: event.target.value },
                              }))
                            }
                            placeholder="Ask your instructor about this unit..."
                            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                          {instructorDoubtMessage && <div className="app-success">{instructorDoubtMessage}</div>}
                          <button
                            type="submit"
                            disabled={postingInstructorDoubt === selectedUnitKey}
                            className="app-button-primary w-full px-4 py-2 text-sm"
                          >
                            {postingInstructorDoubt === selectedUnitKey ? "Sending..." : "Send to instructor"}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No units added for this chapter.
                    </p>
                  )}
                </div>
                )}

                {isAssignmentActive && (
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm">
                        Lesson: {currentAssignmentTitle}
                      </span>
                      {currentUnits.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUnit(currentUnits.length - 1);
                            setActiveItemType("unit");
                          }}
                          className="app-button-secondary px-4 py-2 text-sm"
                        >
                          Previous unit
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="app-eyebrow">MCQ Assignment</p>
                        <h3 className="text-2xl font-bold text-slate-950">{currentAssignmentTitle}</h3>
                      </div>
                      {currentQuiz.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <span className="font-bold text-slate-950">{answeredAssignmentCount}/{currentQuiz.length}</span>
                          <span className="ml-1 text-slate-500">answered</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="font-bold text-emerald-700">{correctAssignmentCount}</span>
                          <span className="ml-1 text-slate-500">correct</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {currentQuiz.length > 0 ? (
                    <div className="space-y-4 p-5">
                      {currentQuiz.map((question, questionIndex) => {
                        const answerKey = `${currentChapter?._id ?? activeChapter}-${question._id ?? questionIndex}`;
                        const selectedAnswer = quizAnswers[answerKey];
                        const correctAnswer = Number(question.answerIndex);
                        const hasAnswered = selectedAnswer !== undefined;

                        return (
                          <div key={question._id ?? questionIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex items-start gap-3">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
                                {questionIndex + 1}
                              </span>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Question {questionIndex + 1}</p>
                                <p className="mt-1 text-sm font-bold leading-6 text-slate-950">{question.question}</p>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {(question.options ?? []).map((option, optionIndex) => {
                                if (!option?.trim()) return null;
                                const isSelected = selectedAnswer === optionIndex;
                                const isCorrect = correctAnswer === optionIndex;
                                const resultClass = hasAnswered && isSelected
                                  ? isCorrect
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200";

                                return (
                                  <button
                                    key={`${option}-${optionIndex}`}
                                    type="button"
                                    onClick={() => setQuizAnswers((current) => ({ ...current, [answerKey]: optionIndex }))}
                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${resultClass}`}
                                  >
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs">
                                      {String.fromCharCode(65 + optionIndex)}
                                    </span>
                                    <span>{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {hasAnswered && (
                              <p className={`mt-3 text-xs font-bold ${selectedAnswer === correctAnswer ? "text-emerald-700" : "text-rose-600"}`}>
                                {selectedAnswer === correctAnswer ? "Correct answer" : "Try again"}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-blue-950">
                          Assignment score: {correctAssignmentCount}/{currentQuiz.length}
                        </p>
                        <button
                          type="button"
                          onClick={() => openChapter(Math.min(chapters.length - 1, activeChapter + 1))}
                          disabled={activeChapter === chapters.length - 1}
                          className="app-button-primary px-4 py-2 text-sm"
                        >
                          Next lesson
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="m-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No assignment added for this chapter.
                    </p>
                  )}
                </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openChapter(Math.max(0, activeChapter - 1))}
                    disabled={activeChapter === 0}
                    className="app-button-secondary"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => openChapter(Math.min(chapters.length - 1, activeChapter + 1))}
                    disabled={activeChapter === chapters.length - 1}
                    className="app-button-primary"
                  >
                    Next
                  </button>
                </div>

              </div>
            )}
          </section>
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
        title="Unit video"
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; compute-pressure; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <video
      key={video.src}
      src={video.src}
      controls
      className="aspect-video w-full object-contain"
    />
  );
}

function CourseDoubtPanel({
  doubts,
  form,
  answerForms,
  onFormChange,
  onAnswerChange,
  onSubmit,
  onAnswerSubmit,
  submitting,
  postingAnswer,
  message,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <p className="app-eyebrow">Doubt chatbot</p>
        <h3 className="text-lg font-bold text-slate-950">Ask classmates</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Post doubts and answer questions from other enrolled students.
        </p>
      </div>

      <div className="space-y-4 p-4">
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            value={form.topic}
            onChange={(event) => onFormChange((current) => ({ ...current, topic: event.target.value }))}
            placeholder="Doubt topic"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
            placeholder="Ask your doubt..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          {message && <div className="app-success">{message}</div>}
          <button type="submit" disabled={submitting} className="app-button-primary w-full px-4 py-2 text-sm">
            {submitting ? "Posting..." : "Post doubt"}
          </button>
        </form>

        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {doubts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No class doubts yet.
            </div>
          ) : (
            doubts.map((doubt) => (
              <DoubtCard
                key={doubt._id}
                doubt={doubt}
                answerValue={answerForms[doubt._id] || ""}
                onAnswerChange={(value) => onAnswerChange((current) => ({ ...current, [doubt._id]: value }))}
                onAnswerSubmit={(event) => onAnswerSubmit(event, doubt._id)}
                posting={postingAnswer === doubt._id}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DoubtCard({ doubt, answerValue, onAnswerChange, onAnswerSubmit, posting }) {
  const studentName = [doubt.student?.firstName, doubt.student?.lastName].filter(Boolean).join(" ") || "Student";
  const answers = doubt.answers ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-slate-950">{doubt.topic}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          doubt.status === "Answered" || doubt.status === "Matched" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}>
          {doubt.status}
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-500">
        {studentName} | {doubt.course?.title || "Course"}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{doubt.description}</p>

      {answers.length > 0 && (
        <div className="mt-3 space-y-2">
          {answers.map((answer, index) => {
            const answerStudent = [answer.student?.firstName, answer.student?.lastName].filter(Boolean).join(" ") || "Classmate";
            return (
              <div key={answer._id ?? index} className="rounded-lg border border-emerald-100 bg-white p-3">
                <p className="text-xs font-bold text-emerald-700">{answerStudent} answered</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{answer.solution}</p>
              </div>
            );
          })}
        </div>
      )}

      {doubt.instructorReply && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Instructor reply
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">{doubt.instructorReply}</p>
        </div>
      )}

      <form onSubmit={onAnswerSubmit} className="mt-3 space-y-2">
        <textarea
          rows={2}
          value={answerValue}
          onChange={(event) => onAnswerChange(event.target.value)}
          placeholder="Post a solution..."
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <button type="submit" disabled={posting || !answerValue.trim()} className="w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
          {posting ? "Posting..." : "Post solution"}
        </button>
      </form>
    </div>
  );
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
        <p className="text-lg font-semibold text-slate-950">Unable to open lesson</p>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
