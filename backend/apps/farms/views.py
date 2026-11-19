"""
Farm Views — Class-Based (SRP, DIP).
Each view class handles exactly one HTTP endpoint.
All business logic is delegated to FarmService (DIP).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from services.farm_service import FarmService


class HealthCheckView(APIView):
    """GET /api/health/ — liveness probe."""

    def get(self, request):
        return Response(
            {"status": "ok", "service": "YieldMax API"},
            status=status.HTTP_200_OK,
        )


class FarmListView(APIView):
    """
    GET  /api/farms/ — list all farms
    POST /api/farms/ — create a new farm
    SRP: this view only handles farm collection operations.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = FarmService()

    def get(self, request):
        data = self._service.list_farms()
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            data = self._service.create_farm(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class FarmDetailView(APIView):
    """GET /api/farms/<pk>/ — retrieve a single farm."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = FarmService()

    def get(self, request, pk):
        data = self._service.get_farm(pk)
        if data is None:
            return Response(
                {"error": "Farm not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data, status=status.HTTP_200_OK)


class FarmerCreateView(APIView):
    """GET  /api/farmers/ — list farmers.
    POST /api/farmers/ — create a new farmer.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = FarmService()

    def get(self, request):
        data = self._service.list_farmers()
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            data = self._service.create_farmer(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
