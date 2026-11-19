/**
 * BengaliAdvisorChat.jsx
 * Simple, farmer-friendly Q&A interface connected to POST /api/advisor/chat/.
 * Includes quick-select suggestion chips for common Bengali test questions.
 * If the backend returns is_fallback: true, renders a calm notice card.
 *
 * SOLID: Single Responsibility - only handles chat UI
 *        State management via useAdvisorChat hook
 */
import React, { useState, useEffect, useRef } from "react";
import { useAdvisorChat } from "../hooks/useAdvisorChat";

/** Bengali Advisor Chat Component */
export const BengaliAdvisorChat = ({ farmId, farmerName, cropCode, areaHa } = {}) => {
  const {
    messages,
    input,
    loading,
    quickQuestions,
    sendQuestion,
    handleSuggestionClick,
    canSend,
    setInput,
  } = useAdvisorChat(farmId);

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show disclaimer when last message is a fallback
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const fallbackText =
        "এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের সংখ্যাগুলো দেখুন।";
      setShowDisclaimer(
        lastMessage.content === fallbackText || !!lastMessage.is_fallback
      );
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSend) sendQuestion(input);
  };

  return (
    <div className="bg-white rounded-xl border p-4 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Bengali Farm Advisor</h3>
        <small className="text-xs text-gray-500">
          {farmerName || "Farmer"} • {cropCode || "Crop"}
        </small>
      </div>

      {/* Fallback / Disclaimer Banner */}
      {showDisclaimer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <span className="text-yellow-700 text-sm">
            এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের
            সংখ্যাগুলো দেখুন।
          </span>
        </div>
      )}

      {/* Chat Messages */}
      <div
        className="h-64 overflow-y-auto space-y-3 pb-3 mb-3 border-b border-gray-100"
        style={{ minHeight: 160 }}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center pt-6">
            প্রশ্ন লিখুন অথবা নিচের বোতাম থেকে বেছে নিন।
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md p-2.5 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 text-sm px-3 py-2 rounded-lg animate-pulse">
              উত্তর লেখা হচ্ছে…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার প্রশ্ন লিখুন…"
          disabled={loading}
          className={`flex-1 rounded-lg border py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            loading ? "bg-gray-100 cursor-not-allowed border-gray-200" : "border-gray-300"
          }`}
          aria-label="Type your question in Bengali"
        />
        <button
          type="submit"
          disabled={!canSend || loading}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            canSend && !loading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? "…" : "পাঠান"}
        </button>
      </form>

      {/* Suggestion Chips */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {quickQuestions.map((question, idx) => (
          <button
            key={idx}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-800 focus:outline-none transition-colors text-left"
            onClick={() => handleSuggestionClick(question)}
            title={question}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};
