from django.urls import path
from .views import AdvisoryView, AdvisorChatView

urlpatterns = [
    path("advisory/<int:farm_id>/", AdvisoryView.as_view(), name="advisory-api"),
    path("advisor/chat/", AdvisorChatView.as_view(), name="advisor-chat-api"),
]
