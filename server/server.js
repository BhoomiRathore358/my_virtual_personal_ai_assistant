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
// SECURITY
// =========================

app.disable("x-powered-by");

app.use(helmet());

// ✅ FIX: Hamne aapka exact aur asli live Vercel link yahan set kar diya hai
app.use(
  cors({
    origin: [
      "https://my-virtual-personal-ai-assistant.vercel.app", // Aapka asli frontend live URL
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Pre-flight fallback check handles options safe bypass
app.options("*", cors());

// Request body limit
app.use(
  express.json({
    limit: "10kb",
  })
);

// =========================
// RATE LIMITING
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
// BASIC ROUTE
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Personal Assistant API is running",
  });
});

// =========================
// AUTH ROUTES
// =========================

app.use("/api/users/signup", authLimiter, userRoutes);
app.use("/api/users/login", authLimiter, userRoutes);

app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// =========================
// 404
// =========================

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    message: "Internal server error",
  });
});

// =========================
// START SERVER
// =========================

const startServer = async () => {
  try {
    await connectDB();

    // ✅ FIX: '127.0.0.1' hata kar '0.0.0.0' set kar diya hai taaki Render live ho sake
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running perfectly on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();


