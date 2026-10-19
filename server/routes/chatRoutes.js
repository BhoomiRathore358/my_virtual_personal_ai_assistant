// ==========================================
// 📄 PATH: server/routes/chatRoutes.js
// ==========================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const r = express.Router(), ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });

r.post("/", authMiddleware, async (req, res) => {
  try {
    const { message: msg, conversationId: cid, fileData: fData, fileType: fType } = req.body, uid = req.user.userId;
    let c = cid ? await Conversation.findOne({ _id: cid, userId: uid }) : null;
    if (!c) c = await Conversation.create({ userId: uid, messages: [] });

    let txt = msg?.trim() || "Sent a media attachment", reply = "";
    c.messages.push({ role: "user", content: txt });

    if (fData && fType) {
      const media = { inlineData: { data: fData.replace(/^data:.*?;base64,/, ""), mimeType: fType } };
      reply = (await ai.generateContent([txt, media])).response.text();
    } else {
      const hist = c.messages.slice(0, -1).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      reply = (await ai.startChat({ history: hist }).sendMessage(txt)).response.text();
    }

    c.messages.push({ role: "assistant", content: await reply });
    await c.save();
    res.json({ success: true, conversationId: c._id, reply: await reply });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

r.get("/history", authMiddleware, async (req, res) => res.json({ success: true, conversations: await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 }) }));
r.get("/:id", authMiddleware, async (req, res) => res.json({ success: true, conversation: await Conversation.findOne({ _id: req.params.id, userId: req.user.userId }) }));
export default r;
