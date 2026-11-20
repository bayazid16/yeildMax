# 🌾 YieldMax-AI — Hackathon Executive Summary

> **AI-Powered Crop Yield Simulation, Financial Risk Optimization & Precision Agriculture for Bangladeshi Smallholder Farmers**

---

## 🎯 1. Problem & Impact

Smallholder farmers in Bangladesh face extreme income volatility due to climate unpredictability and fixed farming costs. A **20% drop in rainfall** can lead to a **40% drop in net profit** because operational expenses (seeds, fertilizer, labor) remain fixed.

### 💰 Real Example (Rahim's 2.0 ha Boro Rice Farm)
* **Base Production:** $2.0 \text{ ha} \times 5.0 \text{ t/ha} = 10 \text{ tons}$ ($300,000 \text{ BDT}$ gross revenue)
* **Fixed Costs:** $150,000 \text{ BDT}$

| Scenario | Yield ($\text{t/ha}$) | Revenue ($\text{BDT}$) | Net Profit ($\text{BDT}$) | Profit Change |
| :--- | :---: | :---: | :---: | :---: |
| **Normal Weather** | $5.0$ | $300,000$ | **$150,000$** | **Base** |
| **Low Rain (-20%)** | $4.0$ | $240,000$ | **$90,000$** | **-40.0%** |
| **Heavy Rain (-10%)** | $4.5$ | $270,000$ | **$120,000$** | **-20.0%** |

---

## 🛡️ 2. Key Innovation & AI Safety Blueprint

> ⚠️ **The Golden Rule:** *"Python calculates; the LLM only explains."*

1. **Zero Math Hallucination:** All financial metrics, yield calculations, and scenario adjustments are executed strictly by deterministic Python backend services (`profit_engine.py`, `yield_engine.py`).
2. **Automated Number Verification:** Bengali LLM responses are verified via regex back-checks (converting `০-৯` to `0-9`) against raw engine calculations. If a number mismatch is detected, the UI gracefully falls back to formatted template strings.
3. **Traceable Advice:** Advisory tasks (DAT - Days After Transplanting) are directly linked to reviewed DAE / BAMIS agronomy guidelines.

---

## 🏗️ 3. Architecture & Tech Stack

```
[ Frontend: React + Vite + Tailwind + Recharts + Leaflet ]
                          │  REST API (JSON)
                          ▼
[ Backend API Gateway: Django REST Framework ]
     │                    │                    │
     ▼                    ▼                    ▼
[ Python Math Engine ] [ Spatial GIS Engine ] [ LLM Advisor Service ]
(Yield, Scenarios)     (Sentinel-2, Soil)     (LangChain + Safety Validation)
                          │
                          ▼
        [ Database: PostgreSQL / PostGIS + Redis ]
```

* **Frontend:** React 18, Vite, Tailwind CSS, Leaflet.js, Recharts
* **Backend:** Python 3.11, Django REST Framework, PostgreSQL/PostGIS, Redis
* **AI & Validation:** LangChain, Gemini API, RegEx-based numerical verification
* **Infrastructure:** Docker & Docker Compose (Nginx reverse proxy)

---

## 🚀 4. Live V1 Scope & Demo Flow

1. **Farm Profile Setup:** Enter land size, location, crop type (`BORO_RICE`), and transplanting date.
2. **Deterministic Yield & Profit Engine:** Generates baseline yield ($5.0 \text{ t/ha}$) and 3 climate scenarios ($150\text{k} / 90\text{k} / 120\text{k BDT}$ net profit).
3. **DAT Advisory Calendar:** Displays verified tasks (e.g., urea split applications at DAT 20).
4. **Natural Bengali Context Explainer:** Converts complex numbers into friendly Bengali voice/text explanations with safety verification.

---

## 🗺️ 5. Strategic Product Roadmap (V1 → V5)

| Stage | Focus Area | Core Features |
| :--- | :--- | :--- |
| **V1 (Current)** | **Core Engine & Economics** | Math engines, 3 weather scenarios, reviewed advisory tasks, safe Bengali LLM. |
| **V2** | **Spatial & Satellite Analysis** | Polygon mapping, Sentinel-2 NDVI vegetation tracking, SoilGrids soil profile integration. |
| **V3** | **Machine Learning Prediction** | XGBoost yield models trained on BBS/DAE historical datasets with confidence intervals. |
| **V4** | **Voice RAG Advisor** | LangGraph orchestration, Bengali Voice-to-Text (Whisper), pgvector documentation search. |
| **V5** | **AI Disease Triage** | Computer vision leaf disease diagnosis (PyTorch) with DAE officer review escalation queues. |

---

## ⚡ Quick Start (Run locally in under 2 minutes)

```bash
git clone https://github.com/your-org/yieldmax-ai.git
cd yieldmax-ai
docker compose up -d --build
```
* **Web Application:** `http://localhost:8080`
* **API Documentation / Health check:** `http://localhost:8001/api/health/`