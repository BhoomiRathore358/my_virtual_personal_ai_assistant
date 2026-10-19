import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
//  YEH SAHI HAI (Official SDK Syntax)
//  YEH SAHI HAI (Official SDK Syntax)
import { GoogleGenerativeAI } from "@google/generative-ai";
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/chat - Message bhejna
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: "Message is required" });

    const cleanMessage = message.trim();
    const userId = req.user.userId;
    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }
    if (!conversation) {
      conversation = await Conversation.create({ userId, messages: [] });
    }

    conversation.messages.push({ role: "user", content: cleanMessage });

    if (!aiAPIKey) return res.status(500).json({ message: "AI API Key missing on server" });

    const ai = new GoogleGenAI({ apiKey: aiAPIKey });
    const history = conversation.messages.slice(0, -1).map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

    const chat = ai.chats.create({
      model: "gemini-1.5-flash",
      history: history,
      config: { systemInstruction: "You are a helpful personal AI assistant." }
    });

    const result = await chat.sendMessage({ message: cleanMessage });
    const assistantMessage = result.text;

    conversation.messages.push({ role: "assistant", content: assistantMessage.trim() });
    await conversation.save();

    return res.status(200).json({
      message: "AI response generated",
      conversationId: conversation._id,
      reply: assistantMessage.trim(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "AI request failed" });
  }
});

// GET /api/chat/history - Chat history load karna
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load history" });
  }
});

// GET /api/chat/:id - Ek chat kholna
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.userId });
    return res.status(200).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load conversation" });
  }
});

export default router;
