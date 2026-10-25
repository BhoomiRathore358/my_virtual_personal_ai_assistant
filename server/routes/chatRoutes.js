import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const r = express.Router();

// 🚀 FIXED MODEL: gemini-1.5-flash ki jagah hum up-to-date stable model name use kar rahe hain
const modelName = "gemini-2.0-flash"; // Yeh up-to-date stable prod model hai jo traffic handle kar lega



let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: modelName });
  }
} catch (err) {
  console.error("Gemini Initialization Error:", err.message);
}

r.post("/", authMiddleware, async (req, res) => {
  try {
    const { message: msg, conversationId: cid, fileData: fData, fileType: fType } = req.body;
    const uid = req.user.userId;
    
    let c = cid ? await Conversation.findOne({ _id: cid, userId: uid }) : null;
    if (!c) c = await Conversation.create({ userId: uid, messages: [] });

    let txt = msg?.trim() || "Sent an attachment";
    let reply = "";
    
    c.messages.push({ role: "user", content: txt });

    if (!ai || !process.env.GEMINI_API_KEY) {
      reply = "Hey! Backend aur frontend connect ho gaye hain, lekin Render par 'GEMINI_API_KEY' missing hai.";
    } else if (fData && fType) {
      try {
        const cleanBase64 = fData.replace(/^data:.*?;base64,/, "");
        const result = await ai.generateContent([
          txt, 
          { inlineData: { data: cleanBase64, mimeType: fType } }
        ]);
        reply = result.response.text();
      } catch (geminiErr) {
        console.error("Gemini Media Error:", geminiErr.message);
        reply = `[Gemini API Error]: ${geminiErr.message}.`;
      }
    } else {
      try {
        const hist = c.messages.slice(0, -1).map(m => `${m.role === "user" ? "User" : "Model"}: ${m.content}`).join("\n");
        const prompt = `${hist}\nUser: ${txt}\nModel:`;
        
        const result = await ai.generateContent(prompt);
        reply = result.response.text();
      } catch (geminiErr) {
        console.error("Gemini Text Error:", geminiErr.message);
        reply = `[Gemini API Error]: ${geminiErr.message}.`;
      }
    }

    const cleanReply = reply ? reply.trim() : "I couldn't process that request.";
    c.messages.push({ role: "assistant", content: cleanReply });
    await c.save();
    
    res.json({ success: true, conversationId: c._id, reply: cleanReply });
  } catch (e) { 
    console.error("Server Route Error:", e.message);
    res.status(500).json({ success: false, error: e.message }); 
  }
});

r.get("/history", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, conversations });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

r.get("/:id", authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.userId });
    res.json({ success: true, conversation });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

export default r;
