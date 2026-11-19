
from django.utils import timezone
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.farms.models import Farm
from apps.predictions.models import Prediction

from .models import CropGuideline, ChatMessage
from .serializers import AdvisorChatSerializer

from services.advisor_service import AdvisorServiceFacade


def serialize_guidelines(guidelines):
    return [
        {
            "id": g.id,
            "topic": g.topic,
            "stage": g.stage,
            "instruction": g.instruction,
            "start_day": g.start_day,
            "end_day": g.end_day,
            "language_code": g.language_code,
            "source_name": g.source_name,
            "source_url": g.source_url,
            "reviewed_by": g.reviewed_by,
            "reviewed_at": (g.reviewed_at.isoformat() if g.reviewed_at else None),
        }
        for g in guidelines
    ]


def guidelines_for_farm(farm):
    """Return (days_after_transplant, do_now, coming_up) for a farm.

    Tasks are selected by day range rather than the potentially-stale
    ``crop_stage`` field. The farm's land type is preferred, with a fallback to
    crop-wide guidelines so advisory works for unseeded land types.
    """
    today = timezone.localdate()
    if farm.planting_date is None or farm.planting_date > today:
        days_after_transplant = None
    else:
        days_after_transplant = (today - farm.planting_date).days

    base_guidelines = CropGuideline.objects.filter(
        crop_code=farm.crop_code,
        is_verified=True,
        reviewed_at__isnull=False,
        reviewed_by__gt="",
    )
    verified_guidelines = base_guidelines.filter(land_type=farm.land_type)
    if not verified_guidelines.exists():
        verified_guidelines = base_guidelines

    if days_after_transplant is None:
        do_now = verified_guidelines.filter(stage="pre_planting")
        coming_up = CropGuideline.objects.none()
    else:
        do_now = verified_guidelines.filter(
            start_day__lte=days_after_transplant,
            end_day__gte=days_after_transplant,
        )
        coming_up = verified_guidelines.filter(
            start_day__gt=days_after_transplant,
            start_day__lte=days_after_transplant + 7,
        )

    return days_after_transplant, do_now, coming_up


class AdvisoryView(APIView):
    """GET /api/advisory/<farm_id>/
    Returns current and upcoming crop guidelines for the given farm.
    """

    def get(self, request, farm_id):
        # 1. Find farm
        try:
            farm = Farm.objects.get(pk=farm_id)
        except Farm.DoesNotExist:
            return Response(
                {
                    "code": "FARM_NOT_FOUND",
                    "message": "Farm not found",
                    "field_errors": {"farm_id": ["Invalid farm ID."]},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Select current/upcoming guidelines for this farm
        days_after_transplant, do_now, coming_up = guidelines_for_farm(farm)

        # 3. Return advisory response
        return Response(
            {
                "farm_id": farm.id,
                "crop_code": farm.crop_code,
                "crop_stage": farm.crop_stage,
                "planting_date": (
                    farm.planting_date.isoformat() if farm.planting_date else None
                ),
                "days_after_transplant": days_after_transplant,
                "do_now": serialize_guidelines(do_now),
                "coming_up": serialize_guidelines(coming_up),
            },
            status=status.HTTP_200_OK,
        )


class AdvisorChatView(APIView):
    """POST /api/advisor/chat/
    Accepts a farm_id + question and returns a Bengali LLM-generated answer
    (or a safe fallback when no API key is configured).
    """

    def post(self, request):
        # 1. Validate request data
        serializer = AdvisorChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "code": "INVALID_INPUT",
                    "message": "Invalid chat request",
                    "field_errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        farm_id = serializer.validated_data["farm_id"]
        question = serializer.validated_data["question"]

        # 2. Find farm
        try:
            farm = Farm.objects.get(pk=farm_id)
        except Farm.DoesNotExist:
            return Response(
                {
                    "code": "FARM_NOT_FOUND",
                    "message": "Farm not found",
                    "field_errors": {"farm_id": ["Invalid farm ID."]},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 3. Load latest prediction
        prediction = (
            Prediction.objects.filter(farm=farm).order_by("-created_at").first()
        )
        if prediction is None:
            return Response(
                {
                    "code": "PREDICTION_NOT_FOUND",
                    "message": "No prediction found for this farm.",
                    "field_errors": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 4. Load scenario results and current/upcoming guidelines
        scenarios = prediction.scenarios.all().order_by("id")
        _, do_now, coming_up = guidelines_for_farm(farm)

        # 5. Call AI advisor service via Facade Pattern
        # The AdvisorServiceFacade handles missing API keys gracefully by returning
        # a Bengali fallback message instead of crashing the container.
        facade = AdvisorServiceFacade()
        result = facade.get_advice(
            context_data={
                "farmer_name": farm.farmer.name,
                "crop_code": farm.crop_code,
                "area_ha": float(farm.area_ha),
                "scenarios": [
                    {
                        "scenario_code": s.scenario_code,
                        "yield_t_per_ha": float(s.yield_t_per_ha),
                        "total_production_kg": float(s.total_production_kg),
                        "revenue_bdt": float(s.revenue_bdt),
                        "total_cost_bdt": float(s.total_cost_bdt),
                        "net_profit_bdt": float(s.net_profit_bdt),
                    }
                    for s in scenarios
                ],
                "advisory": {
                    "do_now": serialize_guidelines(do_now),
                    "coming_up": serialize_guidelines(coming_up),
                },
            },
            question=question,
        )

        # If the facade returns a fallback (e.g., missing API keys), return it immediately
        if result["is_fallback"]:
            return Response(
                {
                    "farm_id": farm.id,
                    "prediction_id": prediction.id,
                    "answer": result["answer"],
                    "is_fallback": True,
                    "reason": result["reason"],
                },
                status=status.HTTP_200_OK,
            )

        # 6. Validate AI service response (non-fallback path)
        answer = result["answer"]
        if not isinstance(answer, str) or not answer.strip():
            return Response(
                {
                    "code": "INVALID_ADVISOR_RESPONSE",
                    "message": "Advisor service returned an invalid response.",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 7. Save user question and assistant answer together
        with transaction.atomic():
            ChatMessage.objects.create(farm=farm, role="user", content=question)
            ChatMessage.objects.create(
                farm=farm,
                role="assistant",
                content=answer.strip(),
                prompt_version="v1",
            )

        # 8. Return AI response
        return Response(
            {
                "farm_id": farm.id,
                "prediction_id": prediction.id,
                "answer": answer.strip(),
            },
            status=status.HTTP_200_OK,
        )
