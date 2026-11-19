/**
 * App.jsx - Main Dashboard View
 * Integration assembly for V1 screens following the logical vertical scroll journey:
 * Farm List → Farm Overview → Scenario Comparison → Today's Tasks → Bengali Advisor Chat
 *
 * SOLID: Single Responsibility - orchestrates component composition only
 *        Dependency Inversion: depends on hooks and api, not concrete HTTP logic
 */
import React, { useState, useEffect } from "react";
import { useFarmAssistant } from "./hooks/useFarmAssistant";
import { BengaliAdvisorChat } from "./components/BengaliAdvisorChat";
import { ScenarioComparison } from "./components/ScenarioComparison";
import { FarmTasksPanel } from "./components/FarmTasksPanel";
import DisclaimerBanner from "./components/DisclaimerBanner";
import { api } from "./api";

const App = () => {
  const [farms, setFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState(null);

  // Fetch farms on mount
  useEffect(() => {
    const loadFarms = async () => {
      setFarmsLoading(true);
      try {
        const response = await api.get("/api/farms/");
        setFarms(response.data || []);
        setFarmsError(null);
      } catch (err) {
        console.error("Failed to load farms:", err);
        setFarmsError("ফার্ম লোড করা যায়নি। ব্যাকএন্ড চলছে কিনা নিশ্চিত করুন।");
      } finally {
        setFarmsLoading(false);
      }
    };
    loadFarms();
  }, []);

  // Fetch advisory data for the selected farm
  const { data, loading, error } = useFarmAssistant(selectedFarmId ?? 0);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  // ── Loading state ──────────────────────────────────────────────
  if (farmsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">ফার্ম লোড হচ্ছে…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (farmsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">YieldMax V1</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 font-medium">সংযোগ ত্রুটি</p>
          <p className="text-red-600 text-sm mt-1">{farmsError}</p>
          <button
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  // ── No farms state ─────────────────────────────────────────────
  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          YieldMax V1 — Agritech Dashboard
        </h1>
        <div className="bg-white rounded-xl border p-8 text-center shadow-sm">
          <p className="text-4xl mb-4">🌾</p>
          <p className="text-gray-600 mb-2 font-medium">কোনো ফার্ম পাওয়া যায়নি।</p>
          <p className="text-gray-400 text-sm mb-6">
            প্রথমে একটি ফার্ম তৈরি করুন অথবা ব্যাকএন্ড সিডিং চালান।
          </p>
          <code className="text-xs bg-gray-100 px-3 py-2 rounded block mb-4 text-left">
            docker exec yieldmax-backend python manage.py seed_guidelines
          </code>
        </div>
      </div>
    );
  }

  // ── Farm list (no selection yet) ───────────────────────────────
  if (!selectedFarmId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          YieldMax V1 — ফার্ম বেছে নিন
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {farms.map((farm) => (
            <button
              key={farm.id}
              className="bg-white rounded-xl border p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer text-left w-full"
              onClick={() => setSelectedFarmId(farm.id)}
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {farm.farmer_name}
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                {farm.crop_code} &bull; {farm.area_ha} ha &bull; {farm.district}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {farm.upazila} &bull; {farm.land_type}
              </p>
            </button>
          ))}
        </div>
        <p className="text-gray-400 text-sm">
          উপরের ফার্ম নির্বাচন করুন — ফলন তুলনা, কৃষি কাজ এবং AI উপদেষ্টা দেখতে পাবেন।
        </p>
      </div>
    );
  }

  // ── Full dashboard for selected farm ──────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedFarmId(null)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="Back to farm list"
            >
              ← ফার্ম তালিকা
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">
              YieldMax V1 &bull; {selectedFarm?.farmer_name || "ফার্ম"}
            </h1>
          </div>
          <span className="text-xs text-gray-400">Farm ID: {selectedFarmId}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Advisory loading / error */}
        {loading && (
          <div className="text-center py-6 text-sm text-gray-500 animate-pulse">
            উপদেষ্টার তথ্য লোড হচ্ছে…
          </div>
        )}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* === Section 1: Farm Overview + Scenario Comparison === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Farm Overview */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ফার্মের বিবরণ
            </h2>
            <div className="bg-white rounded-xl border p-5 shadow-sm mb-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">ফসল</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedFarm?.crop_code || data?.crop_code || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">জমির পরিমাণ</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedFarm?.area_ha || "—"} ha
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">জেলা</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedFarm?.district || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">উপজেলা</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedFarm?.upazila || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">রোপণের পর দিন</dt>
                  <dd className="font-medium text-gray-900">
                    {data?.days_after_transplant != null
                      ? `${data.days_after_transplant} দিন`
                      : "নির্ধারিত নয়"}
                  </dd>
                </div>
              </dl>
            </div>

            <DisclaimerBanner />
          </div>

          {/* Scenario Comparison */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              পরিস্থিতি তুলনা (প্রোটোটাইপ)
            </h2>
            <div className="space-y-3">
              <ScenarioComparison
                scenarioCode="normal"
                yieldTPerHa={5.0}
                netProfitBdt={150000}
                label="Normal"
                bengaliName="স্বাভাবিক বৃষ্টি"
              />
              <ScenarioComparison
                scenarioCode="low_rain"
                yieldTPerHa={4.0}
                netProfitBdt={105000}
                label="Low Rain"
                bengaliName="কম বৃষ্টি"
              />
              <ScenarioComparison
                scenarioCode="heavy_rain"
                yieldTPerHa={4.5}
                netProfitBdt={120000}
                label="Heavy Rain"
                bengaliName="অতিবৃষ্টি"
              />
            </div>
          </div>
        </div>

        {/* === Section 2: Today's Farm Tasks === */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">আজকের কাজ</h2>
        <FarmTasksPanel
          daysAfterTransplant={data?.days_after_transplant ?? null}
          doNow={data?.do_now || []}
          comingUp={data?.coming_up || []}
        />

        {/* === Section 3: Bengali Advisor Chat === */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          বাংলা কৃষি উপদেষ্টা
        </h2>
        <BengaliAdvisorChat
          farmId={selectedFarmId}
          farmerName={selectedFarm?.farmer_name || ""}
          cropCode={selectedFarm?.crop_code || "boro_rice"}
          areaHa={selectedFarm?.area_ha || 0}
        />
      </main>
    </div>
  );
};

export default App;
