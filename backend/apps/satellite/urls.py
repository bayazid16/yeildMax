from django.urls import path
from .views import SatelliteImageryView, NDVIView, SatelliteTaskStatusView

urlpatterns = [
    path("satellite/farms/<int:pk>/imagery/", SatelliteImageryView.as_view(), name="satellite-imagery"),
    path("satellite/farms/<int:pk>/ndvi/", NDVIView.as_view(), name="satellite-ndvi"),
    path("satellite/tasks/<str:task_id>/status/", SatelliteTaskStatusView.as_view(), name="satellite-task-status"),
]
