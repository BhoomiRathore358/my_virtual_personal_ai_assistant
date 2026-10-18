import { useEffect, useState } from "react";
import "./App.css";

const API_URL = 'https://my-virtual-personal-ai-assistant-7.onrender.com';

function App() {
  // ✅ SIGNUP / LOGIN MODE STATES
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("TestPassword123!");

  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (loggedIn) loadHistory(); }, [loggedIn]);

  const loadHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setHistoryLoading(true);
      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setConversations(data.conversations || []);
    } catch (err) { console.error(err); } finally { setHistoryLoading(false); }
  };

  // ✅ DYNAMIC AUTHENTICATION (LOGIN & REGISTER)
  const login = async () => {
    try {
      setError("");
      const endpoint = isLogin ? "/api/users/login" : "/api/users/signup";
      const payload = isLogin ? { email, password } : { name, email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed");

      localStorage.setItem("token", data.token);
      setLoggedIn(true);
      setError("");
    } catch (err) { setError(err.message); }
  };

  const openConversation = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setError("");
      const response = await fetch(`${API_URL}/api/chat/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) { setConversationId(id); setMessages(data.conversation?.messages || []); }
    } catch (err) { setError(err.message); }
  };

  const newChat = () => { setConversationId(null); setMessages([]); setMessage(""); setError(""); };

  const sendMessage = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || loading) return;
    const token = localStorage.getItem("token");

    setMessages((prev) => [...prev, { role: "user", content: cleanMessage }]);
    setMessage(""); setLoading(true); setError("");

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: cleanMessage, conversationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "AI failed");

      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      await loadHistory();
    } catch (err) { setError(err.message); setMessages((prev) => prev.slice(0, -1)); } finally { setLoading(false); }
  };

  const deleteConversation = async (id, event) => {
    event.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/chat/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (conversationId === id) newChat();
      }
    } catch (err) { setError(err.message); }
  };

  const logout = () => { localStorage.removeItem("token"); setLoggedIn(false); setMessages([]); setConversations([]); setConversationId(null); setMessage(""); setError(""); };
  const useSuggestion = (text) => { setMessage(text); setTimeout(() => { document.querySelector(".message-input")?.focus(); }, 50); };

  // =====================================================
  // 🔐 AAPKA ORIGINAL GLOWING LOGIN UI (100% PRESERVED)
  // =====================================================
  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-glow glow-one"></div>
        <div className="login-glow glow-two"></div>
        <div className="login-card">
          <div className="ai-logo large-logo">✦</div>
          <span className="small-label">PRIVATE AI</span>
          <h1>Your Personal<span> AI Assistant</span></h1>
          <p className="login-description">A private AI assistant powered by cloud architecture setup.</p>
          <div className="form">
            {!isLogin && (
              <><label>Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" /></>
            )}
            <label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
            <label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" onKeyDown={(e) => e.key === "Enter" && login()} />
            <button className="primary-button" onClick={login}>{isLogin ? "Enter Assistant" : "Create Account 🚀"}</button>
          </div>
          <p onClick={() => { setIsLogin(!isLogin); setError(""); }} style={{ cursor: "pointer", marginTop: "15px", color: "#6e62e4", textDecoration: "underline", fontSize: "14px", textAlign: "center" }}>
            {isLogin ? "New user? Click here to Signup / Register" : "Already registered? Switch to Login"}
          </p>
          {error && <div className="error-box">{error}</div>}
          <div className="privacy-note"><span>🔒</span>Your conversations stay secure on the cloud server.</div>
        </div>
      </div>
    );
  }

  // =====================================================
  // 🤖 AAPKA ORIGINAL CHAT PAGE UI (100% PRESERVED)
  // =====================================================
  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header"><div className="ai-logo small-logo">✦</div><h2>Conversations</h2></div>
        <button className="new-chat-button" onClick={newChat}><span>+</span> New Chat</button>
        <div className="conversations-list">
          {historyLoading ? (
            <div className="sidebar-loading">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="no-history">No recent chats</div>
          ) : (
            conversations.map((conv) => (
              <div key={conv._id} className={`conversation-item ${conversationId === conv._id ? "active" : ""}`} onClick={() => openConversation(conv._id)}>
                <span className="chat-icon">💬</span><span className="conversation-title">{conv.title || "Untitled Chat"}</span>
                <button className="delete-button" onClick={(e) => deleteConversation(conv._id, e)}>✕</button>
              </div>
            ))
          )}
        </div>
        <div className="sidebar-footer"><button className="logout-button" onClick={logout}><span>Logout</span><span>🚪</span></button></div>
      </div>
      <div className="chat-area">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <h1>What can I help with<span> today?</span></h1>
            <div className="suggestions">
              <div className="suggestion-card" onClick={() => useSuggestion("Explain Quantum Computing in simple terms")}><h3>Explain Quantum Computing</h3><p>in simple terms</p></div>
              <div className="suggestion-card" onClick={() => useSuggestion("Write a Python script to scrape data from a website")}><h3>Write a Python script</h3><p>to scrape data from a website</p></div>
              <div className="suggestion-card" onClick={() => useSuggestion("Give me ideas for a cozy weekend getaway")}><h3>Give me ideas</h3><p>for a cozy weekend getaway</p></div>
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role}`}><div className="message-avatar">{msg.role === "user" ? "👤" : "✦"}</div><div className="message-content">{msg.content}</div></div>
            ))}
            {loading && (
              <div className="message-row assistant loading"><div className="message-avatar">✦</div><div className="message-content"><div className="typing-indicator"><span></span><span></span><span></span></div></div></div>
            )}
          </div>
        )}
        {error && <div className="error-banner"><span>⚠️</span> {error}</div>}
        <div className="input-container">
          <div className="input-box">
            <input type="text" className="message-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask Private AI anything..." onKeyDown={(e) => { if (e.key === "Enter" && !loading) sendMessage(); }} disabled={loading} />
            <button className="send-button" onClick={sendMessage} disabled={!message.trim() || loading}><span>↑</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
