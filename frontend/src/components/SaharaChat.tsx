import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  AlertTriangle,
  Compass, 
  BookOpen, 
  Phone
} from "lucide-react";
import { api } from "../api";

const PRESET_QUERIES = [
  { text: "What are my legal rights if I am followed?", icon: BookOpen },
  { text: "Find nearest women's helpline in Rotterdam", icon: Phone },
  { text: "How does the codeword SOS trigger work?", icon: Compass },
];

interface Message {
  role: string;
  text: string;
  sources?: { title: string; type: string }[];
  isCrisis?: boolean;
}

interface SaharaChatProps {
  onCrisisRedirect: () => void;
}

export default function SaharaChat({ onCrisisRedirect }: SaharaChatProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I am Sahara, your AI safety information assistant. I can answer questions about local laws, rights, helpline directories, and NGO support procedures.",
      sources: [],
      isCrisis: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || question;
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: Message = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const { data } = await api.post("/chat/ask", {
        question: textToSend,
        language: "en"
      });

      // Crisis interceptor
      if (data.is_crisis) {
        const assistantMsg = {
          role: "assistant",
          text: data.answer || "⚠️ IMMEDIATE DANGER DETECTED. Swapping to Emergency SOS Hub in 3 seconds...",
          sources: [],
          isCrisis: true
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setLoading(false);
        
        // Trigger automated redirect callback after 3 seconds
        setTimeout(() => {
          onCrisisRedirect();
        }, 3000);
        return;
      }

      const assistantMsg = {
        role: "assistant",
        text: data.answer,
        sources: data.sources || [],
        isCrisis: false
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error communicating with Sahara", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I'm having trouble connecting to my knowledge base right now. For emergency assistance, please trigger the SOS panic button immediately.",
          sources: [],
          isCrisis: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Sahara Safety Assistant</h1>
          <p>RAG-powered conversational interface grounded in legal rights, helplines, and safety manuals.</p>
        </div>
        <div className="badge badge-info">
          <Sparkles size={14} />
          <span>Grounded in legal docs</span>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 340px', flex: 1, height: 'auto', overflow: 'hidden' }}>
        {/* Main Chat Panel */}
        <div className="glass chat-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="chat-history">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-bubble ${
                  msg.role === "user" 
                    ? "chat-bubble-user" 
                    : `chat-bubble-assistant ${msg.isCrisis ? "chat-bubble-crisis" : ""}`
                }`}
              >
                {msg.isCrisis && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', fontWeight: '700', marginBottom: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>CRISIS TRIGGER TRIGGERED</span>
                  </div>
                )}
                
                <div>{msg.text}</div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-sources">
                    <span style={{ fontWeight: '600' }}>Sources: </span>
                    {msg.sources.map((src, sIdx) => (
                      <span key={sIdx} className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px', marginLeft: '4px' }}>
                        {src.title} ({src.type})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Sahara about safety, legal procedures, or helplines..."
              className="form-input chat-input"
              disabled={loading}
            />
            <button 
              onClick={() => handleSend()} 
              className="btn btn-primary"
              disabled={loading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Quick Suggestions Panel */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="card-title">
              <MessageSquare size={20} color="#00d1b2" />
              <span>Suggested Queries</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Click any safety query below to receive grounded legal answers and NGO contacts instantly:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PRESET_QUERIES.map((preset, idx) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(preset.text)}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '13px', padding: '12px 16px' }}
                    disabled={loading}
                  >
                    <Icon size={16} color="#00d1b2" style={{ minWidth: '16px' }} />
                    <span>{preset.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '16px', border: '1px solid rgba(255, 56, 96, 0.15)', borderRadius: '12px', background: 'rgba(255,56,96,0.02)', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
              <AlertTriangle size={16} />
              <span>Safety Keyword Trigger</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              Sahara scans questions in real-time. Typing phrases like <strong>"someone is following me"</strong> or <strong>"in danger right now"</strong> will immediately intercept the assistant and trigger the automated SOS system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
