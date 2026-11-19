from django.urls import path
from .views import WeatherView

urlpatterns = [
    path("weather/farms/<int:pk>/", WeatherView.as_view(), name="weather"),
]
