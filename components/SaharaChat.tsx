"use client";

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          language: "en"
        })
      });
      const data = await res.json();

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="page-header bg-slate-900/40 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="page-title-group">
          <h1>Sahara Safety Assistant</h1>
          <p className="text-xs text-slate-400">RAG-powered conversational interface grounded in legal rights, helplines, and safety manuals.</p>
        </div>
        <div className="badge badge-info text-xs flex items-center gap-1">
          <Sparkles size={12} />
          <span>Grounded in legal docs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 p-6 flex-1 overflow-y-auto lg:overflow-hidden h-auto lg:h-[calc(100vh-120px)]">
        {/* Main Chat Panel */}
        <div className="glass chat-container flex flex-col overflow-hidden lg:h-full h-[500px]">
          <div className="chat-history flex-1 overflow-y-auto p-6 flex flex-col gap-4">
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
                  <div className="flex items-center gap-2 text-rose-500 font-bold mb-2">
                    <AlertTriangle size={16} />
                    <span>CRISIS TRIGGER TRIGGERED</span>
                  </div>
                )}
                
                <div>{msg.text}</div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-sources mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                    <span className="font-semibold">Sources: </span>
                    {msg.sources.map((src, sIdx) => (
                      <span key={sIdx} className="badge badge-info text-[9px] px-2 py-0.5 ml-1">
                        {src.title} ({src.type})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="typing-indicator flex gap-1 items-center px-4 py-2 bg-white/5 rounded-xl self-start">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area border-t border-white/5 p-4 flex gap-3">
            <input
              type="text"
              placeholder="Ask about Dutch laws, emergency shelters, or safety tips..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              className="form-input flex-1"
            />
            <button 
              onClick={() => handleSend()} 
              disabled={loading}
              className="btn btn-primary"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar Info/Quick Prompts Panel */}
        <div className="flex flex-col gap-6">
          <div className="glass p-6">
            <h4 className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Quick Suggestions</h4>
            <div className="flex flex-col gap-3">
              {PRESET_QUERIES.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button 
                    key={idx}
                    onClick={() => handleSend(q.text)}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 text-xs text-slate-300 transition flex items-start gap-3"
                  >
                    <Icon className="text-teal-400 shrink-0 mt-0.5" size={14} />
                    <span>{q.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass p-6 flex-1 flex flex-col justify-center items-center text-center">
            <MessageSquare size={36} className="text-teal-400/30 mb-4" />
            <h4 className="text-sm font-semibold text-white mb-2">Help & Safety Support</h4>
            <p className="text-xs text-slate-400 max-w-[240px]">
              Sahara answers safety questions instantly. In case of immediate safety threats, click the SOS Panic Button directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
