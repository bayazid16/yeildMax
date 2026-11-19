import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { farmsApi } from "../api";
import {
  LayoutDashboard,
  Menu,
  X,
  RefreshCw,
  Sparkles,
  Map,
  CloudRain,
  Satellite,
  FlaskConical,
  MessageSquareText,
} from "lucide-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  group: "v1" | "v2";
};

const NAV_ITEMS: NavItem[] = [
  // V1 core + preserved
  { label: "Dashboard", to: "/", icon: LayoutDashboard, group: "v1" },
  { label: "AI Bengali Advisor", to: "/advisor", icon: MessageSquareText, group: "v1" },
  // V2
  { label: "Farm Mapping & Boundaries", to: "/farm-mapping", icon: Map, group: "v2" },
  { label: "Soil & Weather Analysis", to: "/soil-weather", icon: CloudRain, group: "v2" },
  { label: "Satellite & NDVI Imagery", to: "/satellite-ndvi", icon: Satellite, group: "v2" },
  { label: "Crop Suitability", to: "/crop-suitability", icon: FlaskConical, group: "v2" },
];

function navClasses(isActive: boolean, compact = false) {
  const base = compact
    ? "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
    : "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200";
  return `${base} ${
    isActive
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
      : "text-text-secondary hover:text-text-primary hover:bg-surface/60"
  }`;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"ok" | "down" | "checking">("checking");

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
  const v1Items = NAV_ITEMS.filter((i) => i.group === "v1");
  const v2Items = NAV_ITEMS.filter((i) => i.group === "v2");

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-surface/85 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5 gap-4">
        {/* Brand / Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          onClick={closeMobile}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-bg font-display font-extrabold text-sm shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            YM
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-text-primary tracking-tight">
                YieldMax<span className="text-emerald-400">.ai</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles size={10} /> SaaS
              </span>
            </div>
            <span className="text-[11px] text-text-secondary leading-none hidden sm:block">
              CloudCamp BD &bull; Krishi AI
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-2 flex-1 justify-center">
          <div className="flex items-center gap-1 bg-surface-card/60 p-1 rounded-xl border border-border/60">
            {v1Items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => navClasses(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={14} className={isActive ? "text-emerald-400" : "text-text-secondary"} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
          <div className="flex items-center gap-1 bg-surface-card/60 p-1 rounded-xl border border-emerald-500/20">
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest px-2">V2</span>
            {v2Items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => navClasses(isActive)}>
                  {({ isActive }) => (
                    <>
                      <Icon size={14} className={isActive ? "text-emerald-400" : "text-text-secondary"} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Health + Mobile toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={checkHealth}
            title={`API Health: /api/health/ (${healthStatus === "ok" ? "Operational" : "Offline"}). Click to refresh.`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-surface/90 hover:border-emerald-500/40 hover:bg-surface-card transition-all duration-200 cursor-pointer shadow-sm select-none"
          >
            {healthStatus === "ok" ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 animate-pulse bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                </span>
                <span className="text-xs font-mono font-medium text-emerald-400 hidden sm:block">Live Health</span>
              </>
            ) : healthStatus === "down" ? (
              <>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                <span className="text-xs font-mono font-medium text-rose-400 hidden sm:block">Offline</span>
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 animate-pulse bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                <span className="text-xs font-mono font-medium text-text-secondary hidden sm:block">Checking…</span>
              </>
            )}
            <RefreshCw
              size={12}
              className={`text-text-secondary/60 hover:text-text-secondary ${healthStatus === "checking" ? "animate-spin text-emerald-400" : ""}`}
            />
          </div>

          <button
            className="xl:hidden p-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-border/80 bg-surface/95 backdrop-blur-md px-6 py-4 space-y-1">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">V1 Core</p>
          {v1Items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMobile}
                className={({ isActive }) => navClasses(isActive, true)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
          <div className="border-t border-border/40 pt-3 mt-3">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 px-1">V2 Features</p>
            {v2Items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobile}
                  className={({ isActive }) => navClasses(isActive, true)}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
