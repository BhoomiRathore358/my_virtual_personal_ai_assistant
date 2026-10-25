import { useEffect, useState, useRef } from "react";
import "./App.css";

const API ='https://my-virtual-personal-ai-assistant-8.onrender.com';



export default function App() {
  const [email, setEmail] = useState("test@example.com"), [pass, setPass] = useState("TestPassword123!"), [name, setName] = useState(""), [signup, setSignup] = useState(false), [auth, setAuth] = useState(Boolean(localStorage.getItem("token")));
  const [msg, setMsg] = useState(""), [messages, setMessages] = useState([]), [convs, setConvs] = useState([]), [cid, setCid] = useState(null), [load, setLoad] = useState(false);
  const [file, setFile] = useState(null), [mime, setMime] = useState(""), [fName, setFName] = useState(""), [rec, setRec] = useState(false);
  const fInput = useRef(null), recRef = useRef(null), scrollRef = useRef(null);

  useEffect(() => {
    const id = "fa-cdn-link";
    if (!document.getElementById(id)) {
      const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = "https://cloudflare.com";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => { if (auth) loadHist(); }, [auth]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, load]);

  const loadHist = async () => {
    try {
      const res = await fetch(`${API}/api/chat/history`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const d = await res.json(); if (d.success) setConvs(d.conversations || []);
    } catch (err) { console.error("History error:", err); }
  };

  const handleAuth = async () => {
    const res = await fetch(`${API}/api/users/${signup ? "signup" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, email, password: pass } : { email, password: pass }) });
    const d = await res.json(); if (!res.ok) return alert(d.message);
    if (signup) { setSignup(false); alert("Signup done!"); } else { localStorage.setItem("token", d.token); setAuth(true); }
  };

  const openChat = async (id) => {
    setLoad(true); const res = await fetch(`${API}/api/chat/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    const d = await res.json(); setCid(id); setMessages(d.conversation?.messages || []); setLoad(false);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setMime(f.type); setFName(f.name);
    const r = new FileReader(); r.onloadend = () => setFile(r.result); r.readAsDataURL(f);
  };

  const handleMic = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) return alert("Mic unsupported.");
    if (rec) return recRef.current.stop();
    const r = new Speech(); r.lang = 'en-IN'; r.onstart = () => setRec(true); r.onend = () => setRec(false);
    r.onresult = (e) => setMsg(e.results[0][0].transcript); recRef.current = r; r.start();
  };

  const send = async (e) => {
    if (e) e.preventDefault(); if (!msg.trim() && !file) return;
    
    const currentMsgText = msg.trim() || "Sent an attachment";
    const userMsg = { role: "user", content: currentMsgText, file, fileType: mime };
    
    setMessages(p => [...p, userMsg]); 
    setMsg(""); setFile(null); setFName(""); setLoad(true);

    try {
      const res = await fetch(`${API}/api/chat`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, 
        body: JSON.stringify({ message: currentMsgText, conversationId: cid, fileData: userMsg.file, fileType: userMsg.fileType }) 
      });
      const d = await res.json(); 
      if (d.success) { 
        setCid(d.conversationId); 
        setMessages(p => [...p, { role: "assistant", content: d.reply }]); 
        loadHist(); 
      } else {
        alert(d.message || "Chat failed");
      }
    } catch (err) { 
      console.error(err); 
      alert("Backend se response nahi mila! Render Server chalu hone mein time le raha hai, 30 seconds baad fir try karein.");
    } finally { 
      setLoad(false); 
    }
  };

  const logout = () => {
    localStorage.removeItem("token"); setAuth(false); setMessages([]); setConvs([]); setCid(null);
  };

  if (!auth) return (
    <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="background-orb orb-one"></div><div className="background-orb orb-two"></div>
      <div style={{ background: "rgba(12, 14, 27, 0.75)", padding: "40px", borderRadius: "24px", width: "350px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
        <h2>{signup ? "Create Account" : "AI Portal Login"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
          {signup && <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
          <input type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={{ padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }} />
          <button onClick={handleAuth} style={{ padding: "12px", background: "#8b5cf6", border: "none", color: "#fff", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>{signup ? "Sign Up" : "Log In"}</button>
        </div>
        <p onClick={() => setSignup(!signup)} style={{ color: "#a5b4fc", marginTop: "20px", cursor: "pointer", fontSize: "13px" }}>{signup ? "Login here" : "Create profile"}</p>
      </div>
    </div>
  );

  return (
    <div className="app"><div className="background-orb orb-one"></div>
      <div className="sidebar" style={{ backdropFilter: "blur(10px)" }}>
        <h2>Neural Matrix</h2><button className="new-chat-button" onClick={() => { setCid(null); setMessages([]); }}>+ New Chat</button>
        <div className="conversation-list" style={{ marginTop: "20px" }}>
          {convs.map(c => <button key={c._id} className={`conversation-item ${cid === c._id ? "active" : ""}`} onClick={() => openChat(c._id)}><i className="far fa-comment-alt" style={{ marginRight: "8px", color: "#06b6d4" }}></i>{c.messages && c.messages.length > 0 ? (c.messages[c.messages.length - 1]?.content?.substring(0, 14) || "Media Chat") : "Chat Log"}</button>)}
        </div>
        <button onClick={logout} style={{ marginTop: "auto", background: "none", color: "#ff4664", border: "none", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><i className="fas fa-sign-out-alt"></i> Logout</button>
      </div>
      <div className="main-area">
        <div className="chat-container" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "10px" }}>
            {messages.length === 0 ? <h1 style={{ textAlign: "center", marginTop: "100px", color: "#fff" }}>What can I compute today?</h1> : 
              messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", margin: "12px 0" }}>
                  <div style={{ background: m.role === "user" ? "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.1))" : "rgba(255,255,255,0.04)", padding: "14px 20px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", maxWidth: "75%" }}>
                    {m.content}
                    {m.file && <div style={{ marginTop: "10px", borderRadius: "12px", overflow: "hidden", maxWidth: "250px" }}>{m.fileType?.startsWith("image/") ? <img src={m.file} style={{ width: "100%" }} /> : <video src={m.file} controls style={{ width: "100%" }} />}</div>}
                  </div>
                </div>
              ))
            }
            {load && <div style={{ color: "#06b6d4", fontSize: "14px" }}>✦ AI is processing...</div>}
            <div ref={scrollRef} />
          </div>
          
          <form onSubmit={send} style={{ display: "flex", alignItems: "center", background: "rgba(20, 24, 43, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "20px", padding: "8px 18px", gap: "14px", margin: "20px" }}>
            <input type="file" ref={fInput} onChange={handleFile} style={{ display: "none" }} accept="image/*,video/*" />
            <button type="button" onClick={() => fInput.current?.click()} style={{ background: "none", border: "none", color: "#06b6d4", cursor: "pointer", fontSize: "18px" }}>
              <i className="fas fa-paperclip"></i>
            </button>
            <button type="button" onClick={handleMic} style={{ background: "none", border: "none", color: rec ? "#ff4664" : "#a5b4fc", cursor: "pointer", fontSize: "18px" }}>
              <i className={rec ? "fas fa-microphone" : "fas fa-microphone-slash"}></i>
            </button>
            <input type="text" placeholder={fName ? `Attached: ${fName}` : "Type a message..."} value={msg} onChange={e => setMsg(e.target.value)} style={{ flexGrow: 1, background: "none", border: "none", color: "#fff", outline: "none", padding: "8px 0" }} />
            <button type="submit" style={{ background: "#06b6d4", border: "none", color: "#fff", padding: "8px 16px", borderRadius: "12px", fontWeight: "600", cursor: "pointer" }}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
