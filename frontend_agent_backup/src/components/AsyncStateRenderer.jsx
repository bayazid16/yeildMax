/**
 * AsyncStateRenderer.jsx
 * State Wrapper Pattern: Reusable component to handle all required V1 UI states
 * without repetitive if/else blocks.
 *
 * SOLID: Single Responsibility - only handles state rendering logic
 *         Open/Closed - extensible state types without modifying core logic
 */
import React from "react";

/**
 * A reusable wrapper component that cleanly handles all V1 states.
 *
 * Usage:
 * <AsyncStateRenderer
 *   state="loading" | "invalidInput" | "backendUnavailable" | "success" | ...
 *   error="optional error message"
 *   data={anyData}
 *   loading={<Skeleton />}
 *   invalidInput={(err) => <p className="text-red-600">{err}</p>}
 *   backendUnavailable={(err) => <ErrorCard error={err} />}
 *   advisorUnavailable={() => <DisclaimerBanner />}
 *   noAdvisoryAvailable={() => <EmptyState />}
 *   success={(data) => <ScenarioComparison data={data} />}
 * />
 */
const AsyncStateRenderer = ({
  loading,
  invalidInput,
  backendUnavailable,
  advisorUnavailable,
  noAdvisoryAvailable,
  success,
  state,
  error,
  data,
}) => {
  switch (state) {
    case "loading":
      return loading ?? <div className="p-4 text-gray-500 animate-pulse">Loading...</div>;

    case "invalidInput":
      return typeof invalidInput === "function"
        ? invalidInput(error ?? "Invalid input")
        : <p className="text-red-600 p-4">{error ?? "Invalid input"}</p>;

    case "backendUnavailable":
      return typeof backendUnavailable === "function"
        ? backendUnavailable(error ?? "Backend unavailable")
        : <p className="text-red-600 p-4">{error ?? "Backend unavailable"}</p>;

    case "advisorUnavailable":
      return typeof advisorUnavailable === "function"
        ? advisorUnavailable()
        : null;

    case "noAdvisoryAvailable":
      return typeof noAdvisoryAvailable === "function"
        ? noAdvisoryAvailable()
        : null;

    case "success":
      return typeof success === "function"
        ? success(data)
        : null;

    default:
      return loading ?? <div className="p-4 text-gray-500 animate-pulse">Loading...</div>;
  }
};

export default AsyncStateRenderer;
