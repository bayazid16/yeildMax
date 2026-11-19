
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.farms.models import Farmer, Farm
from apps.predictions.models import Prediction

from .models import ChatMessage
from services.advisor_service import FALLBACK_MESSAGE


class AdvisorChatAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/advisor/chat/"

        self.farmer = Farmer.objects.create(
            name="Test Farmer"
        )

        self.farm = Farm.objects.create(
            farmer=self.farmer,
            area_ha=2.0,
            district="Bogura",
            upazila="Shibganj",
            land_type="lowland",
            crop_code="boro_rice",
            crop_stage="growing",
        )

    def test_empty_question_returns_400(self):
        response = self.client.post(
            self.url,
            {
                "farm_id": self.farm.id,
                "question": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["code"],
            "INVALID_INPUT",
        )

    def test_invalid_farm_returns_404(self):
        response = self.client.post(
            self.url,
            {
                "farm_id": 999999,
                "question": "What fertilizer should I use?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["code"],
            "FARM_NOT_FOUND",
        )

    def test_missing_prediction_returns_404(self):
        response = self.client.post(
            self.url,
            {
                "farm_id": self.farm.id,
                "question": "What fertilizer should I use?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["code"],
            "PREDICTION_NOT_FOUND",
        )

    @patch(
        "apps.advisory.views.AdvisorServiceFacade.get_advice",
        return_value={
            "answer": "Apply fertilizer according to the crop stage.",
            "is_fallback": False,
            "reason": "SUCCESS",
        },
    )
    def test_successful_chat_saves_messages(self, mock_advisor):
        Prediction.objects.create(
            farm=self.farm,
            market_price_bdt_per_kg=30,
            total_cost_bdt=150000,
            baseline_yield_t_per_ha=5.0,
        )

        response = self.client.post(
            self.url,
            {
                "farm_id": self.farm.id,
                "question": "What fertilizer should I use?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        messages = ChatMessage.objects.filter(
            farm=self.farm
        ).order_by("created_at", "id")

        self.assertEqual(messages.count(), 2)

        self.assertEqual(messages[0].role, "user")
        self.assertEqual(
            messages[0].content,
            "What fertilizer should I use?",
        )

        self.assertEqual(messages[1].role, "assistant")
        self.assertEqual(
            messages[1].content,
            "Apply fertilizer according to the crop stage.",
        )

        self.assertEqual(
            messages[1].prompt_version,
            "v1",
        )

        mock_advisor.assert_called_once()

    @patch(
        "apps.advisory.views.AdvisorServiceFacade.get_advice",
        return_value={
            "answer": FALLBACK_MESSAGE,
            "is_fallback": True,
            "reason": "MISSING_API_KEY",
        },
    )
    def test_fallback_advisor_response_is_returned_without_saving(
        self, mock_advisor
    ):
        Prediction.objects.create(
            farm=self.farm,
            market_price_bdt_per_kg=30,
            total_cost_bdt=150000,
            baseline_yield_t_per_ha=5.0,
        )

        response = self.client.post(
            self.url,
            {
                "farm_id": self.farm.id,
                "question": "What fertilizer should I use?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_fallback"])
        self.assertEqual(response.data["answer"], FALLBACK_MESSAGE)
        self.assertEqual(response.data["reason"], "MISSING_API_KEY")

        mock_advisor.assert_called_once()
        self.assertEqual(ChatMessage.objects.count(), 0)
