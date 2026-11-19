/**
 * FarmTasksPanel.jsx
 * Consumes data from GET /api/advisory/{farm_id}/.
 * Displays days_after_transplant badge.
 * Splits tasks into two sections: Do Now and Coming Up.
 * Shows trust metadata: source_name, source_url, reviewed_by, reviewed_at.
 *
 * SOLID: Single Responsibility - only renders farm tasks UI
 *        Data fetching handled by useFarmAssistant hook
 */
import React from "react";

/** Formats reviewed_at date for display */
const formatReviewedAt = (dateString) => {
  if (!dateString) return "Date not available";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

/** Creates a clickable source link if source_url exists */
const renderSourceLink = (sourceUrl, sourceName) => {
  if (!sourceUrl) {
    return <span className="text-xs text-gray-400">No source link</span>;
  }
  const url =
    sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")
      ? sourceUrl
      : `https://${sourceUrl}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 text-xs underline hover:text-blue-800"
    >
      {sourceName || url}
    </a>
  );
};

/** Task card — shared by Do Now and Coming Up sections */
const TaskCard = ({ task }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors" style={{ minHeight: 60 }}>
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{task.instruction}</p>
        <p className="text-xs text-gray-500 mt-0.5">Stage: {task.stage || "—"}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium text-gray-700">
          {task.reviewed_by ? `By ${task.reviewed_by}` : "—"}
        </p>
        <p className="text-xs text-gray-400">{formatReviewedAt(task.reviewed_at)}</p>
      </div>
    </div>
    <div className="mt-1.5">{renderSourceLink(task.source_url, task.source_name)}</div>
  </div>
);

/** FarmTasksPanel - Main component */
export const FarmTasksPanel = ({ daysAfterTransplant, doNow, comingUp }) => {
  const sortedDoNow = [...(doNow || [])].sort((a, b) => a.start_day - b.start_day);
  const sortedComingUp = [...(comingUp || [])].sort((a, b) => a.start_day - b.start_day);

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
      {/* Days After Transplant Badge */}
      <div className="mb-4">
        {daysAfterTransplant != null ? (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium rounded px-2.5 py-0.5">
            {daysAfterTransplant} days after transplant
          </span>
        ) : (
          <span className="text-sm text-gray-500">Transplant date not set</span>
        )}
      </div>

      {/* Do Now Section */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Do Now — এখন করণীয় ({sortedDoNow.length})
        </h4>
        {sortedDoNow.length > 0 ? (
          <div className="space-y-2">
            {sortedDoNow.map((task, idx) => (
              <TaskCard key={task.id ?? idx} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">
            আজকের জন্য কোনো কাজ নেই।
          </p>
        )}
      </div>

      {/* Coming Up Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Coming Up — আগামী ৭ দিনের কাজ ({sortedComingUp.length})
        </h4>
        {sortedComingUp.length > 0 ? (
          <div className="space-y-2">
            {sortedComingUp.map((task, idx) => (
              <TaskCard key={task.id ?? idx} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">
            আগামী ৭ দিনে কোনো কাজ নেই।
          </p>
        )}
      </div>
    </div>
  );
};
