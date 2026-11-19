"""
PredictionService — Service Layer (SRP, OCP, DIP).
Orchestrates yield prediction and economics business logic.
Uses Strategy pattern for scenarios and Repository pattern for persistence.
"""
from typing import List, Dict, Any

from django.db import transaction

from apps.predictions.serializers import PredictionSerializer, ScenarioResultSerializer
from services.repositories import (
    FarmerRepository,
    FarmRepository,
    PredictionRepository,
    ScenarioResultRepository,
)
from services.strategies import ScenarioStrategyFactory
from services.calculations import (
    validate_crop_code,
    calculate_profit,
    estimate_yield,
)


class PredictionService:
    """
    SRP: Handles prediction creation and retrieval.
    DIP: Depends on repository abstractions.
    OCP: Extensible via ScenarioStrategyFactory without modifying this class.
    """

    def __init__(
        self,
        farmer_repo: FarmerRepository = None,
        farm_repo: FarmRepository = None,
        prediction_repo: PredictionRepository = None,
        scenario_repo: ScenarioResultRepository = None,
    ):
        self._farmer_repo = farmer_repo or FarmerRepository()
        self._farm_repo = farm_repo or FarmRepository()
        self._prediction_repo = prediction_repo or PredictionRepository()
        self._scenario_repo = scenario_repo or ScenarioResultRepository()

    def create_prediction(self, data: dict) -> dict:
        """
        Full prediction pipeline:
        1. Validate crop code
        2. Persist Farmer, Farm, Prediction in one transaction
        3. Apply all scenario strategies and persist ScenarioResult rows
        4. Return the full API response
        """
        crop_code = validate_crop_code(data["crop_code"])
        area_ha = float(data["area_ha"])
        price = float(data["market_price_bdt_per_kg"])
        total_cost = float(data["total_cost_bdt"])
        base_yield = estimate_yield(crop_code)

        with transaction.atomic():
            farmer = self._farmer_repo.create(name=data["farmer_name"])

            farm = self._farm_repo.create(
                farmer=farmer,
                area_ha=area_ha,
                district=data["district"],
                upazila=data["upazila"],
                land_type=data["land_type"],
                crop_code=crop_code,
                planting_date=data["planting_date"],
            )

            prediction = self._prediction_repo.create(
                farm=farm,
                market_price_bdt_per_kg=price,
                total_cost_bdt=total_cost,
                baseline_yield_t_per_ha=base_yield,
            )

            # Strategy Pattern: each scenario encapsulates its own multiplier
            for strategy in ScenarioStrategyFactory.all_strategies():
                scenario_yield = strategy.apply(base_yield)
                result = calculate_profit(
                    area_ha=area_ha,
                    yield_t_per_ha=scenario_yield,
                    market_price_bdt_per_kg=price,
                    total_cost_bdt=total_cost,
                    crop_code=crop_code,
                )
                self._scenario_repo.create(
                    prediction=prediction,
                    scenario_code=strategy.scenario_code,
                    yield_t_per_ha=scenario_yield,
                    total_production_kg=result["total_production_kg"],
                    revenue_bdt=result["revenue_bdt"],
                    total_cost_bdt=result["total_cost_bdt"],
                    net_profit_bdt=result["net_profit_bdt"],
                )

        scenarios = self._scenario_repo.list_by_prediction(prediction)
        return self._build_prediction_response(farmer, farm, prediction, scenarios)

    def get_prediction(self, pk: int) -> dict | None:
        prediction = self._prediction_repo.get_by_id(pk)
        if prediction is None:
            return None
        scenarios = self._scenario_repo.list_by_prediction(prediction)
        return {
            "prediction": PredictionSerializer(prediction).data,
            "farmer_name": prediction.farm.farmer.name,
            "crop_code": prediction.farm.crop_code,
            "scenarios": ScenarioResultSerializer(scenarios, many=True).data,
        }

    @staticmethod
    def _build_prediction_response(farmer, farm, prediction, scenarios) -> dict:
        return {
            "success": True,
            "prediction_id": prediction.id,
            "farm_id": farm.id,
            "farmer_name": farmer.name,
            "crop_code": farm.crop_code,
            "farm": {
                "id": farm.id,
                "area_ha": float(farm.area_ha),
                "district": farm.district,
                "upazila": farm.upazila,
            },
            "currency": "BDT",
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
            "is_prototype_estimate": True,
        }


class EconomicsService:
    """
    SRP: Only responsible for standalone economics calculations.
    No persistence — pure calculation service.
    """

    @staticmethod
    def calculate(data: dict) -> dict:
        area_ha = float(data["area_ha"])
        yield_t_per_ha = float(data["yield_t_per_ha"])
        price = float(data["market_price_bdt_per_kg"])
        total_cost = float(data["total_cost_bdt"])

        result = calculate_profit(
            area_ha=area_ha,
            yield_t_per_ha=yield_t_per_ha,
            market_price_bdt_per_kg=price,
            total_cost_bdt=total_cost,
        )

        return {
            "success": True,
            "currency": "BDT",
            "area_ha": area_ha,
            "yield_t_per_ha": yield_t_per_ha,
            **result,
            "is_prototype_estimate": True,
        }
