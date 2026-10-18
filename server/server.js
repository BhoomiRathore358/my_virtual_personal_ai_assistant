import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// 1. CORS AUR SECURITY (SABSE UPAR)
// =========================
app.disable("x-powered-by");
app.use(helmet());

// ✅ FIX: Hamne star (*) laga diya hai taaki Vercel se aane wali koi bhi request block na ho
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));

// =========================
// 2. RATE LIMITING
// =========================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Try again later.",
  },
});

// =========================
// 3. ROUTES
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Personal Assistant API is running",
  });
});

app.use("/api/users/signup", authLimiter, userRoutes);
app.use("/api/users/login", authLimiter, userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// 404 Route
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// =========================
// 4. START SERVER
// =========================
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running perfectly on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
