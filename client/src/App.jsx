import { useEffect, useState, useRef } from "react";
import "./App.css";

const API_URL = ' https://my-virtual-personal-ai-assistant-7.onrender.com';

export default function App() {
  const [email, setEmail] = useState("test@example.com"), [password, setPassword] = useState("TestPassword123!"), [name, setName] = useState(""), [isSignupMode, setIsSignupMode] = useState(false), [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [message, setMessage] = useState(""), [messages, setMessages] = useState([]), [conversations, setConversations] = useState([]), [conversationId, setConversationId] = useState(null), [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null), [fileMime, setFileMime] = useState(""), [fileName, setFileName] = useState(""), [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null), recognitionRef = useRef(null);

  useEffect(() => { if (loggedIn) loadHistory(); }, [loggedIn]);

  const loadHistory = async () => {
    const res = await fetch(`${API_URL}/api/chat/history`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    const d = await res.json(); if (d.success) setConversations(d.conversations || []);
  };

  const handleAuth = async () => {
    const res = await fetch(`${API_URL}/api/users/${isSignupMode ? "signup" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isSignupMode ? { name, email, password } : { email, password }) });
    const d = await res.json(); if (!res.ok) return alert(d.message);
    if (isSignupMode) { setIsSignupMode(false); alert("Signup done!"); } else { localStorage.setItem("token", d.token); setLoggedIn(true); }
  };

  const openChat = async (id) => {
    const res = await fetch(`${API_URL}/api/chat/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    const d = await res.json(); setConversationId(id); setMessages(d.conversation?.messages || []);
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFileMime(f.type); setFileName(f.name);
    const r = new FileReader(); r.onloadend = () => setAttachedFile(r.result); r.readAsDataURL(f);
  };

  const handleMicrophone = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) return alert("Mic unsupported.");
    if (isRecording) return recognitionRef.current.stop();
    const rec = new Speech(); rec.lang = 'en-IN'; rec.onstart = () => setIsRecording(true); rec.onend = () => setIsRecording(false);
    rec.onresult = (e) => setMessage(e.results[0][0].transcript); recognitionRef.current = rec; rec.start();
  };

  const sendMessage = async () => {
    if (!message.trim() && !attachedFile) return;
    const userMsg = { role: "user", content: message.trim() || "Sent an attachment", file: attachedFile, fileType: fileMime };
    setMessages(p => [...p, userMsg]); setMessage(""); setAttachedFile(null); setFileName(""); setLoading(true);

    const res = await fetch(`${API_URL}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ message: userMsg.content, conversationId, fileData: userMsg.file, fileType: userMsg.fileType }) });
    const d = await res.json(); if (d.success) { setConversationId(d.conversationId); setMessages(p => [...p, { role: "assistant", content: d.reply }]); loadHistory(); }
    setLoading(false);
  };

  if (!loggedIn) return (
    <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="background-orb orb-one"></div>
      <div style={{ background: "rgba(12, 14, 27, 0.75)", padding: "40px", borderRadius: "24px", width: "350px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
        <h2>{isSignupMode ? "Create Account" : "AI Portal Login"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
          {isSignupMode && <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
          <button onClick={handleAuth} style={{ padding: "12px", background: "#8b5cf6", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "700" }}>{isSignupMode ? "Sign Up" : "Log In"}</button>
        </div>
        <p onClick={() => setIsSignupMode(!isSignupMode)} style={{ color: "#a5b4fc", marginTop: "20px", cursor: "pointer", fontSize: "13px" }}>{isSignupMode ? "Login here" : "Create profile"}</p>
      </div>
    </div>
  );

  return (
    <div className="app"><link rel="stylesheet" href="https://cloudflare.com" /><div className="background-orb orb-one"></div>
      <div className="sidebar" style={{ backdropFilter: "blur(10px)" }}>
        <h2>Neural Matrix</h2><button className="new-chat-button" onClick={() => { setConversationId(null); setMessages([]); }}>+ New Chat</button>
        <div className="conversation-list" style={{ marginTop: "20px" }}>
          {conversations.map(c => <button key={c._id} className={`conversation-item ${conversationId === c._id ? "active" : ""}`} onClick={() => openChat(c._id)}><i className="far fa-comment-alt" style={{ marginRight: "8px", color: "#06b6d4" }}></i>{c.messages?.[0]?.content?.substring(0, 14) || "Chat Log"}</button>)}
        </div>
        <button onClick={() => { localStorage.removeItem("token"); setLoggedIn(false); }} style={{ marginTop: "auto", background: "none", color: "#ff4664", border: "none", display: "flex", alignItems: "center", gap: "8px" }}><i className="fas fa-sign-out-alt"></i> Logout</button>
      </div>
      <div className="main-area">
        <div className="chat-container" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}>
            {messages.length === 0 ? <h1 style={{ textAlign: "center", marginTop: "100px", color: "#fff", fontWeight: "800" }}>What can I compute today?</h1> : 
              messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", margin: "12px 0" }}>
                  <div style={{ background: m.role === "user" ? "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.1))" : "rgba(255,255,255,0.04)", padding: "14px 20px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", maxWidth: "75%" }}>
                    {m.content}
                    {m.file && <div style={{ marginTop: "10px", borderRadius: "12px", overflow: "hidden", maxWidth: "250px" }}>{m.fileType?.startsWith("image/") ? <img src={m.file} style={{ width: "100%" }} /> : <video src={m.file} controls style={{ width: "100%" }} />}</div>}
                  </div>
                </div>
              ))
            }
            {loading && <div style={{ color: "#06b6d4", fontSize: "14px" }}>✦ AI is processing...</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(20, 24, 43, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "8px 18px", gap: "14px", marginBottom: "20px", backdropFilter: "blur(20px)" }}>
            <button onClick={() => fileInputRef.current.click()} style={{ background: "none", border: "none", color: "#81879e", fontSize: "18px" }}><i className="fas fa-paperclip"></i></button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" style={{ display: "none" }} />
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask anything..." style={{ flex: 1, background: "none", border: "none", color: "#fff", outline: "none", fontSize: "15px" }} />
            <button onClick={handleMicrophone} style={{ background: isRecording ? "rgba(255,70,100,0.2)" : "none", border: "none", color: isRecording ? "#ff4664" : "#81879e", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}><i className={`fas fa-microphone ${isRecording ? "animate-pulse" : ""}`}></i></button>
            <button onClick={sendMessage} disabled={!message.trim() && !attachedFile} style={{ background: (message.trim() || attachedFile) ? "linear-gradient(135deg, #06b6d4, #3b82f6)" : "rgba(255,255,255,0.03)", color: (message.trim() || attachedFile) ? "#fff" : "#444", border: "none", borderRadius: "12px", padding: "8px 16px", fontWeight: "700" }}><i className="fas fa-paper-plane"></i></button>
          </div>
          {fileName && <div style={{ color: "#06b6d4", fontSize: "12px", marginBottom: "15px", paddingLeft: "10px" }}>✓ Staged: {fileName} <span style={{ cursor: "pointer", color: "#ff4664", marginLeft: "5px" }} onClick={() => { setAttachedFile(null); setFileName(""); }}>✕</span></div>}
        </div>
      </div>
    </div>
  );
}
