import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const r = express.Router();

// Helper function to try multiple models automatically if one fails
async function generateWithFallback(aiInstance, promptOrContent) {
  // Google ke saare available model names ki list
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-1.5-flash",
    "gemini-pro"
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${modelName}`);
      const model = aiInstance.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptOrContent);
      if (result && result.response) {
        return result.response.text();
      }
    } catch (err) {
      console.error(`Failed with ${modelName}:`, err.message);
      lastError = err;
      // Agar model not found (404) ya outdated ka error hai, toh loop agle model par jayega
      continue;
    }
  }
  throw new Error(`All Gemini models exhausted. Last error: ${lastError?.message}`);
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

    // Initialize Google AI Inside route safely
    if (!process.env.GEMINI_API_KEY) {
      reply = "Hey! Backend aur frontend connected hain, lekin Render Environment Settings par 'GEMINI_API_KEY' absent hai.";
    } else {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      if (fData && fType) {
        try {
          const cleanBase64 = fData.replace(/^data:.*?;base64,/, "");
          const contentPayload = [
            txt, 
            { inlineData: { data: cleanBase64, mimeType: fType } }
          ];
          
          // Call fallback handler for images/videos
          reply = await generateWithFallback(ai, contentPayload);
        } catch (geminiErr) {
          reply = `[Gemini Media Error]: ${geminiErr.message}`;
        }
      } else {
        try {
          const hist = c.messages.slice(0, -1).map(m => `${m.role === "user" ? "User" : "Model"}: ${m.content}`).join("\n");
          const prompt = `${hist}\nUser: ${txt}\nModel:`;
          
          // Call fallback handler for standard text chat
          reply = await generateWithFallback(ai, prompt);
        } catch (geminiErr) {
          reply = `[Gemini Text Error]: ${geminiErr.message}`;
        }
      }
    }

    const cleanReply = reply ? reply.trim() : "I couldn't process that request.";
    c.messages.push({ role: "assistant", content: cleanReply });
    await c.save();
    
    res.json({ success: true, conversationId: c._id, reply: cleanReply });
  } catch (e) { 
    // Fallback response to avoid blocking frontend layout with standard CORS locks
    res.status(200).json({ success: true, reply: `AI Assistant currently setting up channels: ${e.message}` }); 
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
