import { useEffect, useState } from "react";
import { farmsApi, soilApi, weatherApi, type Farm, type SoilResponse, type WeatherResponse } from "../api";
import { Card, SectionHeader, Badge } from "../components/ui";
import { CloudRain, FlaskConical, AlertTriangle, Thermometer, Droplets, Wind } from "lucide-react";

export default function SoilWeatherAnalysis() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [soil, setSoil] = useState<SoilResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmsApi.listFarms().then((r) => setFarms(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    setError(null);
    setSoil(null);
    setWeather(null);
    Promise.all([soilApi.getSoil(selectedFarmId), weatherApi.getWeather(selectedFarmId)])
      .then(([s, w]) => {
        setSoil(s.data);
        setWeather(w.data);
      })
      .catch(() => setError("Failed to load soil/weather analysis. Please try again."))
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SectionHeader
        title="Soil & Weather Analysis"
        subtitle="Combined soil properties and current weather context for your farm (V2)."
        icon={FlaskConical}
      />

      <Card>
        <div className="p-5">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Select Farm</label>
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
          <CloudRain size={48} className="mx-auto mb-4 opacity-30" />
          <p>Select a farm to view soil & weather analysis.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-text-secondary">
          <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Loading analysis…</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 flex items-center gap-3 text-rose-300">
          <AlertTriangle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {soil && weather && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <FlaskConical size={18} className="text-amber-400" /> Soil Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-secondary">pH</span><p className="text-text-primary font-semibold">{soil.soil.ph}</p></div>
                <div><span className="text-text-secondary">Soil Type</span><p className="text-text-primary font-semibold">{soil.soil.soil_type}</p></div>
                <div><span className="text-text-secondary">Organic Matter</span><p className="text-text-primary font-semibold">{soil.soil.organic_matter_pct}%</p></div>
                <div><span className="text-text-secondary">Drainage</span><p className="text-text-primary font-semibold">{soil.soil.drainage}</p></div>
              </div>
              <p className="text-xs text-text-muted">Overall: {soil.interpretation.overall}</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <CloudRain size={18} className="text-sky-400" /> Weather Snapshot
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Thermometer size={16} className="text-rose-400" /><div><span className="text-text-secondary">Temp</span><p className="text-text-primary font-semibold">{weather.weather.temperature_c}°C</p></div></div>
                <div className="flex items-center gap-2"><Droplets size={16} className="text-sky-400" /><div><span className="text-text-secondary">Humidity</span><p className="text-text-primary font-semibold">{weather.weather.humidity_pct}%</p></div></div>
                <div className="flex items-center gap-2"><CloudRain size={16} className="text-blue-400" /><div><span className="text-text-secondary">Rainfall (7d)</span><p className="text-text-primary font-semibold">{weather.weather.rainfall_mm_7d} mm</p></div></div>
                <div className="flex items-center gap-2"><Wind size={16} className="text-text-secondary" /><div><span className="text-text-secondary">Wind</span><p className="text-text-primary font-semibold">{weather.weather.wind_speed_kmh} km/h</p></div></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    weather.weather.rainfall_scenario === "normal"
                      ? "success"
                      : weather.weather.rainfall_scenario === "low_rain"
                      ? "warning"
                      : "info"
                  }
                >
                  {weather.weather.rainfall_scenario === "normal"
                    ? "Normal Rain"
                    : weather.weather.rainfall_scenario === "low_rain"
                    ? "Low Rain / Drought"
                    : "Heavy Rain / Flood"}
                </Badge>
                <span className="text-xs text-text-secondary">{weather.weather.description}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}