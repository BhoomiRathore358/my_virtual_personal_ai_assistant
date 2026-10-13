import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

function App() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("TestPassword123!");

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  useEffect(() => {
    if (loggedIn) {
      loadHistory();
    }
  }, [loggedIn]);

  const loadHistory = async () => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      setHistoryLoading(true);

      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load history");
      }

      setConversations(data.conversations || []);
    } catch (err) {
      console.error("History error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);

      setLoggedIn(true);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  const openConversation = async (id) => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/chat/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to open conversation"
        );
      }

      setConversationId(id);
      setMessages(data.conversation?.messages || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // =====================================================
  // NEW CHAT
  // =====================================================

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setMessage("");
    setError("");
  };

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async () => {
    const cleanMessage = message.trim();

    if (!cleanMessage || loading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login first");
      return;
    }

    const userMessage = {
      role: "user",
      content: cleanMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: cleanMessage,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI request failed");
      }

      setConversationId(data.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

      await loadHistory();
    } catch (err) {
      setError(err.message);

      // Remove optimistic user message if request failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DELETE CONVERSATION
  // =====================================================

  const deleteConversation = async (id, event) => {
    event.stopPropagation();

    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/chat/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete conversation"
        );
      }

      setConversations((prev) =>
        prev.filter((conversation) => conversation._id !== id)
      );

      if (conversationId === id) {
        newChat();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem("token");

    setLoggedIn(false);
    setMessages([]);
    setConversations([]);
    setConversationId(null);
    setMessage("");
    setError("");
  };

  // =====================================================
  // SUGGESTION
  // =====================================================

  const useSuggestion = (text) => {
    setMessage(text);

    setTimeout(() => {
      document.querySelector(".message-input")?.focus();
    }, 50);
  };

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-glow glow-one"></div>
        <div className="login-glow glow-two"></div>

        <div className="login-card">
          <div className="ai-logo large-logo">
            ✦
          </div>

          <span className="small-label">
            PRIVATE AI
          </span>

          <h1>
            Your Personal
            <span> AI Assistant</span>
          </h1>

          <p className="login-description">
            A private AI assistant powered locally by Ollama.
          </p>

          <div className="form">
            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />

            <button
              className="primary-button"
              onClick={login}
            >
              Enter Assistant
              <span>→</span>
            </button>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <div className="privacy-note">
            <span>🔒</span>
            Your conversations stay on your local system.
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN APP
  // =====================================================

  return (
    <div className="app">
      <div className="background-orb orb-one"></div>
      <div className="background-orb orb-two"></div>

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="ai-logo">
            ✦
          </div>

          <div>
            <h2>Nova AI</h2>

            <span className="status">
              <i></i>
              Local & Private
            </span>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={newChat}
        >
          <span>＋</span>
          New Chat
        </button>

        <div className="conversation-heading">
          <span>CONVERSATIONS</span>
          <span className="conversation-count">
            {conversations.length}
          </span>
        </div>

        <div className="conversation-list">
          {historyLoading ? (
            <div className="sidebar-loading">
              Loading chats...
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-history">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => {
              const firstMessage =
                conversation.messages?.find(
                  (item) => item.role === "user"
                );

              const title =
                firstMessage?.content || "New conversation";

              return (
                <button
                  className={`conversation-item ${
                    conversationId === conversation._id
                      ? "active"
                      : ""
                  }`}
                  key={conversation._id}
                  onClick={() =>
                    openConversation(conversation._id)
                  }
                >
                  <div className="conversation-icon">
                    ✦
                  </div>

                  <span className="conversation-title">
                    {title.length > 28
                      ? `${title.substring(0, 28)}...`
                      : title}
                  </span>

                  <span
                    className="delete-chat"
                    onClick={(event) =>
                      deleteConversation(
                        conversation._id,
                        event
                      )
                    }
                  >
                    ×
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="ollama-status">
            <span className="online-dot"></span>

            <div>
              <strong>Ollama connected</strong>
              <small>llama3.2:3b</small>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main-area">
        <header className="mobile-topbar">
          <div className="brand">
            <div className="ai-logo">
              ✦
            </div>

            <div>
              <h2>Nova AI</h2>

              <span className="status">
                <i></i>
                Local & Private
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <div className="chat-container">
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="hero-orb">
                <div className="hero-core">
                  ✦
                </div>
              </div>

              <span className="small-label">
                PERSONAL AI
              </span>

              <h1>
                How can I
                <span> help you?</span>
              </h1>

              <p>
                Ask questions, brainstorm ideas, write
                content, or simply have a conversation.
              </p>

              <div className="suggestions">
                <button
                  onClick={() =>
                    useSuggestion(
                      "Give me some ideas for my project"
                    )
                  }
                >
                  <span>💡</span>
                  <strong>Project ideas</strong>
                  <small>
                    Brainstorm something new
                  </small>
                </button>

                <button
                  onClick={() =>
                    useSuggestion(
                      "Help me write something professional"
                    )
                  }
                >
                  <span>✍️</span>
                  <strong>Writing help</strong>
                  <small>
                    Create better content
                  </small>
                </button>

                <button
                  onClick={() =>
                    useSuggestion(
                      "Explain something to me simply"
                    )
                  }
                >
                  <span>🧠</span>
                  <strong>Explain something</strong>
                  <small>
                    Make complex things simple
                  </small>
                </button>
              </div>
            </section>
          ) : (
            <section className="messages">
              {messages.map((item, index) => (
                <div
                  className={`message-row ${item.role}`}
                  key={item._id || index}
                >
                  <div className="avatar">
                    {item.role === "assistant"
                      ? "✦"
                      : "U"}
                  </div>

                  <div className="message-content">
                    <span className="message-name">
                      {item.role === "assistant"
                        ? "Nova AI"
                        : "You"}
                    </span>

                    <div className="bubble">
                      {item.content}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row assistant">
                  <div className="avatar">
                    ✦
                  </div>

                  <div className="message-content">
                    <span className="message-name">
                      Nova AI
                    </span>

                    <div className="bubble typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="error-box chat-error">
              {error}
            </div>
          )}

          {/* MESSAGE INPUT */}

          <div className="composer">
            <button
              type="button"
              className="icon-button"
              title="Attachment"
            >
              +
            </button>

            <input
              type="text"
              className="message-input"
              placeholder="Message Nova AI..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              type="button"
              className="send-button"
              onClick={sendMessage}
              disabled={
                loading || !message.trim()
              }
              title="Send message"
            >
              {loading ? "..." : "↑"}
            </button>
          </div>

          <p className="composer-note">
            🔒 Local Ollama • Your conversations stay
            on your machine
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;