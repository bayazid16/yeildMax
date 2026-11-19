"""
Geo App — Farm boundary storage.
Stores farm boundaries as GeoJSON polygons in a JSON field.
No PostGIS required; area is calculated in Python from coordinates.
"""
from django.db import models
from apps.farms.models import Farm
import math


def _haversine_area_ha(coords: list) -> float:
    """
    Approximate polygon area in hectares using the shoelace formula
    with degree-to-meter conversion at Bangladesh latitude (~23°N).
    Accurate enough for farm-scale polygons (< 1% error for < 100 ha).
    """
    if not coords or len(coords) < 3:
        return 0.0

    # Approximate metres per degree at ~23°N (Bangladesh centroid)
    LAT_M = 111_000  # metres per degree latitude
    LON_M = 102_100  # metres per degree longitude at 23°N

    # Convert to Cartesian metres
    pts = [(lon * LON_M, lat * LAT_M) for lon, lat in coords]

    # Shoelace formula
    n = len(pts)
    area_m2 = 0.0
    for i in range(n):
        j = (i + 1) % n
        area_m2 += pts[i][0] * pts[j][1]
        area_m2 -= pts[j][0] * pts[i][1]

    area_m2 = abs(area_m2) / 2.0
    return round(area_m2 / 10_000, 4)  # convert m² → hectares


class FarmBoundary(models.Model):
    """
    Stores the GeoJSON polygon boundary for a single farm.
    One farm → one boundary (OneToOne).
    """
    farm = models.OneToOneField(
        Farm,
        on_delete=models.CASCADE,
        related_name="boundary",
    )

    # GeoJSON Feature geometry — stored as JSON
    # e.g. {"type": "Polygon", "coordinates": [[[lon, lat], ...]]}
    geojson = models.JSONField(
        help_text="GeoJSON Polygon geometry object",
    )

    # Computed area stored for fast retrieval
    area_ha = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Auto-calculate area from coordinates before saving."""
        try:
            coords = self.geojson.get("coordinates", [[]])[0]
            self.area_ha = _haversine_area_ha(coords)
        except Exception:
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Boundary for Farm {self.farm_id} ({self.area_ha} ha)"
