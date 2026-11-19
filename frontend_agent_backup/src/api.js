import axios from "axios";

// Always use relative URLs — same origin, no CORS.
// In Docker: Nginx serves frontend at / and proxies /api/ → backend:8000.
// In local dev: CRA proxy in package.json routes /api/ → localhost:8000.
const API_BASE_URL = "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const farmsApi = {
  health: () => api.get("/api/health/"),
  listFarms: () => api.get("/api/farms/"),
  createFarm: (data) => api.post("/api/farms/", data),
  createFarmer: (data) => api.post("/api/farmers/", data),
  getFarm: (pk) => api.get(`/api/farms/${pk}/`),
};

export const predictionsApi = {
  createPrediction: (data) => api.post("/api/predictions/", data),
  getPrediction: (pk) => api.get(`/api/predictions/${pk}/`),
  calculateEconomics: (data) =>
    api.post("/api/predictions/economics/calculate/", data),
};
