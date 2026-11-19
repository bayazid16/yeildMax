from django.urls import path
from .views import FarmBoundaryView

urlpatterns = [
    path("geo/farms/<int:pk>/boundary/", FarmBoundaryView.as_view(), name="farm-boundary"),
]
