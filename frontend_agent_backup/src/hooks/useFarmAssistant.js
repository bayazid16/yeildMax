import { useEffect, useState } from "react";
import { api } from "../api";

/**
 * Custom Hook: useFarmAssistant
 * Encapsulates API calls for fetching farm advisory data.
 * Facade Pattern: Hides Axios logic from UI components.
 *
 * SOLID: Single Responsibility - only handles farm advisor data fetching
 *         Dependency Inversion - depends on api abstraction, not concrete HTTP
 *
 * @param {number} farmId - 0 means "no farm selected", skip fetching
 */
export const useFarmAssistant = (farmId) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    // Don't fetch when no farm is selected
    if (!farmId || farmId <= 0) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchFarmData = async () => {
      setState({ loading: true, error: null, data: null });

      try {
        const response = await api.get(`/api/advisory/${farmId}/`);

        if (cancelled) return;

        const {
          crop_code,
          days_after_transplant,
          do_now,
          coming_up,
        } = response.data;

        const data = {
          crop_code: crop_code || "",
          area_ha: response.data.area_ha || 0,
          days_after_transplant: days_after_transplant ?? null,
          do_now: do_now || [],
          coming_up: coming_up || [],
        };

        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (err) {
        if (cancelled) return;

        let errorMessage = "ব্যাকএন্ড পাওয়া যাচ্ছে না।";
        if (err.response?.status === 404) {
          errorMessage = "ফার্ম পাওয়া যায়নি।";
        } else if (err.response?.status === 400) {
          errorMessage = err.response?.data?.detail || "অনুরোধে সমস্যা আছে।";
        } else if (err.response?.status === 503) {
          errorMessage = "উপদেষ্টা সেবা অনুপলব্ধ।";
        } else if (!err.response) {
          errorMessage = "নেটওয়ার্ক ত্রুটি — সংযোগ পরীক্ষা করুন।";
        }

        if (!cancelled) {
          setState({ data: null, loading: false, error: errorMessage });
        }
      }
    };

    fetchFarmData();

    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return {
    ...state,
    retry: () => setState({ data: null, loading: true, error: null }),
  };
};
