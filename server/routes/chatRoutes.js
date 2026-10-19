import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId, fileData, fileType } = req.body;
    const userId = req.user.userId; // Matches Token Key Mappings
    
    let conversation = conversationId ? await Conversation.findOne({ _id: conversationId, userId }) : null;
    if (!conversation) conversation = await Conversation.create({ userId, messages: [] });

    let userText = message?.trim() || "Sent an attachment";
    conversation.messages.push({ role: "user", content: userText });

    let aiReply = "";
    if (fileData && fileType) {
      const base64 = fileData.replace(/^data:.*?;base64,/, "");
      const mediaPart = { inlineData: { data: base64, mimeType: fileType } };
      const result = await model.generateContent([userText, mediaPart]);
      aiReply = await result.response.text();
    } else {
      const history = conversation.messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      aiReply = await result.response.text();
    }

    conversation.messages.push({ role: "assistant", content: aiReply.trim() });
    await conversation.save();

    res.json({ success: true, conversationId: conversation._id, reply: aiReply.trim() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/history", authMiddleware, async (req, res) => {
  const conversations = await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
  res.json({ success: true, conversations });
});
export default router;
