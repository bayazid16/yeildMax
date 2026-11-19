
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.farms.urls")),
    path("api/", include("apps.predictions.urls")),
    path("api/", include("apps.advisory.urls")),
    # V2 endpoints
    path("api/", include("apps.geo.urls")),
    path("api/", include("apps.satellite.urls")),
    path("api/", include("apps.weather.urls")),
    path("api/", include("apps.soil.urls")),
]
