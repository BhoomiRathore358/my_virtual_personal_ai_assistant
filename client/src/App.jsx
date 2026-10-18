import { useEffect, useState } from "react";
import "./App.css";

const API_URL = 'https://onrender.com';

function App() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("TestPassword123!");
  const [name, setName] = useState(""); 
  const [isSignupMode, setIsSignupMode] = useState(false); // Form switch state
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loggedIn) loadHistory();
  }, [loggedIn]);

  const loadHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setHistoryLoading(true);
      const response = await fetch(`${API_URL}/api/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAuth = async () => {
    try {
      setError("");
      const endpoint = isSignupMode ? "/api/users/signup" : "/api/users/login";
      const bodyData = isSignupMode ? { name, email, password } : { email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Authentication failed");

      if (isSignupMode) {
        setIsSignupMode(false);
        alert("Signup successful! Please login now.");
      } else {
        localStorage.setItem("token", data.token);
        setLoggedIn(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openConversation = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConversationId(id);
      setMessages(data.conversation?.messages || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const sendMessage = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage || loading) return;
    const token = localStorage.getItem("token");

    setMessages((prev) => [...prev, { role: "user", content: cleanMessage }]);
    setMessage("");
    loading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: cleanMessage, conversationId }),
      });
      const data = await response.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setMessages([]);
    setConversations([]);
    setConversationId(null);
  };

  // 1. DONT SHOW DASHBOARD IF NOT LOGGED IN (SHOW LOGIN/SIGNUP CARD)
  if (!loggedIn) {
    return (
      <div className="login-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0c0e1b", color: "white" }}>
        <div className="login-card" style={{ background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "12px", width: "350px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="ai-logo" style={{ fontSize: "30px", textAlign: "center" }}>✦</div>
          <h2 style={{ textAlign: "center" }}>{isSignupMode ? "Register Account" : "Welcome Back"}</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
            {isSignupMode && (
              <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" }} />
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: "10px", borderRadius: "6px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" }} />
            
            <button onClick={handleAuth} style={{ padding: "10px", background: "#6366f1", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              {isSignupMode ? "Sign Up" : "Log In"}
            </button>
          </div>

          {error && <div style={{ color: "#ff4d4d", marginTop: "10px", fontSize: "14px", textAlign: "center" }}>{error}</div>}

          <p style={{ textAlign: "center", marginTop: "15px", fontSize: "14px", cursor: "pointer", color: "#a5b4fc" }} onClick={() => setIsSignupMode(!isSignupMode)}>
            {isSignupMode ? "Already have an account? Login" : "Don't have an account? Register/Signup here"}
          </p>
        </div>
      </div>
    );
  }

  // 2. SHOW MAIN APP CONTENT ONLY IF LOGGED IN
  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header"><h2>Conversations</h2></div>
        <button className="new-chat-button" onClick={() => { setConversationId(null); setMessages([]); }}>+ New Chat</button>
        <div className="conversations-list">
          {historyLoading ? (
            <div>Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="no-history">No recent chats</div>
          ) : (
            conversations.map((conv) => (
              <div key={conv._id} className={`conversation-item ${conversationId === conv._id ? "active" : ""}`} onClick={() => openConversation(conv._id)}>
                💬 {conv.messages[0]?.content?.substring(0, 15) || "Chat"}
              </div>
            ))
          )}
        </div>
        <div className="sidebar-footer"><button className="logout-button" onClick={logout}>Logout 🚪</button></div>
      </div>

      <div className="chat-area">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <h1>What can I help with today?</h1>
          </div>
        ) : (
          <div className="messages-container" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ margin: "10px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
                <span style={{ background: msg.role === "user" ? "#6366f1" : "rgba(255,255,255,0.1)", padding: "10px", borderRadius: "8px", display: "inline-block", maxWidth: "70%", color: "white" }}>
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="input-container" style={{ display: "flex", padding: "10px", background: "rgba(0,0,0,0.2)" }}>
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message Assistant..." onKeyDown={(e) => e.key === "Enter" && sendMessage()} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" }} />
          <button onClick={sendMessage} style={{ marginLeft: "10px", padding: "10px 20px", background: "#6366f1", border: "none", color: "white", borderRadius: "6px" }}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;

