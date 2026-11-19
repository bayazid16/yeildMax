"""
Repository Pattern (DIP compliant).
All database access is encapsulated here; the service layer depends on
these abstractions, not on Django ORM calls scattered in views.
"""
from typing import List, Optional
from apps.farms.models import Farmer, Farm
from apps.predictions.models import Prediction, ScenarioResult


class FarmerRepository:
    """SRP: only responsible for Farmer persistence."""

    @staticmethod
    def create(name: str) -> Farmer:
        return Farmer.objects.create(name=name)

    @staticmethod
    def list_all() -> List[Farmer]:
        return list(Farmer.objects.all().order_by("id"))

    @staticmethod
    def get_by_id(pk: int) -> Optional[Farmer]:
        try:
            return Farmer.objects.get(pk=pk)
        except Farmer.DoesNotExist:
            return None


class FarmRepository:
    """SRP: only responsible for Farm persistence."""

    @staticmethod
    def create(**kwargs) -> Farm:
        return Farm.objects.create(**kwargs)

    @staticmethod
    def list_all() -> List[Farm]:
        return list(Farm.objects.select_related("farmer").all())

    @staticmethod
    def get_by_id(pk: int) -> Optional[Farm]:
        try:
            return Farm.objects.select_related("farmer").get(pk=pk)
        except Farm.DoesNotExist:
            return None


class PredictionRepository:
    """SRP: only responsible for Prediction persistence."""

    @staticmethod
    def create(**kwargs) -> Prediction:
        return Prediction.objects.create(**kwargs)

    @staticmethod
    def get_by_id(pk: int) -> Optional[Prediction]:
        try:
            return Prediction.objects.select_related(
                "farm", "farm__farmer"
            ).get(pk=pk)
        except Prediction.DoesNotExist:
            return None


class ScenarioResultRepository:
    """SRP: only responsible for ScenarioResult persistence."""

    @staticmethod
    def create(**kwargs) -> ScenarioResult:
        return ScenarioResult.objects.create(**kwargs)

    @staticmethod
    def list_by_prediction(prediction: Prediction) -> List[ScenarioResult]:
        return list(
            ScenarioResult.objects.filter(prediction=prediction).order_by("id")
        )
