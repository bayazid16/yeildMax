"""
Satellite App — Satellite imagery metadata and NDVI observations.

IMPORTANT TRANSPARENCY NOTE:
Real satellite imagery requires API keys from:
- Sentinel Hub (ESA Copernicus)
- NASA EarthData / MODIS
- Planet Labs

Without these keys, this service returns honest prototype data
clearly labeled with `is_prototype_data: true`.

The Celery task infrastructure is wired and ready for real
API integration when keys are provided.
"""
from django.db import models
from apps.farms.models import Farm


TASK_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("processing", "Processing"),
    ("completed", "Completed"),
    ("failed", "Failed"),
]


class SatelliteImageryRequest(models.Model):
    """
    Tracks async requests for satellite imagery fetch tasks.
    Status is updated by the Celery worker.
    """
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name="satellite_requests",
    )
    task_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(
        max_length=20,
        choices=TASK_STATUS_CHOICES,
        default="pending",
    )
    result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Task {self.task_id} for Farm {self.farm_id} ({self.status})"


class NDVIObservation(models.Model):
    """
    Stores an NDVI value for a farm on a specific date.
    In V2 prototype, this contains illustrative data.
    """
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name="ndvi_observations",
    )
    observation_date = models.DateField()
    ndvi_mean = models.FloatField(help_text="Mean NDVI value [-1.0 to 1.0]")
    ndvi_min = models.FloatField(null=True, blank=True)
    ndvi_max = models.FloatField(null=True, blank=True)
    cloud_cover_pct = models.FloatField(
        null=True, blank=True,
        help_text="Cloud coverage percentage [0–100]",
    )
    source = models.CharField(max_length=100, default="Prototype Estimate")
    is_prototype_data = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-observation_date"]
        unique_together = ["farm", "observation_date"]

    def __str__(self):
        return f"NDVI {self.ndvi_mean:.3f} for Farm {self.farm_id} on {self.observation_date}"
