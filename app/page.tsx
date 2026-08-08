"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "What's your return policy?",
  "Do you offer phone support?",
  "How do I track my order?",
  "What payment methods do you accept?",
];

function SignalOrb({
  status,
  size = 40,
  showRipple = false,
}: {
  status: "idle" | "thinking" | "speaking" | "escalated";
  size?: number;
  showRipple?: boolean;
}) {
  const orbClass =
    status === "escalated"
      ? "orb-escalated"
      : status === "speaking"
      ? "orb-speaking"
      : status === "thinking"
      ? "orb-thinking"
      : "orb-idle";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {showRipple &&
        (status === "speaking" || status === "thinking") &&
        [0, 1].map((i) => (
          <motion.div
            key={i}
            className="ripple-ring"
            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      <div className={`orb ${orbClass}`} style={{ width: size, height: size }} />
    </div>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="relative w-14 h-8 rounded-full flex items-center px-1 transition-colors"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <motion.div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
        style={{ background: "var(--violet)" }}
        animate={{ x: theme === "dark" ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </motion.div>
    </button>
  );
}

export default function Chat() {
  const [conversationId] = useState(() => crypto.randomUUID());
  const [escalated, setEscalated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      fetch("/api/check-escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      })
        .then((res) => res.json())
        .then((data) => setEscalated(data.escalated));
    }
  }, [status, messages.length, conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage({ text });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const orbStatus = escalated
    ? "escalated"
    : status === "submitted"
    ? "thinking"
    : status === "streaming"
    ? "speaking"
    : "idle";

  return (
    <div
      data-theme={theme}
      style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}
    >
      <div className="aurora" />

      <div className="flex flex-col h-screen max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <SignalOrb status={orbStatus} size={38} showRipple />
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight">
                Support Signal
              </h1>
              <p className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>
                {orbStatus === "idle" && "listening"}
                {orbStatus === "thinking" && "retrieving context..."}
                {orbStatus === "speaking" && "responding..."}
                {orbStatus === "escalated" && "flagged for human review"}
              </p>
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </div>

        {/* Escalation flare */}
        <AnimatePresence>
          {escalated && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl px-4 py-3 mb-4 font-mono text-sm flex items-center gap-2"
              style={{
                background: "color-mix(in srgb, var(--rose) 12%, var(--surface))",
                border: "1px solid var(--rose)",
                color: "var(--rose)",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                ●
              </motion.span>
              this conversation has been flagged — a human agent will follow up
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state / welcome */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-6"
          >
            <SignalOrb status="idle" size={64} showRipple />
            <div>
              <h2 className="font-display text-2xl font-semibold mb-1">
                How can I help?
              </h2>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                Ask about shipping, returns, billing, or your account.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="chip rounded-full px-3 py-1.5 text-xs font-mono"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll space-y-4 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`msg-group flex gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="mt-1 shrink-0">
                      <SignalOrb status="idle" size={22} />
                    </div>
                  )}

                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[80%] rounded-2xl rounded-br-md px-4 py-3"
                        : "glass max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3"
                    }
                    style={{
                      background:
                        message.role === "user" ? "var(--user-bubble)" : undefined,
                      border: message.role === "assistant" ? "1px solid var(--border)" : "none",
                      boxShadow:
                        message.role === "assistant"
                          ? "0 4px 20px -8px rgba(0,0,0,0.15)"
                          : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="font-mono text-[10px] uppercase tracking-wide"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {message.role === "user" ? "you" : "agent"}
                      </p>
                      {message.role === "assistant" && (
                        <button
                          className="copy-btn font-mono text-[10px]"
                          style={{ color: "var(--text-dim)" }}
                          onClick={() => {
                            const text = message.parts
                              .filter((p) => p.type === "text")
                              .map((p) => p.text)
                              .join("");
                            handleCopy(message.id, text);
                          }}
                        >
                          {copiedId === message.id ? "copied ✓" : "copy"}
                        </button>
                      )}
                    </div>
                    <div className="md-content text-sm leading-relaxed">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? (
                          <ReactMarkdown key={i}>{part.text}</ReactMarkdown>
                        ) : null
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {status === "submitted" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 pl-1"
              >
                <SignalOrb status="thinking" size={22} showRipple />
                <span className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>
                  thinking...
                </span>
              </motion.div>
            )}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="pb-5 pt-2">
          <div className="input-shell">
            <div
              className="flex items-center gap-2 rounded-full px-2 py-2"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent outline-none px-3 text-sm"
                style={{ color: "var(--text)" }}
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.92 }}
                className="rounded-full w-10 h-10 flex items-center justify-center font-display text-sm shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--teal), var(--violet))",
                  color: "#0B0E1A",
                }}
              >
                {status === "streaming" || status === "submitted" ? (
                  <SignalOrb status="thinking" size={16} />
                ) : (
                  "→"
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}