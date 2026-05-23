import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const METHODS = [
  { value: "UPI", label: "UPI", icon: "UPI", desc: "Google Pay, PhonePe, Paytm" },
  { value: "CARD", label: "Card", icon: "CARD", desc: "Credit or debit card" },
  { value: "NET_BANKING", label: "Net Banking", icon: "BANK", desc: "All major banks" },
  { value: "WALLET", label: "Wallet", icon: "WLT", desc: "Paytm, Mobikwik, and more" },
];

const generateTxnId = () =>
  "TXN" + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();

const formatAmount = (amount = 0) => (Number(amount) === 0 ? "Free" : `Rs. ${amount}`);

export default function Payment() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [method, setMethod] = useState("UPI");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const isFree = Number(course?.price || 0) === 0;
  const isCertificatePurchase =
    isFree && (location.state?.certificate === true || enrollment?.status === "Completed");
  const totalAmount = isCertificatePurchase ? 1 : Number(course?.price || 0);

  const selectedMethod = useMemo(
    () => METHODS.find((item) => item.value === method) || METHODS[0],
    [method]
  );

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const [coursesRes, enrollRes] = await Promise.all([
          fetch("/student-api/courses", { credentials: "include" }),
          fetch("/student-api/course", { credentials: "include" }),
        ]);
        const data = await coursesRes.json();
        const enrollData = await enrollRes.json();
        if (!coursesRes.ok) throw new Error(data.message || "Unable to load course details");

        const found = data.payload?.find((item) => item._id === courseId);
        if (!found) throw new Error("Course not found");

        setCourse(found);
        if (enrollRes.ok) {
          setEnrollment((enrollData.payload || []).find((item) => (item.course?._id ?? item.course) === courseId) || null);
        }
      } catch (err) {
        setError(err.message || "Unable to load course details");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handlePay = async () => {
    if (!user) {
      setError("Please sign in again to continue.");
      return;
    }

    if (!courseId) {
      setError("Course ID is missing. Please return to the course page and try again.");
      return;
    }

    setPaying(true);
    setError("");

    try {
      const studentId = user?._id || user?.id;
      const paymentAmount = isCertificatePurchase ? 1 : Number(course?.price || 0);
      const txnId = generateTxnId();

      // Final verification before sending
      if (!studentId || !courseId || paymentAmount < 0) {
        console.error("Payment validation failed locally:", { studentId, courseId, paymentAmount });
        setError("Payment details are incomplete. Please ensure you are logged in and try again.");
        setPaying(false);
        return;
      }

      const payRes = await fetch("/student-api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // Ensure these keys match your backend validation (e.g., 'student' vs 'studentId')
          student: studentId, 
          course: courseId,   
          amount: paymentAmount,
          method,
          transactionId: txnId,
          status: "SUCCESS",
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.message || "Payment failed");

      if (enrollment) {
        navigate(isCertificatePurchase ? `/student/certificate/${courseId}` : `/student/learn/${courseId}`);
        return;
      }

      const enrollRes = await fetch("/student-api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          student: studentId,
          course: courseId,
          payment: payData.payload?._id,
        }),
      });

      const enrollData = await enrollRes.json();
      if (!enrollRes.ok) throw new Error(enrollData.message || "Enrollment failed");

      navigate(`/student/learn/${courseId}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loader />;
  if (!course && error) return <ErrorView message={error} courseId={courseId} />;

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-xl">
        <Link
          to={`/student/courses/${courseId}`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
        >
          <span aria-hidden="true">&larr;</span>
          Back to course
        </Link>

        <div className="mb-8">
          <p className="app-eyebrow">
            Checkout
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            {isCertificatePurchase ? "Complete certificate payment" : "Complete enrollment"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isCertificatePurchase ? "You are buying certificate access for " : "You are enrolling in "}
            <span className="font-semibold text-slate-950">{course?.title}</span>
          </p>
        </div>

        <div className="app-panel mb-6">
          <div className="space-y-4">
            <SummaryRow label="Course" value={course?.title} strong />
            <SummaryRow label="Category" value={course?.category || "General"} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5">
            <span className="text-sm font-semibold text-slate-950">Total</span>
            <span className="text-2xl font-bold text-blue-700">
              {formatAmount(totalAmount)}
            </span>
          </div>
        </div>

        {(!isFree || isCertificatePurchase) && (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Payment method
            </p>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {METHODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className={`relative min-h-28 rounded-lg border p-4 text-left transition-all ${
                    method === item.value
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  aria-pressed={method === item.value}
                >
                  <span className="mb-4 inline-flex h-8 min-w-12 items-center justify-center rounded-md bg-slate-950 px-2 text-[10px] font-bold tracking-wide text-white">
                    {item.icon}
                  </span>
                  <span
                    className={`block text-sm font-semibold ${
                      method === item.value ? "text-blue-700" : "text-slate-950"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {item.desc}
                  </span>
                  {method === item.value && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-white">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2.5 6.25L5 8.75L9.5 3.75"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {isFree && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {isCertificatePurchase
              ? "This free course requires a small payment before the certificate can be downloaded."
              : "This course is free. Confirm enrollment to start learning now."}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processing...
            </>
          ) : isCertificatePurchase ? (
            "Pay Rs. 1 for certificate"
          ) : isFree ? (
            "Enroll for free"
          ) : (
            `Pay ${formatAmount(course?.price)} and enroll`
          )}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          {isFree
            ? isCertificatePurchase
              ? "Certificate access is added after payment."
              : "Access is added instantly after enrollment."
            : `Secured checkout using ${selectedMethod.label}. Access is added after payment.`}
        </p>
      </section>
    </main>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`max-w-64 text-right text-sm ${
          strong ? "font-semibold text-slate-950" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
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

function ErrorView({ message, courseId }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg font-bold text-rose-600">
          !
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        <Link
          to={`/student/courses/${courseId}`}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          Back to course
        </Link>
      </div>
    </div>
  );
}
