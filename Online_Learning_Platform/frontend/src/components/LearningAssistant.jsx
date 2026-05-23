import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const INITIAL_MESSAGES = [
  {
    from: "bot",
    text: "Hi, I am your Learning Assistant. I can help you find courses, continue learning, or choose what to study next.",
  },
];

const QUICK_PROMPTS = {
  home: ["How do I start?", "Suggest a course", "Where is my dashboard?"],
  courses: ["Help me choose", "How to enroll?", "Find free courses"],
  learning: ["What should I do next?", "How to ask a doubt?", "Certificate help"],
};

function getPageType(pathname) {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/student/learn")) return "learning";
  if (pathname.startsWith("/student/courses")) return "courses";
  return "";
}

function getBotReply(message, pageType) {
  const text = message.toLowerCase();

  if (text.includes("start") || text.includes("dashboard")) {
    return "Start from My Learning to see enrolled courses, progress, and your next lesson. You can also browse courses if you want something new.";
  }

  if (text.includes("choose") || text.includes("suggest") || text.includes("recommend")) {
    return "Pick a course that matches your current goal. For beginners, choose a course with a clear title, demo video, and a category you already want to practice.";
  }

  if (text.includes("enroll") || text.includes("free") || text.includes("pay")) {
    return "Open a course page, review the details, then use Enroll free or Pay and enroll. After enrollment, the course opens in your learning area.";
  }

  if (text.includes("doubt") || text.includes("question")) {
    return "Inside the course player, use Ask instructor for private unit doubts or Ask classmates to discuss with other enrolled students.";
  }

  if (text.includes("certificate")) {
    return "Complete your course first. If the course requires payment for certificate access, the app will take you to the payment page before showing it.";
  }

  if (text.includes("next") || text.includes("continue")) {
    return "Continue with the next unit, try the chapter quiz, and mark the course completed when you finish all lessons.";
  }

  if (pageType === "learning") {
    return "On this lesson page, focus on the current unit, use Next unit to move forward, and ask a doubt if anything feels unclear.";
  }

  if (pageType === "courses") {
    return "Use Browse Courses to compare categories, open a course detail page, and check the course content before enrolling.";
  }

  return "I can help with course guidance, navigation, learning suggestions, enrollment, doubts, and certificates. Try asking what you want to do next.";
}

export default function LearningAssistant() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const pageType = getPageType(location.pathname);
  const shouldShow = !loading && pageType && (!user || user.role === "STUDENT");
  const quickPrompts = useMemo(() => QUICK_PROMPTS[pageType] ?? QUICK_PROMPTS.home, [pageType]);

  if (!shouldShow) return null;

  const sendMessage = (value = input) => {
    const text = value.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { from: "user", text },
      { from: "bot", text: getBotReply(text, pageType) },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <section className="w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-200">Learning Assistant</p>
              <h2 className="text-sm font-bold">Course Help Bot</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-white transition hover:bg-white/10"
              aria-label="Close learning assistant"
            >
              x
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-6 ${
                    message.from === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask for course help..."
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
                Send
              </button>
            </form>

            {user?.role === "STUDENT" && (
              <Link to="/student/courses" className="mt-3 block text-center text-xs font-bold text-blue-700 hover:text-blue-800">
                Browse courses
              </Link>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        aria-label={open ? "Close learning assistant" : "Open learning assistant"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H12l-4.5 4v-4A3.5 3.5 0 0 1 5 11.5v-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 8h6M9 11h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
