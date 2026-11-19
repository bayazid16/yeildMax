import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import Home from "./pages/Home";
import FarmMap from "./pages/FarmMap";
import SoilWeatherAnalysis from "./pages/SoilWeatherAnalysis";
import Satellite from "./pages/Satellite";
import CropSuitability from "./pages/CropSuitability";
import Advisory from "./pages/Advisory";
// Existing V1 pages kept for dashboard/internal navigation
import Predict from "./pages/Predict";
import Farms from "./pages/Farms";
import Economics from "./pages/Economics";
import Mcp from "./pages/Mcp";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text-primary">
        <Navbar />
        <main>
          <Routes>
            {/* V1 core + overview */}
            <Route path="/" element={<Home />} />

            {/* V2 primary routes */}
            <Route path="/farm-mapping" element={<FarmMap />} />
            <Route path="/soil-weather" element={<SoilWeatherAnalysis />} />
            <Route path="/satellite-ndvi" element={<Satellite />} />
            <Route path="/crop-suitability" element={<CropSuitability />} />

            {/* Preserved V1 / supporting routes */}
            <Route path="/advisor" element={<Advisory />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/farms" element={<Farms />} />
            <Route path="/economics" element={<Economics />} />
            <Route path="/mcp" element={<Mcp />} />

            {/* Aliases for compatibility */}
            <Route path="/farm-map" element={<Navigate to="/farm-mapping" replace />} />
            <Route path="/satellite" element={<Navigate to="/satellite-ndvi" replace />} />
            <Route path="/advisory" element={<Navigate to="/advisor" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
