import { useCallback, useEffect, useRef, useState } from "react";
import {
  farmsApi,
  advisoryApi,
  type AdvisoryResponse,
  type Farm,
  type Guideline,
} from "../api";
import { Card, SectionHeader, Select, Button } from "../components/ui";
import {
  Sprout,
  MessageSquare,
  Send,
  AlertTriangle,
  CalendarDays,
  BookOpen,
  MapPin,
  CheckCircle2,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  isFallback?: boolean;
};

const QUICK_QUESTIONS = [
  "বৃষ্টি কম হলে আমার লাভ কত কমবে?",
  "স্বাভাবিক অবস্থায় কত ধান হতে পারে?",
  "এখন আমার কী কাজ করা উচিত?",
  "কোন সেচ দিতে হবে?",
];

function formatDate(value: string | null) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TaskCard({ task }: { task: Guideline }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {task.instruction}
          </p>
          <p className="mt-1 text-xs text-text-secondary capitalize">
            Stage: {task.stage.replace("_", " ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
          Day {task.start_day}–{task.end_day}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1">
          <BookOpen size={12} />
          {task.source_name || "Source not listed"}
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={12} />
          {task.reviewed_by || "Unreviewed"} · {formatDate(task.reviewed_at)}
        </span>
        {task.source_url && (
          <a
            href={task.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            View source
          </a>
        )}
      </div>
    </div>
  );
}

export default function Advisory() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedFarm = farms.find((f) => String(f.id) === selectedFarmId);

  useEffect(() => {
    let cancelled = false;
    farmsApi
      .listFarms()
      .then((res) => {
        if (cancelled) return;
        setFarms(res.data);
        const requestedFarmId = new URLSearchParams(window.location.search).get(
          "farm"
        );
        const requestedFarm = res.data.find(
          (farm) => String(farm.id) === requestedFarmId
        );
        if (requestedFarm) {
          setSelectedFarmId(String(requestedFarm.id));
        } else if (res.data.length > 0) {
          setSelectedFarmId(String(res.data[0].id));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load farms from the backend.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAdvisory = useCallback(async (farmId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await advisoryApi.getAdvisory(farmId);
      setAdvisory(res.data);
    } catch (err: any) {
      setAdvisory(null);
      setError(
        err.response?.data?.message ||
          "Could not load advisory guidelines for this farm."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFarmId) {
      setAdvisory(null);
      return;
    }
    setMessages([]);
    setChatError(null);
    loadAdvisory(Number(selectedFarmId));
  }, [selectedFarmId, loadAdvisory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selectedFarmId || chatLoading) return;

    setChatError(null);
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatLoading(true);

    try {
      const res = await advisoryApi.askAdvisor(Number(selectedFarmId), trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          isFallback: res.data.is_fallback,
        },
      ]);
    } catch (err: any) {
      const data = err.response?.data;
      let message =
        data?.message || "The advisor is unavailable. Please try again.";
      if (data?.code === "PREDICTION_NOT_FOUND") {
        message =
          "This farm has no prediction yet. Generate a prediction first, then ask the advisor.";
      } else if (data?.code === "FARM_NOT_FOUND") {
        message = "Farm not found. Refresh the farm list and try again.";
      }
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(question);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <SectionHeader
        title="Farm Advisory"
        subtitle="Verified crop guidelines and a Bengali AI advisor connected to the Django backend."
        icon={Sprout}
      />

      <Card className="border border-border/80 bg-surface-card">
        <div className="grid md:grid-cols-2 gap-6">
          <Select
            id="farm"
            label="Select Farm"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            options={farms.map((farm) => ({
              value: String(farm.id),
              label: `${farm.farmer_name} · ${farm.crop_code} · ${farm.district}`,
            }))}
            helperText={
              farms.length === 0
                ? "No farms yet. Create one in Farm Registry or generate a prediction."
                : undefined
            }
          />

          {selectedFarm && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-surface p-3">
                <div className="text-[10px] font-mono uppercase text-text-secondary">
                  Crop
                </div>
                <div className="mt-1 font-medium text-text-primary capitalize">
                  {selectedFarm.crop_code.replace("_", " ")}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface p-3">
                <div className="text-[10px] font-mono uppercase text-text-secondary">
                  Area
                </div>
                <div className="mt-1 font-medium text-text-primary">
                  {selectedFarm.area_ha} ha
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface p-3">
                <div className="text-[10px] font-mono uppercase text-text-secondary">
                  Location
                </div>
                <div className="mt-1 flex items-center gap-1 font-medium text-text-primary">
                  <MapPin size={13} className="text-accent" />
                  {selectedFarm.district}, {selectedFarm.upazila}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface p-3">
                <div className="text-[10px] font-mono uppercase text-text-secondary">
                  Days After Transplant
                </div>
                <div className="mt-1 flex items-center gap-1 font-medium text-text-primary">
                  <CalendarDays size={13} className="text-accent" />
                  {advisory?.days_after_transplant != null
                    ? `${advisory.days_after_transplant} days`
                    : "Not scheduled"}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-warning bg-warning/5 text-warning p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Guidelines */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-surface-card">
            <SectionHeader
              title="Do Now"
              subtitle="Verified tasks for the current crop stage."
              icon={Sprout}
            />
            {loading ? (
              <p className="text-sm text-text-secondary">Loading guidelines…</p>
            ) : advisory?.do_now?.length ? (
              <div className="space-y-3">
                {advisory.do_now.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                No verified guidelines for this farm's current stage yet.
              </p>
            )}
          </Card>

          <Card className="border border-border/80 bg-surface-card">
            <SectionHeader
              title="Coming Up"
              subtitle="Verified tasks in the next 7 days."
              icon={CalendarDays}
            />
            {advisory?.coming_up?.length ? (
              <div className="space-y-3">
                {advisory.coming_up.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Nothing scheduled for the next 7 days.
              </p>
            )}
          </Card>
        </div>

        {/* Advisor chat */}
        <Card className="border border-border/80 bg-surface-card">
          <SectionHeader
            title="Bengali Farm Advisor"
            subtitle="Answers are grounded in this farm's prediction and guidelines."
            icon={MessageSquare}
          />

          <div className="h-72 overflow-y-auto space-y-3 rounded-xl border border-border/60 bg-surface p-4">
            {messages.length === 0 && (
              <p className="pt-8 text-center text-sm text-text-secondary">
                Ask a question or choose one of the suggestions below.
              </p>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-accent/15 text-text-primary border border-accent/30"
                      : msg.isFallback
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-surface-card text-text-primary border border-border/70"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="animate-pulse rounded-xl border border-border/70 bg-surface-card px-3 py-2 text-sm text-text-secondary">
                  Writing answer…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {chatError && (
            <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              {chatError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন…"
              disabled={chatLoading || !selectedFarmId}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
              aria-label="Type your question"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={chatLoading || !question.trim() || !selectedFarmId}
              iconRight={Send}
            >
              Send
            </Button>
          </form>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendQuestion(q)}
                disabled={chatLoading || !selectedFarmId}
                className="rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-left text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
