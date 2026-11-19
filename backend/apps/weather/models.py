"""
Weather App — Weather summary for farm locations.

Data transparency: V2 returns honest prototype data for demonstration.
Real weather requires Bangladesh Meteorological Department (BMD) API
or OpenWeatherMap API key.
"""
from django.db import models
from apps.farms.models import Farm


class WeatherSnapshot(models.Model):
    """
    Cached weather data for a farm's district.
    Updated by Celery beat (hourly if real API available).
    """
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name="weather_snapshots",
    )
    district = models.CharField(max_length=100)
    temperature_c = models.FloatField(null=True, blank=True)
    humidity_pct = models.FloatField(null=True, blank=True)
    rainfall_mm_7d = models.FloatField(null=True, blank=True)
    wind_speed_kmh = models.FloatField(null=True, blank=True)
    description = models.CharField(max_length=200, blank=True)
    source = models.CharField(max_length=100, default="Prototype Estimate")
    retrieved_at = models.DateTimeField(auto_now=True)
    is_prototype_data = models.BooleanField(default=True)

    class Meta:
        ordering = ["-retrieved_at"]

    def __str__(self):
        return f"Weather for {self.district} ({self.retrieved_at})"
