"""
Satellite Views — Imagery metadata and NDVI time series.

Data transparency: All V2 prototype data is labeled with is_prototype_data: true.
Real data requires Sentinel Hub or NASA EarthData API keys.
"""
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.farms.models import Farm
from .models import SatelliteImageryRequest, NDVIObservation

import uuid


def _prototype_ndvi_series(farm_id: int, area_ha: float) -> list:
    """
    Generate illustrative NDVI time series for prototype demonstration.
    Values follow a typical boro rice growth curve (Jan–May).
    MUST be labeled is_prototype_data: true.
    """
    # Typical boro rice NDVI trajectory
    base_date = date(2026, 1, 15)
    trajectory = [
        (0,   0.18, "Pre-planting / bare soil"),
        (14,  0.22, "Early growth"),
        (30,  0.38, "Vegetative"),
        (45,  0.56, "Active tillering"),
        (60,  0.70, "Max vegetative"),
        (75,  0.72, "Panicle initiation"),
        (90,  0.65, "Heading"),
        (105, 0.48, "Grain filling"),
        (120, 0.32, "Ripening"),
        (135, 0.18, "Harvest"),
    ]
    return [
        {
            "date": (base_date + timedelta(days=offset)).isoformat(),
            "ndvi_mean": round(ndvi, 3),
            "ndvi_min": round(ndvi - 0.05, 3),
            "ndvi_max": round(ndvi + 0.07, 3),
            "cloud_cover_pct": 10.0 if offset % 30 != 0 else 45.0,
            "stage_hint": hint,
            "is_prototype_data": True,
        }
        for offset, ndvi, hint in trajectory
    ]


class SatelliteImageryView(APIView):
    """
    GET /api/satellite/farms/<pk>/imagery/
    Returns satellite imagery availability for the farm.
    """

    def get(self, request, pk):
        try:
            farm = Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if any real tasks have completed
        completed_tasks = SatelliteImageryRequest.objects.filter(
            farm=farm, status="completed"
        ).order_by("-created_at")[:5]

        if completed_tasks.exists():
            return Response({
                "farm_id": farm.id,
                "data_available": True,
                "imagery": [t.result for t in completed_tasks],
                "is_prototype_data": False,
            })

        # Return honest prototype response
        return Response({
            "farm_id": farm.id,
            "data_available": False,
            "is_prototype_data": True,
            "message": (
                "Satellite imagery requires Sentinel Hub or NASA EarthData API keys. "
                "No real imagery is available for this farm in the current deployment. "
                "The NDVI section shows illustrative prototype data for demonstration."
            ),
            "imagery_dates": [],
            "pending_tasks": SatelliteImageryRequest.objects.filter(
                farm=farm, status="pending"
            ).count(),
        })


class NDVIView(APIView):
    """
    GET /api/satellite/farms/<pk>/ndvi/
    Returns NDVI time series observations.
    """

    def get(self, request, pk):
        try:
            farm = Farm.objects.get(pk=pk)
        except Farm.DoesNotExist:
            return Response({"error": "Farm not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check for real stored observations
        real_obs = NDVIObservation.objects.filter(
            farm=farm, is_prototype_data=False
        ).order_by("-observation_date")

        if real_obs.exists():
            return Response({
                "farm_id": farm.id,
                "is_prototype_data": False,
                "observations": [
                    {
                        "date": obs.observation_date.isoformat(),
                        "ndvi_mean": obs.ndvi_mean,
                        "ndvi_min": obs.ndvi_min,
                        "ndvi_max": obs.ndvi_max,
                        "cloud_cover_pct": obs.cloud_cover_pct,
                        "source": obs.source,
                    }
                    for obs in real_obs
                ],
            })

        # Return prototype data with clear labeling
        return Response({
            "farm_id": farm.id,
            "is_prototype_data": True,
            "disclaimer": (
                "NDVI values below are illustrative prototype estimates for a typical "
                "boro rice growth cycle. They are NOT real satellite observations for "
                "this specific farm. Real NDVI requires Sentinel-2 API access."
            ),
            "source": "Prototype Estimate — YieldMax V2",
            "crop_reference": farm.crop_code,
            "observations": _prototype_ndvi_series(farm.id, float(farm.area_ha)),
        })


class SatelliteTaskStatusView(APIView):
    """
    GET /api/satellite/tasks/<task_id>/status/
    Returns the status of a satellite imagery fetch task.
    """

    def get(self, request, task_id):
        try:
            task = SatelliteImageryRequest.objects.get(task_id=task_id)
            return Response({
                "task_id": task.task_id,
                "farm_id": task.farm_id,
                "status": task.status,
                "result": task.result,
                "error_message": task.error_message or None,
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat(),
            })
        except SatelliteImageryRequest.DoesNotExist:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
