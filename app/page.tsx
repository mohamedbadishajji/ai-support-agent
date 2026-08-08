"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [conversationId] = useState(() => crypto.randomUUID());
  const [escalated, setEscalated] = useState(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
  });
  const [input, setInput] = useState("");

  // After each response finishes, check if this conversation got escalated
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">AI Support Agent</h1>

      {escalated && (
        <div className="bg-amber-100 border border-amber-300 text-amber-800 text-sm rounded-lg px-4 py-2 mb-4">
          This conversation has been flagged for a human agent — someone from
          our team will follow up.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              message.role === "user"
                ? "bg-blue-100 ml-auto max-w-[80%]"
                : "bg-gray-100 mr-auto max-w-[80%]"
            }`}
          >
            <p className="text-xs font-semibold mb-1 text-gray-500">
              {message.role === "user" ? "You" : "Support Agent"}
            </p>
            {message.parts.map((part, i) =>
              part.type === "text" ? (
                <div key={i} className="prose prose-sm max-w-none">
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
              ) : null
            )}
          </div>
        ))}
        {status === "streaming" && (
          <p className="text-sm text-gray-400">Agent is typing...</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}