/**
 * Satellite.tsx — Satellite imagery and NDVI visualization
 */
import { useEffect, useState } from "react";
import { farmsApi, satelliteApi, type Farm, type NDVIResponse, type SatelliteImageryResponse } from "../api";
import { Card, SectionHeader, Badge } from "../components/ui";
import { Satellite as SatelliteIcon, TrendingUp, Info, AlertTriangle, CloudOff } from "lucide-react";

type Tab = "imagery" | "ndvi";

// Simple SVG line chart for NDVI timeseries
function NDVIChart({ observations }: { observations: NDVIResponse["observations"] }) {
  if (!observations.length) return null;

  const W = 600;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = observations.map((o) => o.ndvi_mean);
  const minV = Math.min(...values) - 0.05;
  const maxV = Math.max(...values) + 0.05;

  const xScale = (i: number) => PAD.left + (i / (observations.length - 1 || 1)) * plotW;
  const yScale = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * plotH;

  const pathD = observations.map((o, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(o.ndvi_mean).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${xScale(observations.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  // Y-axis labels
  const yTicks = [minV, (minV + maxV) / 2, maxV].map((v) => ({ v, y: yScale(v) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid lines */}
      {yTicks.map(({ y }, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#374151" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {/* Area fill */}
      <path d={areaD} fill="rgba(16,185,129,0.12)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Data points */}
      {observations.map((o, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(o.ndvi_mean)} r="4" fill="#10b981" stroke="#090d16" strokeWidth="1.5">
          <title>{`${o.date}: NDVI ${o.ndvi_mean.toFixed(3)}`}</title>
        </circle>
      ))}
      {/* Y-axis labels */}
      {yTicks.map(({ v, y }, i) => (
        <text key={i} x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">
          {v.toFixed(2)}
        </text>
      ))}
      {/* X-axis date labels (every other) */}
      {observations.map((o, i) =>
        i % Math.ceil(observations.length / 5) === 0 ? (
          <text key={i} x={xScale(i)} y={H - 8} textAnchor="middle" fill="#6b7280" fontSize="10">
            {o.date.slice(5)}
          </text>
        ) : null
      )}
      {/* Axis labels */}
      <text x={PAD.left - 35} y={PAD.top + plotH / 2} textAnchor="middle" fill="#9ca3af" fontSize="11" transform={`rotate(-90,${PAD.left - 35},${PAD.top + plotH / 2})`}>
        NDVI
      </text>
    </svg>
  );
}

export default function Satellite() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("ndvi");
  const [imagery, setImagery] = useState<SatelliteImageryResponse | null>(null);
  const [ndvi, setNdvi] = useState<NDVIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmsApi.listFarms().then((r) => setFarms(r.data));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    setImagery(null);
    setNdvi(null);

    Promise.all([
      satelliteApi.getImagery(selectedFarmId),
      satelliteApi.getNDVI(selectedFarmId),
    ])
      .then(([imgRes, ndviRes]) => {
        setImagery(imgRes.data);
        setNdvi(ndviRes.data);
      })
      .catch(() => setError("Failed to load satellite data. Please try again."))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SectionHeader
        title="Satellite & NDVI"
        subtitle="View satellite imagery and vegetation index observations for your farm."
        icon={SatelliteIcon}
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
                Farm #{f.id} · {f.district} · {f.crop_code}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!selectedFarmId && (
        <div className="text-center py-16 text-text-secondary">
          <SatelliteIcon size={48} className="mx-auto mb-4 opacity-30" />
          <p>Select a farm to view satellite data.</p>
        </div>
      )}

      {selectedFarmId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 bg-surface-card/60 p-1 rounded-xl border border-border/60 w-fit">
            {([["ndvi", "NDVI Observations"], ["imagery", "Satellite Imagery"]] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-12 text-text-secondary">
              <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading satellite data…</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex items-center gap-3 text-rose-300">
              <AlertTriangle size={20} className="shrink-0" />
              {error}
            </div>
          )}

          {/* NDVI Tab */}
          {!loading && !error && tab === "ndvi" && ndvi && (
            <div className="space-y-4">
              {ndvi.is_prototype_data && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-200">
                    <strong>Prototype Data</strong> — {ndvi.disclaimer}
                  </div>
                </div>
              )}

              <Card>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" />
                      <h3 className="font-semibold text-text-primary">NDVI Time Series</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {ndvi.is_prototype_data && <Badge variant="warning">Prototype</Badge>}
                      <span className="text-xs text-text-secondary">{ndvi.observations.length} observations</span>
                    </div>
                  </div>

                  <NDVIChart observations={ndvi.observations} />

                  <p className="text-xs text-text-muted">Source: {ndvi.source}</p>
                </div>
              </Card>

              {/* Observation table */}
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="font-semibold text-text-primary text-sm">Observation Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-text-secondary border-b border-border">
                          <th className="text-left pb-2 font-semibold">Date</th>
                          <th className="text-right pb-2 font-semibold">NDVI Mean</th>
                          <th className="text-right pb-2 font-semibold">Min</th>
                          <th className="text-right pb-2 font-semibold">Max</th>
                          <th className="text-right pb-2 font-semibold">Cloud %</th>
                          <th className="text-left pb-2 font-semibold pl-4">Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {ndvi.observations.map((o, i) => (
                          <tr key={i} className="text-text-primary hover:bg-surface/40 transition-colors">
                            <td className="py-2 font-mono">{o.date}</td>
                            <td className="py-2 text-right font-bold text-emerald-400">{o.ndvi_mean.toFixed(3)}</td>
                            <td className="py-2 text-right text-text-secondary">{o.ndvi_min?.toFixed(3) ?? "—"}</td>
                            <td className="py-2 text-right text-text-secondary">{o.ndvi_max?.toFixed(3) ?? "—"}</td>
                            <td className="py-2 text-right">
                              {o.cloud_cover_pct != null ? (
                                <span className={o.cloud_cover_pct > 50 ? "text-amber-400" : "text-text-secondary"}>
                                  {o.cloud_cover_pct}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="py-2 pl-4 text-text-secondary">{o.stage_hint ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Imagery Tab */}
          {!loading && !error && tab === "imagery" && imagery && (
            <div className="space-y-4">
              {!imagery.data_available ? (
                <Card>
                  <div className="p-10 text-center space-y-4">
                    <CloudOff size={48} className="mx-auto text-text-muted opacity-50" />
                    <div>
                      <h3 className="text-text-primary font-semibold mb-1">No Satellite Imagery Available</h3>
                      <p className="text-text-secondary text-sm max-w-md mx-auto">
                        {imagery.message ?? "Real satellite imagery requires Sentinel Hub API credentials. Set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET to enable this feature."}
                      </p>
                    </div>
                    {imagery.is_prototype_data && (
                      <Badge variant="warning">Prototype Mode — No Real Imagery</Badge>
                    )}
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="p-5">
                    <p className="text-text-secondary text-sm">{imagery.imagery.length} imagery records found.</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
