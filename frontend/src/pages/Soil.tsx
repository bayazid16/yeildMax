/**
 * Soil.tsx — Soil analysis and crop suitability dashboard
 */
import { useEffect, useState } from "react";
import {
  farmsApi, soilApi,
  type Farm, type SoilResponse, type CropSuitabilityResponse, type CropSuitabilityEntry
} from "../api";
import { Card, SectionHeader } from "../components/ui";
import { FlaskConical, Leaf, Info, AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";

type Tab = "soil" | "crops";

// Simple horizontal bar for pH visualization
function PHBar({ ph }: { ph: number }) {
  // pH 0-14, optimal 6-7
  const pct = (ph / 14) * 100;
  const color = ph < 5.5 ? "#ef4444" : ph <= 7.0 ? "#10b981" : ph <= 8.0 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-text-secondary">
        <span>Acidic (0)</span>
        <span className="font-bold" style={{ color }}>pH {ph}</span>
        <span>Alkaline (14)</span>
      </div>
      <div className="h-3 bg-surface rounded-full overflow-hidden border border-border/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-center gap-6 text-xs text-text-muted">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Optimal (6–7)</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    optimal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    good: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    adequate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    moderate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    sufficient: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    low: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    deficient: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    acidic: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    alkaline: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    needs_attention: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };
  const cls = map[status] ?? "bg-surface text-text-secondary border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function RatingBadge({ rating }: { rating: CropSuitabilityEntry["rating"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    highly_suitable: { label: "Highly Suitable", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    suitable: { label: "Suitable", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    marginal: { label: "Marginal", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    not_suitable: { label: "Not Suitable", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  };
  const s = map[rating] ?? { label: rating, cls: "bg-surface text-text-secondary border-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function FeatureCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-400" : "text-rose-400"}`}>
      {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </div>
  );
}

export default function Soil() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("soil");
  const [soil, setSoil] = useState<SoilResponse | null>(null);
  const [crops, setCrops] = useState<CropSuitabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmsApi.listFarms().then((r) => setFarms(r.data));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    setSoil(null);
    setCrops(null);

    Promise.all([
      soilApi.getSoil(selectedFarmId),
      soilApi.getCropSuitability(selectedFarmId),
    ])
      .then(([soilRes, cropsRes]) => {
        setSoil(soilRes.data);
        setCrops(cropsRes.data);
      })
      .catch(() => setError("Failed to load soil data. Please try again."))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  const soilProps = soil
    ? [
        { label: "pH", value: soil.soil.ph.toString(), status: soil.interpretation.ph_status },
        { label: "Organic Matter", value: `${soil.soil.organic_matter_pct}%`, status: soil.interpretation.organic_matter_status },
        { label: "Nitrogen (N)", value: `${soil.soil.nitrogen_ppm} ppm`, status: soil.interpretation.nitrogen_status },
        { label: "Phosphorus (P)", value: `${soil.soil.phosphorus_ppm} ppm`, status: null },
        { label: "Potassium (K)", value: `${soil.soil.potassium_ppm} ppm`, status: null },
        { label: "CEC", value: `${soil.soil.cec_meq_100g} meq/100g`, status: null },
        { label: "Drainage", value: soil.soil.drainage, status: null },
        { label: "Texture", value: soil.soil.texture, status: null },
        { label: "Soil Type", value: soil.soil.soil_type, status: null },
      ]
    : [];

  const sortedCrops = crops
    ? Object.entries(crops.suitability).sort((a, b) => {
        const order = { highly_suitable: 0, suitable: 1, marginal: 2, not_suitable: 3 };
        return (order[a[1].rating] ?? 9) - (order[b[1].rating] ?? 9);
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SectionHeader
        title="Soil & Crop Suitability"
        subtitle="Soil analysis and crop suitability assessment based on your farm's land type and location."
        icon={FlaskConical}
      />

      {/* Farm selector */}
      <Card>
        <div className="p-5">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
            Select Farm
          </label>
          <select
            className="w-full max-w-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-emerald-500"
            value={selectedFarmId ?? ""}
            onChange={(e) => setSelectedFarmId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— choose a farm —</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                Farm #{f.id} · {f.district} · {f.land_type} · {f.crop_code}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!selectedFarmId && (
        <div className="text-center py-16 text-text-secondary">
          <FlaskConical size={48} className="mx-auto mb-4 opacity-30" />
          <p>Select a farm to view soil data.</p>
        </div>
      )}

      {selectedFarmId && loading && (
        <div className="text-center py-12 text-text-secondary">
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Loading soil data…</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex items-center gap-3 text-rose-300">
          <AlertTriangle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {soil && crops && (
        <div className="space-y-5">
          {/* Prototype disclaimer */}
          {soil.is_prototype_data && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-200">
                <strong>Prototype Data</strong> — {soil.disclaimer}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 bg-surface-card/60 p-1 rounded-xl border border-border/60 w-fit">
            {([["soil", "Soil Analysis"], ["crops", "Crop Suitability"]] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Soil Analysis Tab */}
          {tab === "soil" && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <div className="p-4 text-center">
                    <p className="text-xs text-text-secondary uppercase tracking-wider">Land Type</p>
                    <p className="text-lg font-bold text-text-primary capitalize">{soil.land_type}</p>
                  </div>
                </Card>
                <Card>
                  <div className="p-4 text-center">
                    <p className="text-xs text-text-secondary uppercase tracking-wider">District</p>
                    <p className="text-lg font-bold text-text-primary">{soil.district}</p>
                  </div>
                </Card>
                <Card>
                  <div className="p-4 text-center">
                    <p className="text-xs text-text-secondary uppercase tracking-wider">Overall Health</p>
                    <StatusBadge status={soil.interpretation.overall} />
                  </div>
                </Card>
                <Card>
                  <div className="p-4 text-center">
                    <p className="text-xs text-text-secondary uppercase tracking-wider">Soil Type</p>
                    <p className="text-sm font-semibold text-text-primary">{soil.soil.soil_type}</p>
                  </div>
                </Card>
              </div>

              {/* pH Bar */}
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <FlaskConical size={16} className="text-amber-400" />
                    Soil pH
                  </h3>
                  <PHBar ph={soil.soil.ph} />
                </div>
              </Card>

              {/* Properties grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {soilProps.map((p) => (
                  <Card key={p.label}>
                    <div className="p-4 flex items-start justify-between">
                      <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">{p.label}</p>
                        <p className="text-xl font-bold text-text-primary mt-1">{p.value}</p>
                      </div>
                      {p.status && <StatusBadge status={p.status} />}
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-xs text-text-muted">Source: {soil.soil.source}</p>
            </div>
          )}

          {/* Crop Suitability Tab */}
          {tab === "crops" && (
            <div className="space-y-4">
              {/* Disclaimer */}
              <div className="bg-surface-card/50 border border-border/60 rounded-xl p-4 flex items-start gap-3">
                <MinusCircle size={16} className="text-text-secondary mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary">{crops.disclaimer}</p>
              </div>

              {/* Info strip */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-text-secondary">
                  Current crop: <strong className="text-emerald-400">{crops.current_crop}</strong>
                </span>
                <span className="text-text-secondary">
                  Land type: <strong className="text-text-primary capitalize">{crops.land_type}</strong>
                </span>
                <span className="text-text-muted ml-auto text-xs">
                  Assessed: {new Date(crops.assessed_at).toLocaleDateString()}
                </span>
              </div>

              {/* Crop cards */}
              <div className="space-y-3">
                {sortedCrops.map(([key, entry]) => (
                  <Card key={key}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Leaf size={18} className="text-emerald-400 shrink-0" />
                          <h3 className="font-semibold text-text-primary">
                            {entry.crop_name}
                            {key === crops.current_crop && (
                              <span className="ml-2 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                Current Crop
                              </span>
                            )}
                          </h3>
                        </div>
                        <RatingBadge rating={entry.rating} />
                      </div>

                      <p className="text-sm text-text-secondary">{entry.reason}</p>

                      <div className="flex flex-wrap gap-4">
                        <div className="text-xs text-text-muted">
                          💧 {entry.water_requirement}
                        </div>
                        <FeatureCheck ok={entry.ph_in_range} label="pH in range" />
                        <FeatureCheck ok={entry.organic_matter_in_range} label="OM in range" />
                        <FeatureCheck ok={entry.land_type_suitable} label="Land type" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
