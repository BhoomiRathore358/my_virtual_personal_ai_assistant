import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router(), model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, conversationId, fileData, fileType } = req.body, userId = req.user.userId;
    let conv = conversationId ? await Conversation.findOne({ _id: conversationId, userId }) : null;
    if (!conv) conv = await Conversation.create({ userId, messages: [] });

    let txt = message?.trim() || "Sent a media attachment", reply = "";
    conv.messages.push({ role: "user", content: txt });

    if (fileData && fileType) {
      const media = { inlineData: { data: fileData.replace(/^data:.*?;base64,/, ""), mimeType: fileType } };
      reply = (await model.generateContent([txt, media])).response.text();
    } else {
      const history = conv.messages.slice(0, -1).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      reply = (await model.startChat({ history }).sendMessage(txt)).response.text();
    }

    conv.messages.push({ role: "assistant", content: await reply });
    await conv.save();
    res.json({ success: true, conversationId: conv._id, reply: await reply });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get("/history", authMiddleware, async (req, res) => res.json({ success: true, conversations: await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 }) }));
router.get("/:id", authMiddleware, async (req, res) => res.json({ success: true, conversation: await Conversation.findOne({ _id: req.params.id, userId: req.user.userId }) }));
export default router;
