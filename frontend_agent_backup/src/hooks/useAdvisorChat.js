import { useState } from "react";
import { api } from "../api";

/**
 * Custom Hook: useAdvisorChat
 * Encapsulates API calls for the Bengali Farm Advisor chat.
 * Facade Pattern: Hides Axios logic from UI components.
 *
 * SOLID: Single Responsibility - only handles chat API communication
 *         Dependency Inversion - depends on api abstraction
 *
 * @param {number|null} farmId - The farm ID to send with chat requests
 */
export const useAdvisorChat = (farmId) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "বৃষ্টি কম হলে আমার লাভ কত কমবে?",
    "স্বাভাবিক অবস্থায় কত ধান হতে পারে?",
    "এখন আমার কী কাজ করা উচিত?",
    "কোন সেচ দিতে হবে?",
  ];

  const sendQuestion = async (question) => {
    if (!question.trim()) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/api/advisor/chat/", {
        farm_id: farmId,  // Required by backend AdvisorChatView
        question,
      });

      const data = response.data;

      // Handle fallback / graceful degradation
      const fallbackMsg =
        data.answer ||
        "এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের সংখ্যাগুলো দেখুন।";

      if (data.is_fallback) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fallbackMsg, is_fallback: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      }
    } catch (err) {
      const statusCode = err.response?.status;
      let errorMsg;

      if (statusCode === 404) {
        errorMsg =
          "এই ফার্মের জন্য কোনো তথ্য পাওয়া যায়নি। প্রথমে একটি ভবিষ্যদ্বাণী তৈরি করুন।";
      } else if (statusCode === 400) {
        errorMsg = "অনুরোধে সমস্যা আছে। আবার চেষ্টা করুন।";
      } else {
        errorMsg = "সংযোগ সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।";
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg, is_fallback: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (question) => {
    setInput(question);
    sendQuestion(question);
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  return {
    // State
    messages,
    input,
    loading,
    quickQuestions,

    // Actions
    setInput,
    sendQuestion,
    handleSuggestionClick,
    resetChat,

    // Derived
    hasMessages: messages.length > 0,
    canSend: !loading && input.trim().length > 0,
  };
};
