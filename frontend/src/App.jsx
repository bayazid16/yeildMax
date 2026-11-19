import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FarmMap from "./pages/FarmMap";
import SoilWeatherAnalysis from "./pages/SoilWeatherAnalysis";
import Satellite from "./pages/Satellite";
import CropSuitability from "./pages/CropSuitability";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text-primary">
        <Navbar />
        <main>
          <Routes>
            {/* Dashboard (V1 core + overview) */}
            <Route path="/" element={<Home />} />

            {/* V2 routes */}
            <Route path="/farm-map" element={<FarmMap />} />
            <Route path="/soil-weather" element={<SoilWeatherAnalysis />} />
            <Route path="/satellite" element={<Satellite />} />
            <Route path="/crop-suitability" element={<CropSuitability />} />

            {/* Aliases / backward-friendly paths */}
            <Route path="/farm-mapping" element={<Navigate to="/farm-map" replace />} />
            <Route path="/satellite-ndvi" element={<Navigate to="/satellite" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
