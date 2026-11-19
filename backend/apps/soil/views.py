"""
Soil Views — Soil analysis and crop suitability assessment.
GET /api/soil/farms/<pk>/
GET /api/crop-suitability/farms/<pk>/
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

from apps.farms.models import Farm


# Prototype soil profiles by land type
_SOIL_PROFILES = {
    "irrigated": {
        "soil_type": "Silty Clay Loam",
        "ph": 6.4,
        "organic_matter_pct": 1.8,
        "nitrogen_ppm": 142,
        "phosphorus_ppm": 18,
        "potassium_ppm": 95,
        "cec_meq_100g": 18.5,
        "drainage": "Well-drained",
        "texture": "Medium",
        "source": "Bangladesh Agricultural Research Institute (BARI) — District Soil Survey",
    },
    "rainfed": {
        "soil_type": "Sandy Loam",
        "ph": 5.9,
        "organic_matter_pct": 1.2,
        "nitrogen_ppm": 98,
        "phosphorus_ppm": 12,
        "potassium_ppm": 72,
        "cec_meq_100g": 11.0,
        "drainage": "Excessive",
        "texture": "Light",
        "source": "SRDI Bangladesh Soil Survey",
    },
    "mixed": {
        "soil_type": "Clay Loam",
        "ph": 6.1,
        "organic_matter_pct": 2.1,
        "nitrogen_ppm": 165,
        "phosphorus_ppm": 22,
        "potassium_ppm": 108,
        "cec_meq_100g": 22.0,
        "drainage": "Moderately well-drained",
        "texture": "Medium-Heavy",
        "source": "BARC Soil Fertility Study 2023",
    },
    "lowland": {
        "soil_type": "Heavy Clay",
        "ph": 6.8,
        "organic_matter_pct": 2.6,
        "nitrogen_ppm": 185,
        "phosphorus_ppm": 28,
        "potassium_ppm": 120,
        "cec_meq_100g": 28.0,
        "drainage": "Poorly drained — suitable for paddy",
        "texture": "Heavy",
        "source": "BARC Floodplain Soil Study 2022",
    },
    "medium": {
        "soil_type": "Loam",
        "ph": 6.3,
        "organic_matter_pct": 1.9,
        "nitrogen_ppm": 150,
        "phosphorus_ppm": 20,
        "potassium_ppm": 100,
        "cec_meq_100g": 16.0,
        "drainage": "Moderately well-drained",
        "texture": "Medium",
        "source": "SRDI Bangladesh Soil Survey",
    },
}

# Crop suitability rules
_CROP_SUITABILITY = {
    "boro_rice": {
        "name": "Boro Rice (HYV)",
        "optimal_ph": (6.0, 7.0),
        "optimal_om_pct": (1.5, 3.0),
        "water_requirement": "High — requires irrigation",
        "land_types": ["lowland", "irrigated", "medium"],
        "reasoning": {
            "highly_suitable": "High organic matter and pH in optimal range. Well-suited for boro season with irrigation.",
            "suitable": "Soil conditions acceptable. Adequate fertilizer management recommended.",
            "marginal": "pH or organic matter outside optimal range. Soil amendments recommended before planting.",
            "not_suitable": "Sandy/excessive drainage unsuitable for paddy. Consider alternative crops.",
        },
    },
    "aman_rice": {
        "name": "Aman Rice (Rainfed)",
        "optimal_ph": (5.5, 7.0),
        "optimal_om_pct": (1.0, 2.5),
        "water_requirement": "Moderate — monsoon dependent",
        "land_types": ["lowland", "medium", "rainfed", "mixed"],
        "reasoning": {
            "highly_suitable": "pH and moisture regime suitable for rainfed aman.",
            "suitable": "Acceptable conditions with standard crop management.",
            "marginal": "Consider supplemental irrigation if rainfall below 1200mm/season.",
            "not_suitable": "Insufficient rainfall reliability for rainfed cultivation.",
        },
    },
    "wheat": {
        "name": "Wheat (Winter)",
        "optimal_ph": (6.0, 7.5),
        "optimal_om_pct": (1.5, 3.0),
        "water_requirement": "Moderate — 2-3 irrigations needed",
        "land_types": ["irrigated", "medium", "mixed"],
        "reasoning": {
            "highly_suitable": "Well-drained loamy soil with good pH — ideal for wheat.",
            "suitable": "Good conditions. Ensure timely sowing by Nov 15–30.",
            "marginal": "Soil drainage or pH adjustment needed.",
            "not_suitable": "Heavy clay or waterlogged conditions unsuitable for wheat.",
        },
    },
    "maize": {
        "name": "Maize (Hybrid)",
        "optimal_ph": (5.8, 7.0),
        "optimal_om_pct": (1.5, 3.5),
        "water_requirement": "Moderate-High",
        "land_types": ["irrigated", "mixed", "rainfed"],
        "reasoning": {
            "highly_suitable": "Deep, well-drained soil with high organic matter — excellent for maize.",
            "suitable": "Good potential with balanced NPK management.",
            "marginal": "Drainage improvement recommended before cultivation.",
            "not_suitable": "Waterlogged or highly acidic soil not suitable.",
        },
    },
    "potato": {
        "name": "Potato",
        "optimal_ph": (5.5, 6.5),
        "optimal_om_pct": (2.0, 4.0),
        "water_requirement": "High — 5-6 irrigations",
        "land_types": ["irrigated", "mixed", "medium"],
        "reasoning": {
            "highly_suitable": "Friable, well-drained soil with slightly acidic pH — excellent for potato.",
            "suitable": "Acceptable conditions. Add potash and organic matter.",
            "marginal": "Soil too heavy or pH too high. Sulfur amendment may help.",
            "not_suitable": "Heavy clay or waterlogged conditions unsuitable for tuber crops.",
        },
    },
}


def _assess_suitability(crop_code: str, soil: dict, land_type: str) -> dict:
    """Assess crop suitability based on soil properties and land type."""
    if crop_code not in _CROP_SUITABILITY:
        return {"rating": "unknown", "reason": "Crop not in suitability database."}

    rules = _CROP_SUITABILITY[crop_code]
    ph_min, ph_max = rules["optimal_ph"]
    om_min, om_max = rules["optimal_om_pct"]

    ph_ok = ph_min <= soil.get("ph", 6.5) <= ph_max
    om_ok = om_min <= soil.get("organic_matter_pct", 1.5) <= om_max
    land_ok = land_type.lower() in rules["land_types"]

    if ph_ok and om_ok and land_ok:
        rating = "highly_suitable"
    elif (ph_ok or om_ok) and land_ok:
        rating = "suitable"
    elif land_ok:
        rating = "marginal"
    else:
        rating = "not_suitable"

    return {
        "rating": rating,
        "reason": rules["reasoning"][rating],
        "water_requirement": rules["water_requirement"],
        "ph_in_range": ph_ok,
        "organic_matter_in_range": om_ok,
        "land_type_suitable": land_ok,
    }


class SoilAnalysisView(APIView):
    """GET /api/soil/farms/<pk>/ — soil analysis for the farm."""

    def get(self, request, pk):
        try:
            farm = Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        land_type = farm.land_type.lower().strip()
        soil = _SOIL_PROFILES.get(land_type, _SOIL_PROFILES["medium"])

        return Response({
            "farm_id": farm.id,
            "land_type": farm.land_type,
            "district": farm.district,
            "is_prototype_data": True,
            "disclaimer": (
                "Soil properties shown are prototype estimates based on typical "
                f"Bangladesh '{farm.land_type}' land type profiles. "
                "Real soil analysis requires laboratory testing or ISRIC API integration."
            ),
            "retrieved_at": datetime.utcnow().isoformat() + "Z",
            "soil": soil,
            "interpretation": _interpret_soil(soil),
        })


class CropSuitabilityView(APIView):
    """GET /api/crop-suitability/farms/<pk>/ — crop suitability for the farm."""

    def get(self, request, pk):
        try:
            farm = Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        land_type = farm.land_type.lower().strip()
        soil = _SOIL_PROFILES.get(land_type, _SOIL_PROFILES["medium"])

        suitability = {}
        for crop_code, rules in _CROP_SUITABILITY.items():
            assessment = _assess_suitability(crop_code, soil, land_type)
            suitability[crop_code] = {
                "crop_name": rules["name"],
                **assessment,
            }

        # Sort by rating quality
        order = {"highly_suitable": 0, "suitable": 1, "marginal": 2, "not_suitable": 3, "unknown": 4}
        ranked = sorted(suitability.items(), key=lambda x: order.get(x[1]["rating"], 99))

        return Response({
            "farm_id": farm.id,
            "land_type": farm.land_type,
            "district": farm.district,
            "is_prototype_data": True,
            "disclaimer": (
                "Crop suitability ratings are decision aids based on prototype soil profiles. "
                "They are NOT guaranteed predictions. Always verify with your local Agriculture "
                "Extension Officer (AEO) before planting decisions."
            ),
            "current_crop": farm.crop_code,
            "assessed_at": datetime.utcnow().isoformat() + "Z",
            "suitability": dict(ranked),
        })


def _interpret_soil(soil: dict) -> dict:
    """Generate simple soil health interpretation."""
    ph = soil.get("ph", 6.5)
    om = soil.get("organic_matter_pct", 1.5)
    n = soil.get("nitrogen_ppm", 100)

    ph_status = "optimal" if 6.0 <= ph <= 7.0 else ("acidic" if ph < 6.0 else "alkaline")
    om_status = "good" if om >= 2.0 else ("adequate" if om >= 1.5 else "low")
    n_status = "sufficient" if n >= 150 else ("moderate" if n >= 100 else "deficient")

    return {
        "ph_status": ph_status,
        "organic_matter_status": om_status,
        "nitrogen_status": n_status,
        "overall": "good" if all([
            ph_status == "optimal",
            om_status in ("good", "adequate"),
            n_status in ("sufficient", "moderate"),
        ]) else "needs_attention",
    }
