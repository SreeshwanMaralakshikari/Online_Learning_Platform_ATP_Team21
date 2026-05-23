import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studySessionSeconds, setStudySessionSeconds] = useState(0);
  const didCheckAuth = useRef(false);
  const studySessionStartRef = useRef(null);
  const navigate = useNavigate();

  const getStudySessionKey = useCallback((userData) => (
    `study-session-start:${userData?._id || userData?.id || userData?.email || "guest"}`
  ), []);

  const startStudySession = useCallback((userData, { reset = false } = {}) => {
    if (userData?.role !== "STUDENT") {
      studySessionStartRef.current = null;
      setStudySessionSeconds(0);
      return;
    }

    const storageKey = getStudySessionKey(userData);
    const savedStart = Number(window.localStorage.getItem(storageKey));
    const nextStart = reset || !Number.isFinite(savedStart) || savedStart <= 0 ? Date.now() : savedStart;

    window.localStorage.setItem(storageKey, String(nextStart));
    studySessionStartRef.current = nextStart;
    setStudySessionSeconds(Math.max(0, Math.floor((Date.now() - nextStart) / 1000)));
  }, [getStudySessionKey]);

  const endStudySession = useCallback((userData) => {
    if (userData?.role === "STUDENT") {
      window.localStorage.removeItem(getStudySessionKey(userData));
    }
    studySessionStartRef.current = null;
    setStudySessionSeconds(0);
  }, [getStudySessionKey]);

  useEffect(() => {
    if (didCheckAuth.current) return;
    didCheckAuth.current = true;

    const checkAuth = async () => {
      try {
        const res = await fetch("/auth/check-auth", {
          credentials: "include",
        });
        const data = await res.json();

        if (res.ok && data.authenticated) {
          setUser(data.payload);
          startStudySession(data.payload);
        } else {
          setUser(null);
          endStudySession(null);
        }
      } catch (err) {
        if (!import.meta.env.DEV) {
          console.error("Auth check failed:", err);
        }
        setUser(null);
        endStudySession(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [endStudySession, startStudySession]);

  useEffect(() => {
    if (!user || user.role !== "STUDENT" || !studySessionStartRef.current) return undefined;

    const intervalId = window.setInterval(() => {
      setStudySessionSeconds(Math.max(0, Math.floor((Date.now() - studySessionStartRef.current) / 1000)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    startStudySession(userData, { reset: true });

    if (userData.role === "STUDENT") navigate("/student/dashboard");
    else if (userData.role === "INSTRUCTOR") navigate("/instructor/dashboard");
    else if (userData.role === "ADMIN") navigate("/admin/dashboard");
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    const currentUser = user;
    try {
      await fetch("/auth/logout", {
        credentials: "include",
      });
    } finally {
      endStudySession(currentUser);
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, studySessionSeconds }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
