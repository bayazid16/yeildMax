"""
Scenario Strategy Pattern (OCP + LSP compliant).
Add new rainfall scenarios without modifying existing code.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class ScenarioStrategy(ABC):
    """Abstract base — all rainfall scenarios implement this contract (LSP)."""

    @property
    @abstractmethod
    def scenario_code(self) -> str: ...

    @property
    @abstractmethod
    def yield_multiplier(self) -> float: ...

    def apply(self, base_yield_t_per_ha: float) -> float:
        return round(base_yield_t_per_ha * self.yield_multiplier, 3)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario_code": self.scenario_code,
            "yield_multiplier": self.yield_multiplier,
        }


class NormalRainStrategy(ScenarioStrategy):
    scenario_code = "normal"
    yield_multiplier = 1.0


class LowRainStrategy(ScenarioStrategy):
    scenario_code = "low_rain"
    yield_multiplier = 0.8


class HeavyRainStrategy(ScenarioStrategy):
    scenario_code = "heavy_rain"
    yield_multiplier = 0.9


class ScenarioStrategyFactory:
    """
    Factory Pattern — instantiates the correct ScenarioStrategy by code.
    OCP: extend by adding new entries without touching existing strategies.
    """
    _registry: Dict[str, type] = {
        "normal": NormalRainStrategy,
        "low_rain": LowRainStrategy,
        "heavy_rain": HeavyRainStrategy,
    }

    @classmethod
    def create(cls, scenario_code: str) -> ScenarioStrategy:
        klass = cls._registry.get(scenario_code)
        if klass is None:
            raise ValueError(f"Unknown scenario_code: '{scenario_code}'")
        return klass()

    @classmethod
    def all_strategies(cls):
        return [klass() for klass in cls._registry.values()]
