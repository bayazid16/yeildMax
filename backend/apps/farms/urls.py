from django.urls import path
from .views import HealthCheckView, FarmListView, FarmDetailView, FarmerCreateView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("farms/", FarmListView.as_view(), name="farms-api"),
    path("farmers/", FarmerCreateView.as_view(), name="farmers-api"),
    path("farms/<int:pk>/", FarmDetailView.as_view(), name="farm-detail"),
]
