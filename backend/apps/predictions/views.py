"""
Prediction Views — Class-Based (SRP, DIP).
Each view class handles one endpoint.
All business logic is in PredictionService / EconomicsService.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from services.prediction_service import EconomicsService, PredictionService

PREDICTION_REQUIRED = [
    "farmer_name", "area_ha", "district", "upazila",
    "land_type", "crop_code", "planting_date",
    "market_price_bdt_per_kg", "total_cost_bdt",
]

ECONOMICS_REQUIRED = [
    "area_ha", "yield_t_per_ha",
    "market_price_bdt_per_kg", "total_cost_bdt",
]


class PredictionListView(APIView):
    """POST /api/predictions/ — create a full 3-scenario prediction."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = PredictionService()

    def post(self, request):
        missing = [f for f in PREDICTION_REQUIRED if f not in request.data]
        if missing:
            return Response(
                {"success": False, "error": "Missing required fields", "fields": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = self._service.create_prediction(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except (ValueError, TypeError) as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"success": False, "error": "Could not create prediction. Check input data."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PredictionDetailView(APIView):
    """GET /api/predictions/<pk>/ — retrieve one prediction with its scenarios."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = PredictionService()

    def get(self, request, pk):
        data = self._service.get_prediction(pk)
        if data is None:
            return Response(
                {"error": "Prediction not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data, status=status.HTTP_200_OK)


class EconomicsCalculateView(APIView):
    """POST /api/predictions/economics/calculate/ — stateless profit calculator."""

    def post(self, request):
        missing = [f for f in ECONOMICS_REQUIRED if f not in request.data]
        if missing:
            return Response(
                {"success": False, "error": "Missing required fields", "fields": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = EconomicsService.calculate(request.data)
            return Response(data, status=status.HTTP_200_OK)
        except (ValueError, TypeError) as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
