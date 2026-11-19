import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { farmsApi, geoApi } from "../api";

// Fix default marker icon paths for bundlers (safe even if markers not used)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function DrawControl({ featureGroupRef, onGeometryChange }) {
  const map = useMap();

  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: fg,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.2, weight: 2 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
    });

    map.addControl(drawControl);

    const handleCreated = (e) => {
      fg.clearLayers();
      fg.addLayer(e.layer);
      const geojson = e.layer.toGeoJSON();
      if (geojson?.geometry) onGeometryChange(geojson.geometry);
    };

    const handleEdited = () => {
      const layers = fg.getLayers();
      if (layers.length > 0) {
        const geojson = layers[0].toGeoJSON();
        if (geojson?.geometry) onGeometryChange(geojson.geometry);
      }
    };

    const handleDeleted = () => {
      onGeometryChange(null);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
    };
  }, [map, featureGroupRef, onGeometryChange]);

  return null;
}

function FitToBoundary({ boundary }) {
  const map = useMap();
  useEffect(() => {
    if (!boundary?.geojson) return;
    try {
      const layer = L.geoJSON({ type: "Feature", geometry: boundary.geojson, properties: {} });
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    } catch {
      // ignore invalid geometry
    }
  }, [boundary, map]);
  return null;
}

function formatArea(ha) {
  if (ha == null || Number.isNaN(Number(ha))) return "—";
  const n = Number(ha);
  return `${n.toFixed(4)} ha (${(n * 2.47105).toFixed(3)} acres, ${(n * 247.105).toFixed(2)} decimals)`;
}

export default function FarmMap() {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [draftGeometry, setDraftGeometry] = useState(null);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingBoundary, setLoadingBoundary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const featureGroupRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingFarms(true);
    farmsApi
      .listFarms()
      .then((res) => {
        if (cancelled) return;
        setFarms(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load farms." });
      })
      .finally(() => {
        if (!cancelled) setLoadingFarms(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchBoundary = async (farmId) => {
    if (!farmId) return;
    setLoadingBoundary(true);
    setMessage(null);
    try {
      const res = await geoApi.getBoundary(Number(farmId));
      setBoundary(res.data);
      setDraftGeometry(null);
      if (featureGroupRef.current) featureGroupRef.current.clearLayers();
    } catch (err) {
      // 404/no boundary is not fatal; show empty state
      setBoundary({ farm_id: Number(farmId), geojson: null, area_ha: null, updated_at: null });
      setDraftGeometry(null);
      if (featureGroupRef.current) featureGroupRef.current.clearLayers();
      if (err?.response?.status && err.response.status !== 404) {
        setMessage({ type: "error", text: "Failed to fetch farm boundary." });
      }
    } finally {
      setLoadingBoundary(false);
    }
  };

  useEffect(() => {
    if (selectedFarmId) fetchBoundary(selectedFarmId);
    else {
      setBoundary(null);
      setDraftGeometry(null);
      if (featureGroupRef.current) featureGroupRef.current.clearLayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarmId]);

  const handleSave = async () => {
    if (!selectedFarmId) {
      setMessage({ type: "error", text: "Select a farm first." });
      return;
    }
    if (!draftGeometry || draftGeometry.type !== "Polygon") {
      setMessage({ type: "error", text: "Draw a polygon boundary on the map before saving." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await geoApi.saveBoundary(Number(selectedFarmId), draftGeometry);
      setBoundary(res.data);
      setDraftGeometry(null);
      if (featureGroupRef.current) featureGroupRef.current.clearLayers();
      setMessage({
        type: "success",
        text: `Boundary saved. Calculated area: ${formatArea(res.data?.area_ha)}`,
      });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || "Failed to save boundary.";
      setMessage({ type: "error", text: String(detail) });
    } finally {
      setSaving(false);
    }
  };

  const selectedFarm = useMemo(
    () => farms.find((f) => String(f.id) === String(selectedFarmId)),
    [farms, selectedFarmId]
  );

  const savedGeoJson = boundary?.geojson
    ? { type: "Feature", geometry: boundary.geojson, properties: {} }
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Farm Mapping & Boundaries</h1>
        <p className="text-sm text-text-secondary mt-1">
          Draw, edit, and save farm boundary polygons. Area is calculated by the backend (hectares/acres/decimals).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-surface-card p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Select Farm
              </label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-500"
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                disabled={loadingFarms}
              >
                <option value="">{loadingFarms ? "Loading farms…" : "— choose a farm —"}</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    Farm #{f.id} · {f.district || "Unknown"} · {f.crop_code || "N/A"}
                  </option>
                ))}
              </select>
            </div>

            {selectedFarm && (
              <div className="text-xs text-text-secondary space-y-1.5 bg-surface/60 rounded-lg p-3 border border-border/60">
                <div className="flex justify-between"><span>Farmer</span><span className="text-text-primary">{selectedFarm.farmer_name || "—"}</span></div>
                <div className="flex justify-between"><span>Registered area</span><span className="text-text-primary">{selectedFarm.area_ha ?? "—"} ha</span></div>
                <div className="flex justify-between"><span>Location</span><span className="text-text-primary">{selectedFarm.district}{selectedFarm.upazila ? `, ${selectedFarm.upazila}` : ""}</span></div>
              </div>
            )}

            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Saved Boundary (from API)</p>
              {loadingBoundary ? (
                <p className="text-sm text-text-secondary">Loading boundary…</p>
              ) : boundary?.area_ha != null ? (
                <>
                  <p className="text-sm font-semibold text-text-primary">{formatArea(boundary.area_ha)}</p>
                  <p className="text-[11px] text-text-secondary">
                    Updated: {boundary.updated_at ? new Date(boundary.updated_at).toLocaleString() : "—"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">No boundary saved for this farm yet.</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedFarmId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : "Save Boundary"}
            </button>

            {draftGeometry && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                Unsaved polygon drawn. Click “Save Boundary” to send it to the backend and calculate area.
              </p>
            )}

            {message && (
              <div
                className={`text-sm rounded-lg p-3 border ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-surface-card p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">How to use</p>
            <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
              <li>Select a farm.</li>
              <li>Use the polygon tool to draw the boundary.</li>
              <li>Edit vertices if needed, then save.</li>
              <li>Saved area is fetched/calculated by the backend API.</li>
            </ol>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-2">
          <div className="rounded-xl overflow-hidden border border-border shadow-sm" style={{ height: 560 }}>
            <MapContainer center={[23.685, 90.3563]} zoom={7} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Saved boundary from backend */}
              {savedGeoJson && !draftGeometry && (
                <>
                  <GeoJSON
                    key={JSON.stringify(savedGeoJson)}
                    data={savedGeoJson}
                    style={{ color: "#10b981", weight: 2, fillColor: "#10b981", fillOpacity: 0.2 }}
                  />
                  <FitToBoundary boundary={boundary} />
                </>
              )}

              {/* Draw/edit layer for new or updated polygon */}
              <FeatureGroup ref={featureGroupRef}>
                <DrawControl featureGroupRef={featureGroupRef} onGeometryChange={setDraftGeometry} />
              </FeatureGroup>
            </MapContainer>
          </div>
          <p className="text-xs text-text-muted text-center">
            Uses <code>react-leaflet</code> + <code>leaflet-draw</code>. Boundary save/fetch via <code>geoApi</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
