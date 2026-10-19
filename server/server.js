import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" })); // Photos/Videos ke liye safe limit

app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => res.json({ success: true, message: "API Running" }));

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => console.log("Backend Server Live"));
});
