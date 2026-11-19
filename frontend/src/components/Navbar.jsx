import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { farmsApi } from "../api";
import {
  LayoutDashboard,
  Map,
  CloudRain,
  Satellite,
  FlaskConical,
  Menu,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Farm Map", to: "/farm-map", icon: Map },
  { label: "Soil & Weather", to: "/soil-weather", icon: CloudRain },
  { label: "Satellite & NDVI", to: "/satellite", icon: Satellite },
  { label: "Crop Suitability", to: "/crop-suitability", icon: FlaskConical },
];

function linkClass(isActive, mobile = false) {
  const base = mobile
    ? "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
    : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200";
  return `${base} ${
    isActive
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      : "text-text-secondary hover:text-text-primary hover:bg-surface-card/70 border border-transparent"
  }`;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState("checking");

  const checkHealth = () => {
    setHealthStatus("checking");
    farmsApi
      .health()
      .then(() => setHealthStatus("ok"))
      .catch(() => setHealthStatus("down"));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-surface/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <Link to="/" onClick={closeMobile} className="flex items-center gap-3 group select-none shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-bg font-bold text-sm shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            YM
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg text-text-primary tracking-tight">
              YieldMax<span className="text-emerald-400">.ai</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              <Sparkles size={10} /> V2 Dashboard
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1 bg-surface-card/50 border border-border/60 rounded-xl p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => linkClass(isActive)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkHealth}
            title={`API Health: ${healthStatus}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-surface/90 hover:border-emerald-500/40 transition-colors text-xs font-mono"
          >
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                healthStatus === "ok"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : healthStatus === "down"
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="hidden sm:inline text-text-secondary">
              {healthStatus === "ok" ? "API Live" : healthStatus === "down" ? "API Down" : "Checking"}
            </span>
            <RefreshCw size={12} className={`text-text-secondary ${healthStatus === "checking" ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-emerald-500/40 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border/70 bg-surface/95 backdrop-blur-md px-4 sm:px-6 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMobile}
                className={({ isActive }) => linkClass(isActive, true)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
}


export default Navbar;
