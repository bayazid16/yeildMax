"""
Weather Views — Weather summary for farm locations.
GET /api/weather/farms/<pk>/
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.farms.models import Farm


# Prototype weather data by region of Bangladesh
_PROTOTYPE_WEATHER = {
    "default": {
        "temperature_c": 22.5,
        "temperature_min_c": 16.0,
        "temperature_max_c": 29.0,
        "humidity_pct": 72.0,
        "rainfall_mm_7d": 12.4,
        "wind_speed_kmh": 14.0,
        "description": "Partly cloudy with moderate humidity",
        "season": "Winter (Rabi)",
    },
    "bogura": {
        "temperature_c": 20.1, "temperature_min_c": 13.5, "temperature_max_c": 27.0,
        "humidity_pct": 68.0, "rainfall_mm_7d": 8.2, "wind_speed_kmh": 12.0,
        "description": "Dry and cool — suitable for boro rice transplanting",
        "season": "Winter (Rabi)",
    },
    "dhaka": {
        "temperature_c": 23.4, "temperature_min_c": 18.0, "temperature_max_c": 30.0,
        "humidity_pct": 75.0, "rainfall_mm_7d": 14.1, "wind_speed_kmh": 10.0,
        "description": "Warm and humid",
        "season": "Winter (Rabi)",
    },
    "rajshahi": {
        "temperature_c": 19.8, "temperature_min_c": 12.0, "temperature_max_c": 28.5,
        "humidity_pct": 60.0, "rainfall_mm_7d": 5.0, "wind_speed_kmh": 16.0,
        "description": "Dry season — irrigation recommended",
        "season": "Winter (Rabi)",
    },
    "sylhet": {
        "temperature_c": 24.0, "temperature_min_c": 18.5, "temperature_max_c": 30.5,
        "humidity_pct": 82.0, "rainfall_mm_7d": 22.0, "wind_speed_kmh": 8.0,
        "description": "High humidity, elevated rainfall",
        "season": "Winter (Rabi)",
    },
    "chittagong": {
        "temperature_c": 25.5, "temperature_min_c": 20.0, "temperature_max_c": 32.0,
        "humidity_pct": 80.0, "rainfall_mm_7d": 18.5, "wind_speed_kmh": 18.0,
        "description": "Coastal influence — moderate temperature",
        "season": "Winter (Rabi)",
    },
    "khulna": {
        "temperature_c": 22.0, "temperature_min_c": 15.0, "temperature_max_c": 29.0,
        "humidity_pct": 76.0, "rainfall_mm_7d": 10.0, "wind_speed_kmh": 15.0,
        "description": "Moderate coastal climate",
        "season": "Winter (Rabi)",
    },
}


class WeatherView(APIView):
    """GET /api/weather/farms/<pk>/ — weather summary for the farm's district."""

    def get(self, request, pk):
        try:
            farm = Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        district_key = farm.district.lower().strip()
        weather = _PROTOTYPE_WEATHER.get(district_key, _PROTOTYPE_WEATHER["default"])

        return Response({
            "farm_id": farm.id,
            "district": farm.district,
            "upazila": farm.upazila,
            "is_prototype_data": True,
            "disclaimer": (
                "Weather data shown is a prototype estimate based on typical "
                "Bangladesh winter season conditions for this district. "
                "Real-time weather requires Bangladesh Meteorological Department (BMD) "
                "or OpenWeatherMap API integration."
            ),
            "source": "Prototype Estimate — YieldMax V2",
            "retrieved_at": datetime.utcnow().isoformat() + "Z",
            "weather": {
                **weather,
                "rainfall_scenario": _infer_scenario(weather["rainfall_mm_7d"]),
            },
        })


def _infer_scenario(rainfall_7d: float) -> str:
    """Map 7-day rainfall to yield scenario code."""
    if rainfall_7d < 5.0:
        return "low_rain"
    elif rainfall_7d > 20.0:
        return "heavy_rain"
    return "normal"
