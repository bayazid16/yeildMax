"""
Geo Views — Farm boundary CRUD.
GET  /api/geo/farms/<pk>/boundary/   → retrieve boundary
POST /api/geo/farms/<pk>/boundary/   → create or update boundary
DELETE /api/geo/farms/<pk>/boundary/ → remove boundary
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.farms.models import Farm
from .models import FarmBoundary


class FarmBoundaryView(APIView):
    """
    Manage the GeoJSON boundary for a single farm.
    Accepts a GeoJSON Polygon geometry object in the request body.
    """

    def _get_farm(self, pk):
        try:
            return Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return None

    def get(self, request, pk):
        farm = self._get_farm(pk)
        if farm is None:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            boundary = farm.boundary
            return Response({
                "farm_id": farm.id,
                "geojson": boundary.geojson,
                "area_ha": float(boundary.area_ha) if boundary.area_ha else None,
                "updated_at": boundary.updated_at.isoformat(),
            })
        except FarmBoundary.DoesNotExist:
            return Response({
                "farm_id": farm.id,
                "geojson": None,
                "area_ha": None,
                "updated_at": None,
                "message": "No boundary saved for this farm yet.",
            }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        farm = self._get_farm(pk)
        if farm is None:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        geojson = request.data.get("geojson")
        if not geojson:
            return Response(
                {"error": "Missing 'geojson' field. Expected a GeoJSON Polygon geometry."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate basic GeoJSON structure
        if geojson.get("type") != "Polygon" or "coordinates" not in geojson:
            return Response(
                {"error": "Invalid GeoJSON. Expected type='Polygon' with 'coordinates'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate coordinate ring has at least 3 points
        ring = geojson.get("coordinates", [[]])
        if not ring or len(ring[0]) < 3:
            return Response(
                {"error": "Polygon ring must have at least 3 coordinate pairs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        boundary, created = FarmBoundary.objects.update_or_create(
            farm=farm,
            defaults={"geojson": geojson},
        )

        return Response({
            "farm_id": farm.id,
            "geojson": boundary.geojson,
            "area_ha": float(boundary.area_ha) if boundary.area_ha else None,
            "updated_at": boundary.updated_at.isoformat(),
            "created": created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, pk):
        farm = self._get_farm(pk)
        if farm is None:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            farm.boundary.delete()
            return Response({"message": "Boundary deleted."}, status=status.HTTP_200_OK)
        except FarmBoundary.DoesNotExist:
            return Response({"message": "No boundary exists for this farm."}, status=status.HTTP_200_OK)
