import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const OLLAMA_MODEL = "llama3.2:3b";

// =====================================================
// SEND MESSAGE
// POST /api/chat
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const cleanMessage = message.trim();

    // Maximum message length
    if (cleanMessage.length > 4000) {
      return res.status(400).json({
        message: "Message is too long",
      });
    }

    // Logged-in user
    const userId = req.user.userId;

    let conversation;

    // =================================================
    // EXISTING CONVERSATION
    // =================================================

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });

      if (!conversation) {
        return res.status(404).json({
          message: "Conversation not found",
        });
      }
    }

    // =================================================
    // CREATE NEW CONVERSATION
    // =================================================

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        messages: [],
      });
    }

    // =================================================
    // SAVE USER MESSAGE
    // =================================================

    conversation.messages.push({
      role: "user",
      content: cleanMessage,
    });

    // =================================================
    // PREPARE CONTEXT FOR OLLAMA
    // =================================================

    const messages = conversation.messages
      .slice(-20)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    // =================================================
    // CALL LOCAL OLLAMA
    // =================================================

    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful private personal AI assistant. Be clear, concise, safe and respectful.",
          },
          ...messages,
        ],
        stream: false,
      }),
    });

    // =================================================
    // OLLAMA ERROR
    // =================================================

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      console.error("Ollama error:", errorText);

      return res.status(502).json({
        message: "Local AI service unavailable",
      });
    }

    // =================================================
    // READ AI RESPONSE
    // =================================================

    const aiData = await ollamaResponse.json();

    const assistantMessage = aiData?.message?.content;

    if (
      typeof assistantMessage !== "string" ||
      !assistantMessage.trim()
    ) {
      return res.status(502).json({
        message: "AI did not return a valid response",
      });
    }

    // =================================================
    // SAVE AI RESPONSE
    // =================================================

    conversation.messages.push({
      role: "assistant",
      content: assistantMessage.trim(),
    });

    await conversation.save();

    // =================================================
    // SEND RESPONSE
    // =================================================

    return res.status(200).json({
      message: "AI response generated",
      conversationId: conversation._id,
      reply: assistantMessage.trim(),
    });
  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      message: "AI request failed",
    });
  }
});

// =====================================================
// GET ALL CHAT HISTORY
// GET /api/chat/history
// =====================================================

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      userId,
    })
      .sort({ updatedAt: -1 })
      .select("_id messages createdAt updatedAt");

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      message: "Failed to load chat history",
    });
  }
});

// =====================================================
// GET ONE CONVERSATION
// GET /api/chat/:id
// =====================================================

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).select("_id messages createdAt updatedAt");

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      message: "Failed to load conversation",
    });
  }
});

// =====================================================
// DELETE ONE CONVERSATION
// DELETE /api/chat/:id
// =====================================================

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    return res.status(500).json({
      message: "Failed to delete conversation",
    });
  }
});

export default router;