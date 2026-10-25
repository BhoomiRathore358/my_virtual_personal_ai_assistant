import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

// Secure CORS configuration
app.use(cors({ 
  origin: "*", // Vercel connection block na ho isliye, credentials ke sath '*' safe hai agar allowedHeaders explicit ho.
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Safe storage limit for photos and videos
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => res.json({ success: true, message: "API Running" }));

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Backend Server Live on port ${PORT}`));
});
