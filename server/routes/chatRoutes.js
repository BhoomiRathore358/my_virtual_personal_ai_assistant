import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const r = express.Router();

// 🔑 APNI GEMINI KEY YAHAN DIRECT PASTE KAREIN
// (Jaise: "AIzaSy...") Dhyan rakhein ki quotes "" ke andar ho.
const MY_SECRET_KEY= "YAHAN_APNI_GEMINI_KEY_PASTE_KAREIN";


let ai = null;
try {
  // Agar Render env mein key hai toh use karein, nahi toh hamari direct key use karein
  const finalKey = process.env.GEMINI_API_KEY || MY_SECRET_KEY;
  
  if (finalKey && !finalKey.includes("YAHAN_APNI")) {
    ai = new GoogleGenerativeAI(finalKey).getGenerativeModel({ model: "gemini-1.5-flash" });
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

    // Agar dono jagah key nahi milti tabhi yeh backup response chalega
    if (!ai) {
      reply = "Hey! Backend aur frontend connect hain, par lagta hai code mein abhi bhi API Key sahi se nahi pahuche. Kripya chatRoutes.js mein line number 9 par apni key check karein.";
    } else if (fData && fType) {
      try {
        const cleanBase64 = fData.replace(/^data:.*?;base64,/, "");
        const result = await ai.generateContent([
          txt, 
          { inlineData: { data: cleanBase64, mimeType: fType } }
        ]);
        reply = result.response.text();
      } catch (geminiErr) {
        reply = `[Gemini API Error]: ${geminiErr.message}.`;
      }
    } else {
      try {
        const hist = c.messages.slice(0, -1).map(m => `${m.role === "user" ? "User" : "Model"}: ${m.content}`).join("\n");
        const prompt = `${hist}\nUser: ${txt}\nModel:`;
        
        const result = await ai.generateContent(prompt);
        reply = result.response.text();
      } catch (geminiErr) {
        reply = `[Gemini API Error]: ${geminiErr.message}.`;
      }
    }

    const cleanReply = reply ? reply.trim() : "I couldn't process that request.";
    c.messages.push({ role: "assistant", content: cleanReply });
    await c.save();
    
    res.json({ success: true, conversationId: c._id, reply: cleanReply });
  } catch (e) { 
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

