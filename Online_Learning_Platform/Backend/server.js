import exp from 'express'
import {config} from 'dotenv'
import {connect} from 'mongoose'
import cors from 'cors';

import {studentApp} from "./APIs/StudentAPI.js";
import {instructorApp} from "./APIs/InstructorAPI.js";
import {adminApp} from "./APIs/AdminAPI.js";
import {commonApp} from "./APIs/CommonAPI.js";

config();

const app = exp();

// CORS — dynamic origin, reads FRONTEND_URL from env
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    // Allow requests with no origin (curl, Postman, Render health checks)
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(exp.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "OLP API is running",
    routes: ["/auth", "/student-api", "/instructor-api", "/admin-api"],
  });
});

// Path-level middleware
app.use("/student-api", studentApp);
app.use("/instructor-api", instructorApp);
app.use("/admin-api", adminApp);
app.use("/auth", commonApp);

// 404 handler — after all routes
app.use((req, res) => {
  res.status(404).json({ message: `Path ${req.url} is Invalid` });
});

// Global error handler — must be last
app.use((err, req, res, next) => {
  console.error("Error name:", err.name);
  console.error("Error code:", err.code);
  console.error("Full error:", JSON.stringify(err, null, 2));

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }

  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = Object.keys(keyValue)[0];
    const value = keyValue[field];
    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`,
    });
  }

  // FIX: Handle multer file-type rejection (err.status set in multer.js fileFilter)
  if (err.status === 400 && err.message) {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }

  res.status(500).json({ message: "error occurred", error: "Server side error" });
});

// Connect to DB, then start server
// FIX: Bind explicitly to '0.0.0.0' so Render's health-check port scanner can reach it
// on all network interfaces (IPv4 and IPv6). Without this, on some Render instances
// Node binds only to IPv6 '::' and the health check on IPv4 times out.
const connectDB = async () => {
  try {
    await connect(process.env.DB_URL);
    console.log("DB Server connected");
    const port = process.env.PORT || 1935;
    app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}...`));
  } catch (err) {
    console.error("Error connecting to DB:", err.message);
    process.exit(1);
  }
};

connectDB();
