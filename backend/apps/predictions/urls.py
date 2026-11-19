from django.urls import path
from .views import PredictionListView, PredictionDetailView, EconomicsCalculateView

urlpatterns = [
    path("predictions/", PredictionListView.as_view(), name="predictions-api"),
    path("predictions/<int:pk>/", PredictionDetailView.as_view(), name="prediction-detail"),
    path("predictions/economics/calculate/", EconomicsCalculateView.as_view(), name="predictions-economics-calculate"),
    path("economics/calculate/", EconomicsCalculateView.as_view(), name="economics-calculate"),
]
