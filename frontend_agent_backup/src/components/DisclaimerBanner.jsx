/**
 * DisclaimerBanner.jsx
 * Renders "Prototype Estimate" and "Demo Assumption" badges so farmers
 * never mistake static scenarios for real-time meteorological weather forecasts.
 *
 * SOLID: Single Responsibility - only renders disclaimer badges
 */
import React from "react";

const DisclaimerBanner = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4 mb-6">
      {/* Prototype Estimate Badge */}
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        📊 Prototype Estimate
      </span>

      {/* Demo Assumption Badge */}
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        ⚠️ Demo Assumption
      </span>

      <p className="text-xs text-yellow-700 mt-1 w-full">
        এই পরিসংখ্যানগুলো প্রোটোটাইপ অনুমান। বাস্তব আবহাওয়া পূর্বাভাস নয়।
      </p>
    </div>
  );
};

export default DisclaimerBanner;
