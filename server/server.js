import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// 1. SECURITY & CORS (SABSE UPAR)
// =========================
app.disable("x-powered-by");
app.use(helmet());

// ✅ CORRECTED: Sabhi origins open hain aur preflight auto-handle ho jayega
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request body limit setup
app.use(express.json({ limit: "10kb" }));

// =========================
// 2. MAIN ROUTING PRODUCTION LAYER
// =========================

// Basic Health Check Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Personal Assistant API is running perfectly",
  });
});

// Routes connection layering
app.use("/api/users/signup", userRoutes);
app.use("/api/users/login", userRoutes);

app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// =========================
// 3. 404 & FALLBACK ERROR HANDLERS
// =========================

// 404 Route NotFound Mapping
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Generic Global Server Error Fallback
app.use((err, req, res, next) => {
  console.error("Server error configuration:", err);
  res.status(500).json({
    message: "Internal server error",
  });
});

// =========================
// 4. SERVER RUN FUNCTION
// =========================
const startServer = async () => {
  try {
    // Database connectivity checkpoint call
    await connectDB();
    
    // Dynamic Production port check layer
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running perfectly on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
