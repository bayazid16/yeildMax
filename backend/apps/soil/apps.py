"""
Soil App — Soil analysis and crop suitability.

Data transparency: V2 returns honest prototype data for demonstration.
Real soil data requires ISRIC World Soil Database, BBS soil surveys,
or local soil testing API.
"""
from django.apps import AppConfig


class SoilConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.soil"
