import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const hasCertificateAccess = (enrollment) => {
  const coursePrice = Number(enrollment?.course?.price || 0);
  const payment = enrollment?.payment;
  const paymentAmount = typeof payment === "object" ? Number(payment?.amount || 0) : 0;
  const paymentStatus = typeof payment === "object" ? payment?.status : null;

  return coursePrice > 0 || (paymentAmount > 0 && paymentStatus === "SUCCESS");
};

export default function Certificate() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const res = await fetch("/student-api/course", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load certificate");

        const found = (data.payload || []).find((item) => (item.course?._id ?? item.course) === courseId);
        if (!found) throw new Error("Course enrollment not found");
        if (found.status !== "Completed") {
          navigate(`/student/learn/${courseId}`);
          return;
        }
        if (!hasCertificateAccess(found)) {
          navigate(`/student/payment/${courseId}`, { state: { certificate: true } });
          return;
        }
        setEnrollment(found);
      } catch (err) {
        setError(err.message || "Failed to load certificate");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [courseId, navigate]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="app-loader" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-page">
        <section className="app-container-sm">
          <div className="app-error">{error}</div>
        </section>
      </main>
    );
  }

  const course = enrollment?.course;
  const studentName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";
  const completedDate = enrollment?.updatedAt ? new Date(enrollment.updatedAt).toLocaleDateString() : "Recently";
  const certificateId = `LH-${courseId.slice(-6).toUpperCase()}-${(enrollment?._id || "").slice(-6).toUpperCase()}`;

  const handleDownload = async () => {
    setDownloading(true);
    setError("");

    try {
      await downloadCertificatePng({
        studentName,
        courseTitle: course?.title || "Course",
        category: course?.category || "Course",
        completedDate,
        certificateId,
      });
    } catch (err) {
      setError(err.message || "Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white">
      <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between print:hidden">
        <Link to="/student/dashboard" className="text-sm font-bold text-blue-700">
          Back to dashboard
        </Link>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={handleDownload} disabled={downloading} className="app-button-secondary">
            {downloading ? "Downloading..." : "Download PNG"}
          </button>
          <button type="button" onClick={() => window.print()} className="app-button-primary">
            Print
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-5xl border-[10px] border-slate-900 bg-white p-10 shadow-xl print:shadow-none">
        <div className="border-2 border-slate-300 px-8 py-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">Certificate of Completion</p>
          <h1 className="mt-8 text-5xl font-black text-slate-950">LearnHub</h1>
          <p className="mt-8 text-lg text-slate-600">This certificate is proudly presented to</p>
          <h2 className="mt-4 text-4xl font-black text-slate-950">{studentName}</h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-700">
            for successfully completing the course
          </p>
          <h3 className="mx-auto mt-4 max-w-3xl text-3xl font-black text-blue-700">{course?.title}</h3>

          <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
            <CertificateMeta label="Category" value={course?.category || "Course"} />
            <CertificateMeta label="Completed On" value={completedDate} />
            <CertificateMeta label="Certificate ID" value={certificateId} />
          </div>
        </div>
      </section>
    </main>
  );
}

function CertificateMeta({ label, value }) {
  return (
    <div className="border-t border-slate-300 pt-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapText(text, maxLength) {
  const words = String(text).split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = nextLine;
  });

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
}

function createCertificateSvg({ studentName, courseTitle, category, completedDate, certificateId }) {
  const titleLines = wrapText(courseTitle, 42);
  const firstTitleY = titleLines.length === 1 ? 600 : 570;
  const titleText = titleLines
    .map((line, index) => (
      `<text x="800" y="${firstTitleY + index * 48}" text-anchor="middle" class="course-title">${escapeXml(line)}</text>`
    ))
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
      <style>
        .eyebrow { font: 700 26px Arial, sans-serif; letter-spacing: 8px; fill: #1d4ed8; }
        .brand { font: 900 92px Arial, sans-serif; fill: #020617; }
        .body { font: 400 34px Arial, sans-serif; fill: #475569; }
        .name { font: 900 70px Arial, sans-serif; fill: #020617; }
        .course-title { font: 900 44px Arial, sans-serif; fill: #1d4ed8; }
        .meta-label { font: 700 20px Arial, sans-serif; letter-spacing: 5px; fill: #64748b; }
        .meta-value { font: 700 26px Arial, sans-serif; fill: #020617; }
      </style>
      <rect width="1600" height="1100" fill="#ffffff"/>
      <rect x="45" y="45" width="1510" height="1010" fill="none" stroke="#020617" stroke-width="28"/>
      <rect x="105" y="105" width="1390" height="890" fill="none" stroke="#cbd5e1" stroke-width="4"/>
      <text x="800" y="205" text-anchor="middle" class="eyebrow">CERTIFICATE OF COMPLETION</text>
      <text x="800" y="335" text-anchor="middle" class="brand">LearnHub</text>
      <text x="800" y="445" text-anchor="middle" class="body">This certificate is proudly presented to</text>
      <text x="800" y="525" text-anchor="middle" class="name">${escapeXml(studentName)}</text>
      <text x="800" y="${titleLines.length > 2 ? 705 : 690}" text-anchor="middle" class="body">for successfully completing the course</text>
      ${titleText}
      <line x1="190" y1="850" x2="520" y2="850" stroke="#cbd5e1" stroke-width="3"/>
      <line x1="635" y1="850" x2="965" y2="850" stroke="#cbd5e1" stroke-width="3"/>
      <line x1="1080" y1="850" x2="1410" y2="850" stroke="#cbd5e1" stroke-width="3"/>
      <text x="190" y="900" class="meta-label">CATEGORY</text>
      <text x="190" y="945" class="meta-value">${escapeXml(category)}</text>
      <text x="635" y="900" class="meta-label">COMPLETED ON</text>
      <text x="635" y="945" class="meta-value">${escapeXml(completedDate)}</text>
      <text x="1080" y="900" class="meta-label">CERTIFICATE ID</text>
      <text x="1080" y="945" class="meta-value">${escapeXml(certificateId)}</text>
    </svg>
  `;
}

function downloadCertificatePng(certificate) {
  return new Promise((resolve, reject) => {
    const svg = createCertificateSvg(certificate);
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1100;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Unable to create certificate image"));
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${certificate.certificateId}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        resolve();
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to render certificate image"));
    };

    image.src = url;
  });
}
