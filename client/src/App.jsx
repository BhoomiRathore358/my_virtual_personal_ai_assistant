import { useEffect, useState, useRef } from "react";
import "./App.css";

const API_URL = ' https://my-virtual-personal-ai-assistant-7.onrender.com';

function App() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("TestPassword123!");
  const [name, setName] = useState(""); 
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [attachedFile, setAttachedFile] = useState(null);
  const [fileMime, setFileMime] = useState("");
  const [fileName, setFileName] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { if (loggedIn) loadHistory(); }, [loggedIn]);

  const loadHistory = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/chat/history`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setConversations(data.conversations || []);
  };

  const handleAuth = async () => {
    const endpoint = isSignupMode ? "/api/users/signup" : "/api/users/login";
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isSignupMode ? { name, email, password } : { email, password }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.message);
    if (isSignupMode) { setIsSignupMode(false); alert("Signup success! Please login."); } 
    else { localStorage.setItem("token", data.token); setLoggedIn(true); }
  };

  const openConversation = async (id) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/chat/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setConversationId(id);
    setMessages(data.conversation?.messages || []);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileMime(file.type);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setAttachedFile(reader.result);
    reader.readAsDataURL(file);
  };

  const handleMicrophone = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return alert("Microphone not supported on this browser.");
    if (isRecording) return recognitionRef.current.stop();

    const rec = new Speech();
    rec.lang = 'en-IN';
    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onresult = (e) => setMessage(e.results[0][0].transcript);
    recognitionRef.current = rec;
    rec.start();
  };

  const sendMessage = async () => {
    if (!message.trim() && !attachedFile) return;
    const token = localStorage.getItem("token");
    const userMsg = { role: "user", content: message.trim() || "Sent an attachment", file: attachedFile, fileType: fileMime };
    
    setMessages(p => [...p, userMsg]);
    setMessage(""); setAttachedFile(null); setFileName(""); setLoading(true);

    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: userMsg.content, conversationId, fileData: userMsg.file, fileType: userMsg.fileType }),
    });
    const data = await res.json();
    if (data.success) {
      setConversationId(data.conversationId);
      setMessages(p => [...p, { role: "assistant", content: data.reply }]);
      loadHistory();
    }
    setLoading(false);
  };

  if (!loggedIn) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="background-orb orb-one"></div>
        <div style={{ background: "rgba(12, 14, 27, 0.75)", padding: "40px", borderRadius: "24px", width: "350px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", textAlign: "center" }}>
          <h2>{isSignupMode ? "Create Account" : "AI Portal Login"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
            {isSignupMode && <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
            <button onClick={handleAuth} style={{ padding: "12px", background: "#8b5cf6", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>{isSignupMode ? "Sign Up" : "Log In"}</button>
          </div>
          <p onClick={() => setIsSignupMode(!isSignupMode)} style={{ color: "#a5b4fc", marginTop: "20px", cursor: "pointer", fontSize: "13px" }}>{isSignupMode ? "Have account? Login" : "New framework? Create profile"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="background-orb orb-one"></div>
      <div className="sidebar" style={{ backdropFilter: "blur(10px)" }}>
        <h2>Neural Matrix</h2>
        <button className="new-chat-button" onClick={() => { setConversationId(null); setMessages([]); }}>+ New Chat</button>
        <div className="conversation-list" style={{ marginTop: "20px" }}>
          {conversations.map(c => (
            <button key={c._id} className={`conversation-item ${conversationId === c._id ? "active" : ""}`} onClick={() => openConversation(c._id)}>
              💬 {c.messages && c.messages.length > 0 ? c.messages[0].content?.substring(0, 18) : "Media Stream"}
            </button>
          ))}
        </div>
        <button onClick={() => { localStorage.removeItem("token"); setLoggedIn(false); }} style={{ marginTop: "auto", background: "none", color: "#ff4664", border: "none", cursor: "pointer" }}>Logout 🚪</button>
      </div>

      <div className="main-area">
        <div className="chat-container" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}>
            {messages.length === 0 ? <h1 style={{ textAlign: "center", marginTop: "100px" }}>What can I process today?</h1> : 
              messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", margin: "10px 0" }}>
                  <div style={{ background: m.role === "user" ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)", padding: "12px 18px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", color: "#fff", maxWidth: "75%" }}>
                    {m.content}
                    {m.file && (
                      <div style={{ marginTop: "10px", borderRadius: "8px", overflow: "hidden", maxWidth: "250px" }}>
                        {m.fileType?.startsWith("image/") ? <img src={m.file} style={{ width: "100%" }} /> : <video src={m.file} controls style={{ width: "100%" }} />}
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
            {loading && <div style={{ color: "#06b6d4" }}>✦ AI Engine computing response...</div>}
          </div>

          <div style={{ display: "flex", alignItems: "center", background: "rgba(12,14,27,0.4)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "10px", gap: "10px", marginBottom: "20px" }}>
            <button onClick={() => fileInputRef.current.click()} style={{ background: "none", border: "none", cursor: "pointer" }}>📎</button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" style={{ display: "none" }} />
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask anything..." style={{ flex: 1, background: "none", border: "none", color: "#fff", outline: "none" }} />
            <button onClick={handleMicrophone} style={{ background: isRecording ? "#ff4664" : "none", border: "none", color: "#fff", borderRadius: "50%", cursor: "pointer" }}>🎙️</button>
            <button onClick={sendMessage} style={{ background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>Send</button>
          </div>
          {fileName && <div style={{ color: "#06b6d4", fontSize: "11px", marginBottom: "10px" }}>✓ Staged: {fileName} <span style={{ cursor: "pointer", color: "#ff4664", marginLeft: "5px" }} onClick={() => { setAttachedFile(null); setFileName(""); }}>✕</span></div>}
        </div>
      </div>
    </div>
  );
}
export default App;
