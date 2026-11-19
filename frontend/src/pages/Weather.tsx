/**
 * Weather.tsx — Weather dashboard for selected farm
 */
import { useEffect, useState } from "react";
import { farmsApi, weatherApi, type Farm, type WeatherResponse } from "../api";
import { Card, SectionHeader, Badge } from "../components/ui";
import {
  CloudRain, Thermometer, Wind, Droplets, Info, AlertTriangle, Sun
} from "lucide-react";

function ScenarioBadge({ scenario }: { scenario: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    normal: { label: "Normal Rain", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    low_rain: { label: "Low Rain / Drought", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    heavy_rain: { label: "Heavy Rain / Flood", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  };
  const s = map[scenario] ?? { label: scenario, cls: "bg-surface text-text-secondary border-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

type WeatherCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
};

function WeatherCard({ icon, label, value, sub, color = "text-text-primary" }: WeatherCardProps) {
  return (
    <Card>
      <div className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-surface/80 border border-border/60">{icon}</div>
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-text-muted">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function Weather() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmsApi.listFarms().then((r) => setFarms(r.data));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    setData(null);

    weatherApi
      .getWeather(selectedFarmId)
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load weather data. Please try again."))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  const w = data?.weather;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SectionHeader
        title="Weather Dashboard"
        subtitle="Current weather conditions and rainfall scenario for your farm's district."
        icon={CloudRain}
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
          <CloudRain size={48} className="mx-auto mb-4 opacity-30" />
          <p>Select a farm to view weather data.</p>
        </div>
      )}

      {selectedFarmId && loading && (
        <div className="text-center py-12 text-text-secondary">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Loading weather data…</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex items-center gap-3 text-rose-300">
          <AlertTriangle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {data && w && (
        <div className="space-y-5">
          {/* Prototype disclaimer */}
          {data.is_prototype_data && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-200">
                <strong>Prototype Data</strong> — {data.disclaimer}
              </div>
            </div>
          )}

          {/* Header strip */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-text-primary">{data.district}</h2>
            <Badge variant={data.is_prototype_data ? "warning" : "success"}>
              {data.is_prototype_data ? "Prototype" : "Live"}
            </Badge>
            <ScenarioBadge scenario={w.rainfall_scenario} />
            <span className="text-xs text-text-muted ml-auto">
              Retrieved: {new Date(data.retrieved_at).toLocaleString()}
            </span>
          </div>

          {/* Description */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
            <Sun size={18} className="text-blue-300 shrink-0" />
            <span className="text-blue-200 text-sm font-medium">{w.description}</span>
            <span className="text-xs text-text-muted ml-auto capitalize">{w.season} Season</span>
          </div>

          {/* Weather cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <WeatherCard
              icon={<Thermometer size={22} className="text-orange-400" />}
              label="Temperature"
              value={`${w.temperature_c}°C`}
              sub={`Min ${w.temperature_min_c}°C · Max ${w.temperature_max_c}°C`}
              color="text-orange-300"
            />
            <WeatherCard
              icon={<Droplets size={22} className="text-blue-400" />}
              label="Humidity"
              value={`${w.humidity_pct}%`}
              sub="Relative humidity"
              color="text-blue-300"
            />
            <WeatherCard
              icon={<CloudRain size={22} className="text-cyan-400" />}
              label="Rainfall (7-day)"
              value={`${w.rainfall_mm_7d} mm`}
              sub="Cumulative 7-day total"
              color="text-cyan-300"
            />
            <WeatherCard
              icon={<Wind size={22} className="text-indigo-400" />}
              label="Wind Speed"
              value={`${w.wind_speed_kmh} km/h`}
              sub="Average wind speed"
              color="text-indigo-300"
            />
          </div>

          {/* Source */}
          <p className="text-xs text-text-muted text-right">Source: {data.source}</p>
        </div>
      )}
    </div>
  );
}
