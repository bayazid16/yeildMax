/**
 * ScenarioComparison.jsx
 * Displays comparison cards for 3 rainfall scenarios: normal, low_rain, heavy_rain.
 * Shows Yield (t/ha) and Net Profit (BDT) clearly.
 * Mobile-first design with touch targets >= 44px.
 *
 * SOLID: Single Responsibility - only renders scenario comparison UI
 *        - Display logic separated from data fetching (useFarmAssistant hook)
 */
import React from "react";

/** Formats BDT amount with standard formatting */
const formatBdt = (amount) => {
  const formatted = Number(amount).toLocaleString("en-US");
  return `৳${formatted}`;
};

/** Formats yield with one decimal place */
const formatYield = (yieldVal) => `${Number(yieldVal).toFixed(1)} t/ha`;

const scenarioLabels = {
  normal: "স্বাভাবিক বৃষ্টি",
  low_rain: "কম বৃষ্টি",
  heavy_rain: "অতিবৃষ্টি",
};

const scenarioBangla = {
  normal: "স্বাভাবিক",
  low_rain: "কম বৃষ্টিতে",
  heavy_rain: "অতিবৃষ্টিতে",
};

export const ScenarioComparison = ({
  scenarioCode,
  yieldTPerHa,
  netProfitBdt,
  label,
  bengaliName,
}) => {
  return (
    <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm" style={{ minHeight: 180 }}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {bengaliName || scenarioLabels[scenarioCode]}
            </h3>
            <p className="text-sm text-gray-500">
              {scenarioBangla[scenarioCode]} scenario
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{label || "Scenario"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-400">Yield</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatYield(yieldTPerHa)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Net Profit</p>
            <p className="text-xl font-bold text-green-600">
              {formatBdt(netProfitBdt)}
            </p>
          </div>
        </div>

        {/* Scenario-Specific Guidance Hint */}
        {scenarioCode === "low_rain" && (
          <p className="text-xs text-yellow-600">
            কম বৃষ্টিতে ফলন কম হতে পারে — সেচ বাড়ানোর পরিকল্পনা করুন।
          </p>
        )}
        {scenarioCode === "heavy_rain" && (
          <p className="text-xs text-blue-600">
            অতিবৃষ্টিতে নিষ্কাশন নিশ্চিত করুন।
          </p>
        )}
      </div>
    </div>
  );
};
