import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenAI } from "@google/generative-ai"; // Gemini package

const router = express.Router();

// Render ke environment variable se API KEY uthayega
const aiAPIKey = process.env.GEMINI_API_KEY;

// =====================================================
// SEND MESSAGE (POST /api/chat)
// =====================================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const cleanMessage = message.trim();
    const userId = req.user.userId;
    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    }

    if (!conversation) {
      conversation = await Conversation.create({ userId, messages: [] });
    }

    // User ka message database me save kiya
    conversation.messages.push({ role: "user", content: cleanMessage });

    // API Key Validation Check
    if (!aiAPIKey) {
      console.error("GEMINI_API_KEY is missing in Render environment variables!");
      return res.status(500).json({ message: "AI Configuration error on server" });
    }

    // =================================================
    // CALL GEMINI CLOUD AI
    // =================================================
    const ai = new GoogleGenAI({ apiKey: aiAPIKey });
    
    // Purani chat history ko Gemini ke format me convert kiya
    const history = conversation.messages.slice(0, -1).map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

    // Chat session system instruction ke sath start kiya
    const chat = ai.chats.create({
      model: "gemini-1.5-flash", // Fast aur Free model
      history: history,
      config: {
        systemInstruction: "You are a helpful private personal AI assistant. Be clear, concise, safe and respectful."
      }
    });

    const result = await chat.sendMessage({ message: cleanMessage });
    const assistantMessage = result.text;

    if (!assistantMessage) {
      return res.status(502).json({ message: "AI did not return a valid response" });
    }

    // AI ka response database me save kiya
    conversation.messages.push({ role: "assistant", content: assistantMessage.trim() });
    await conversation.save();

    return res.status(200).json({
      message: "AI response generated",
      conversationId: conversation._id,
      reply: assistantMessage.trim(),
    });

  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ message: "AI request failed" });
  }
});

// =====================================================
// GET ALL CHAT HISTORY (GET /api/chat/history)
// =====================================================
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id messages createdAt updatedAt");

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ message: "Failed to load chat history" });
  }
});

// GET ONE CONVERSATION
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.userId }).select("_id messages createdAt updatedAt");
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    return res.status(200).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load conversation" });
  }
});

// DELETE CONVERSATION
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    return res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete conversation" });
  }
});

export default router;
