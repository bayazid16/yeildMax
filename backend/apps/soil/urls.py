from django.urls import path
from .views import SoilAnalysisView, CropSuitabilityView

urlpatterns = [
    path("soil/farms/<int:pk>/", SoilAnalysisView.as_view(), name="soil-analysis"),
    path("crop-suitability/farms/<int:pk>/", CropSuitabilityView.as_view(), name="crop-suitability"),
]
