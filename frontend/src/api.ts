import axios from "axios";

/**
 * Centralized API client.
 *
 * `VITE_API_BASE_URL` is the ONLY configuration needed to move the frontend
 * between deployments. Leave it empty for same-origin requests (Vite dev
 * proxy or the bundled Nginx proxy). Set it to the public backend origin on
 * Vercel, e.g. `https://api.example.com` — no trailing `/api`, no secrets.
 */
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

export const API_BASE_URL = configuredBaseUrl;

export const api = axios.create({
  // undefined keeps axios on relative URLs (same origin / proxy)
  baseURL: API_BASE_URL || undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── V1 Types ────────────────────────────────────────────────────────────────

export type CropStage =
  | "pre_planting"
  | "transplanted"
  | "growing"
  | "harvested";

export type Farm = {
  id: number;
  farmer: number;
  farmer_name: string;
  area_ha: number;
  district: string;
  upazila: string;
  land_type: string;
  crop_code: string;
  planting_date: string | null;
  crop_stage: CropStage;
};

export type CreateFarmInput = {
  farmer: number;
  area_ha: number;
  district: string;
  upazila: string;
  land_type: string;
  crop_code: string;
  planting_date: string;
};

export type CreateFarmerInput = {
  name: string;
};

export type Farmer = {
  id: number;
  name: string;
};

export type ScenarioResult = {
  id: number;
  prediction: number;
  scenario_code: string;
  yield_t_per_ha: number;
  total_production_kg: number;
  revenue_bdt: number;
  total_cost_bdt: number;
  net_profit_bdt: number;
};

export type PredictionDetail = {
  prediction: {
    id: number;
    farm: number;
    market_price_bdt_per_kg: number;
    total_cost_bdt: number;
    baseline_yield_t_per_ha: number;
    created_at: string;
  };
  farmer_name: string;
  crop_code: string;
  scenarios: ScenarioResult[];
};

export type CreatePredictionInput = {
  farmer_name: string;
  area_ha: number;
  district: string;
  upazila: string;
  land_type: string;
  crop_code: string;
  planting_date: string;
  market_price_bdt_per_kg: number;
  total_cost_bdt: number;
};

export type CreatePredictionResponse = {
  success: boolean;
  prediction_id: number;
  farm_id: number;
  farmer_name: string;
  crop_code: string;
  farm: {
    id: number;
    area_ha: number;
    district: string;
    upazila: string;
  };
  currency: string;
  scenarios: ScenarioResult[];
  is_prototype_estimate: boolean;
};

export type Guideline = {
  id: number;
  topic: string;
  stage: CropStage;
  instruction: string;
  start_day: number;
  end_day: number;
  language_code: string;
  source_name: string;
  source_url: string;
  reviewed_by: string;
  reviewed_at: string | null;
};

export type AdvisoryResponse = {
  farm_id: number;
  crop_code: string;
  crop_stage: CropStage;
  planting_date: string | null;
  days_after_transplant: number | null;
  do_now: Guideline[];
  coming_up: Guideline[];
};

export type AdvisorChatResponse = {
  farm_id: number;
  prediction_id: number;
  answer: string;
  is_fallback?: boolean;
  reason?: string;
};

export type EconomicsInput = {
  area_ha: number;
  yield_t_per_ha: number;
  market_price_bdt_per_kg: number;
  total_cost_bdt: number;
};

export type EconomicsResult = {
  success: boolean;
  currency: string;
  area_ha: number;
  yield_t_per_ha: number;
  total_production_kg: number;
  revenue_bdt: number;
  total_cost_bdt: number;
  net_profit_bdt: number;
  is_prototype_estimate: boolean;
};

// ─── V1 API ──────────────────────────────────────────────────────────────────

export const farmsApi = {
  health: () => api.get<{ status: string; service: string }>("/api/health/"),
  listFarms: () => api.get<Farm[]>("/api/farms/"),
  createFarm: (data: CreateFarmInput) => api.post<Farm>("/api/farms/", data),
  listFarmers: () => api.get<Farmer[]>("/api/farmers/"),
  createFarmer: (data: CreateFarmerInput) =>
    api.post<Farmer>("/api/farmers/", data),
  getFarm: (pk: number) => api.get<Farm>(`/api/farms/${pk}/`),
};

export const predictionsApi = {
  createPrediction: (data: CreatePredictionInput) =>
    api.post<CreatePredictionResponse>("/api/predictions/", data),
  getPrediction: (pk: number) =>
    api.get<PredictionDetail>(`/api/predictions/${pk}/`),
  calculateEconomics: (data: EconomicsInput) =>
    api.post<EconomicsResult>("/api/predictions/economics/calculate/", data),
};

export const advisoryApi = {
  getAdvisory: (farmId: number) =>
    api.get<AdvisoryResponse>(`/api/advisory/${farmId}/`),
  askAdvisor: (farmId: number, question: string) =>
    api.post<AdvisorChatResponse>("/api/advisor/chat/", {
      farm_id: farmId,
      question,
    }),
};

// ─── V2 Types ────────────────────────────────────────────────────────────────

export type FarmBoundary = {
  farm_id: number;
  geojson: { type: "Polygon"; coordinates: number[][][] } | null;
  area_ha: number | null;
  updated_at: string | null;
  message?: string;
  created?: boolean;
};

export type NDVIObservation = {
  date: string;
  ndvi_mean: number;
  ndvi_min: number | null;
  ndvi_max: number | null;
  cloud_cover_pct: number | null;
  stage_hint?: string;
  is_prototype_data: boolean;
};

export type NDVIResponse = {
  farm_id: number;
  is_prototype_data: boolean;
  disclaimer?: string;
  source: string;
  observations: NDVIObservation[];
};

export type SatelliteImageryResponse = {
  farm_id: number;
  data_available: boolean;
  is_prototype_data: boolean;
  message?: string;
  imagery: unknown[];
  pending_tasks?: number;
};

export type WeatherData = {
  temperature_c: number;
  temperature_min_c: number;
  temperature_max_c: number;
  humidity_pct: number;
  rainfall_mm_7d: number;
  wind_speed_kmh: number;
  description: string;
  season: string;
  rainfall_scenario: "normal" | "low_rain" | "heavy_rain";
};

export type WeatherResponse = {
  farm_id: number;
  district: string;
  is_prototype_data: boolean;
  disclaimer: string;
  source: string;
  retrieved_at: string;
  weather: WeatherData;
};

export type SoilData = {
  soil_type: string;
  ph: number;
  organic_matter_pct: number;
  nitrogen_ppm: number;
  phosphorus_ppm: number;
  potassium_ppm: number;
  cec_meq_100g: number;
  drainage: string;
  texture: string;
  source: string;
};

export type SoilResponse = {
  farm_id: number;
  land_type: string;
  district: string;
  is_prototype_data: boolean;
  disclaimer: string;
  retrieved_at: string;
  soil: SoilData;
  interpretation: {
    ph_status: string;
    organic_matter_status: string;
    nitrogen_status: string;
    overall: string;
  };
};

export type CropSuitabilityEntry = {
  crop_name: string;
  rating: "highly_suitable" | "suitable" | "marginal" | "not_suitable";
  reason: string;
  water_requirement: string;
  ph_in_range: boolean;
  organic_matter_in_range: boolean;
  land_type_suitable: boolean;
};

export type CropSuitabilityResponse = {
  farm_id: number;
  land_type: string;
  district: string;
  is_prototype_data: boolean;
  disclaimer: string;
  current_crop: string;
  assessed_at: string;
  suitability: Record<string, CropSuitabilityEntry>;
};

// ─── V2 API ──────────────────────────────────────────────────────────────────

export const geoApi = {
  getBoundary: (farmId: number) =>
    api.get<FarmBoundary>(`/api/geo/farms/${farmId}/boundary/`),
  saveBoundary: (farmId: number, geojson: object) =>
    api.post<FarmBoundary>(`/api/geo/farms/${farmId}/boundary/`, { geojson }),
  deleteBoundary: (farmId: number) =>
    api.delete(`/api/geo/farms/${farmId}/boundary/`),
};

export const satelliteApi = {
  getImagery: (farmId: number) =>
    api.get<SatelliteImageryResponse>(`/api/satellite/farms/${farmId}/imagery/`),
  getNDVI: (farmId: number) =>
    api.get<NDVIResponse>(`/api/satellite/farms/${farmId}/ndvi/`),
  getTaskStatus: (taskId: string) =>
    api.get(`/api/satellite/tasks/${taskId}/status/`),
};

export const weatherApi = {
  getWeather: (farmId: number) =>
    api.get<WeatherResponse>(`/api/weather/farms/${farmId}/`),
};

export const soilApi = {
  getSoil: (farmId: number) =>
    api.get<SoilResponse>(`/api/soil/farms/${farmId}/`),
  getCropSuitability: (farmId: number) =>
    api.get<CropSuitabilityResponse>(`/api/crop-suitability/farms/${farmId}/`),
};
