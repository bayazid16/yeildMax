/**
 * FarmMap.tsx — Interactive farm boundary drawing using Leaflet (CDN)
 * Leaflet and Leaflet.Draw are loaded via CDN to avoid npm install requirement.
 */
import { useEffect, useRef, useState } from "react";
import { farmsApi, geoApi, type Farm, type FarmBoundary } from "../api";
import { Card, Button, SectionHeader, Badge } from "../components/ui";
import { Map, Save, Trash2, Ruler, AlertTriangle, CheckCircle } from "lucide-react";

type AreaUnit = "ha" | "acres" | "decimals";

function convertArea(ha: number, unit: AreaUnit): string {
  if (unit === "ha") return `${ha.toFixed(4)} ha`;
  if (unit === "acres") return `${(ha * 2.47105).toFixed(3)} acres`;
  return `${(ha * 247.105).toFixed(2)} decimals`;
}

// Inject Leaflet + Leaflet.Draw CDN scripts once
function ensureLeafletScripts(): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L?.Control?.Draw) {
      resolve();
      return;
    }

    const scripts: { id: string; src: string }[] = [
      { id: "leaflet-js", src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" },
      { id: "leaflet-draw-js", src: "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js" },
    ];

    const links: { id: string; href: string }[] = [
      { id: "leaflet-css", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" },
      { id: "leaflet-draw-css", href: "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" },
    ];

    // Inject CSS first (non-blocking)
    links.forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });

    // Load scripts sequentially
    function loadScript(index: number) {
      if (index >= scripts.length) {
        resolve();
        return;
      }
      const { id, src } = scripts[index];
      if (document.getElementById(id)) {
        loadScript(index + 1);
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.onload = () => loadScript(index + 1);
      script.onerror = () => loadScript(index + 1); // try next even if failed
      document.head.appendChild(script);
    }
    loadScript(0);
  });
}

export default function FarmMap() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [boundary, setBoundary] = useState<FarmBoundary | null>(null);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("ha");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boundaryLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentGeojsonRef = useRef<any>(null);

  // Load farms
  useEffect(() => {
    farmsApi.listFarms().then((r) => setFarms(r.data));
  }, []);

  // Load Leaflet CDN scripts
  useEffect(() => {
    ensureLeafletScripts().then(() => setScriptsLoaded(true));
  }, []);

  // Init Leaflet map after scripts loaded
  useEffect(() => {
    if (!scriptsLoaded || !mapRef.current || mapInstance.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    // Fix default marker icon paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: [23.6850, 90.3563], // Bangladesh centroid
      zoom: 7,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 20,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawLayerRef.current = drawnItems;

    if (L.Control?.Draw) {
      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.2 },
          },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
      });
      map.addControl(drawControl);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on(L.Draw.Event.CREATED, (e: any) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        currentGeojsonRef.current = e.layer.toGeoJSON().geometry;
      });

      map.on(L.Draw.Event.EDITED, () => {
        const layers = drawnItems.getLayers();
        if (layers.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentGeojsonRef.current = (layers[0] as any).toGeoJSON().geometry;
        }
      });
    }

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [scriptsLoaded]);

  // Load existing boundary when farm selected
  useEffect(() => {
    if (!selectedFarmId || !mapReady) return;
    const L = (window as any).L; // eslint-disable-line @typescript-eslint/no-explicit-any
    setBoundary(null);
    currentGeojsonRef.current = null;
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    if (boundaryLayerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    geoApi.getBoundary(selectedFarmId).then((r) => {
      setBoundary(r.data);
      if (r.data.geojson && mapInstance.current && L) {
        const layer = L.geoJSON(
          { type: "Feature", geometry: r.data.geojson, properties: {} },
          { style: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.25, weight: 2 } }
        ).addTo(mapInstance.current);
        boundaryLayerRef.current = layer;
        const bounds = layer.getBounds();
        if (bounds.isValid()) mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    });
  }, [selectedFarmId, mapReady]);

  const handleSave = async () => {
    if (!selectedFarmId || !currentGeojsonRef.current) {
      setMsg({ type: "err", text: "Draw a polygon on the map first." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await geoApi.saveBoundary(selectedFarmId, currentGeojsonRef.current);
      setBoundary(r.data);
      setMsg({ type: "ok", text: `Boundary saved! Area: ${convertArea(r.data.area_ha ?? 0, areaUnit)}` });
    } catch {
      setMsg({ type: "err", text: "Failed to save boundary. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFarmId) return;
    const L = (window as any).L; // eslint-disable-line @typescript-eslint/no-explicit-any
    setDeleting(true);
    setMsg(null);
    try {
      await geoApi.deleteBoundary(selectedFarmId);
      setBoundary(null);
      currentGeojsonRef.current = null;
      if (drawLayerRef.current) drawLayerRef.current.clearLayers();
      if (boundaryLayerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
      setMsg({ type: "ok", text: "Boundary deleted." });
    } catch {
      setMsg({ type: "err", text: "Failed to delete boundary." });
    } finally {
      setDeleting(false);
    }
    void L; // suppress unused warning
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SectionHeader
        title="Farm Boundary Map"
        subtitle="Draw and save your farm boundaries. Area is calculated by the backend using the haversine formula."
        icon={Map}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4 p-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                  Select Farm
                </label>
                <select
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-emerald-500"
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

              {selectedFarm && (
                <div className="text-xs text-text-secondary space-y-1 bg-surface/60 rounded-lg p-3 border border-border/60">
                  <div className="flex justify-between">
                    <span>Registered area</span>
                    <span className="text-text-primary font-medium">{selectedFarm.area_ha} ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crop</span>
                    <span className="text-emerald-400 font-medium">{selectedFarm.crop_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>District</span>
                    <span className="text-text-primary">{selectedFarm.district}</span>
                  </div>
                </div>
              )}

              {/* Area unit toggle */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                  Area Unit
                </label>
                <div className="flex gap-1 bg-surface rounded-lg p-1 border border-border">
                  {(["ha", "acres", "decimals"] as AreaUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setAreaUnit(u)}
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all ${
                        areaUnit === u
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved boundary info */}
              {boundary?.area_ha ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <Ruler size={14} />
                    Saved Boundary
                  </div>
                  <div className="text-lg font-bold text-emerald-300">
                    {convertArea(boundary.area_ha, areaUnit)}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Updated: {boundary.updated_at ? new Date(boundary.updated_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              ) : selectedFarmId ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
                  <AlertTriangle size={12} className="inline mr-1" />
                  No boundary saved for this farm. Draw a polygon on the map.
                </div>
              ) : null}

              {/* Save / Delete */}
              {selectedFarmId && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    {saving ? "Saving…" : "Save Boundary"}
                  </Button>
                  {boundary?.area_ha && (
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 !text-rose-400 !border-rose-500/40 hover:!bg-rose-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              )}

              {/* Status message */}
              {msg && (
                <div
                  className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                    msg.type === "ok"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {msg.type === "ok"
                    ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                  {msg.text}
                </div>
              )}

              {!scriptsLoaded && (
                <Badge variant="warning">Loading map scripts…</Badge>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Instructions</p>
              <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
                <li>Select a farm from the dropdown</li>
                <li>Click the polygon icon (◇) in the map toolbar</li>
                <li>Click to place boundary points</li>
                <li>Double-click to close the polygon</li>
                <li>Click <strong className="text-text-primary">Save Boundary</strong></li>
              </ol>
            </div>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl overflow-hidden border border-border shadow-card"
            style={{ height: "520px" }}
          >
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          </div>
          <p className="text-xs text-text-muted mt-2 text-center">
            Map data © OpenStreetMap contributors · Area calculated by backend using haversine formula
          </p>
        </div>
      </div>
    </div>
  );
}
