
# ---------------------------------------------------------------------------
# Constants & helpers used by the service layer
# ---------------------------------------------------------------------------

BASELINE_YIELD_T_PER_HA: float = 5.0  # boro_rice default

# Prototype baseline yields (tonnes per hectare) for the crops exposed by the UI.
SUPPORTED_CROP_YIELDS = {
    "boro_rice": 5.0,
    "aman_rice": 4.2,
    "wheat": 3.5,
    "maize": 7.5,
    "potato": 20.0,
}

_SUPPORTED_CROPS = SUPPORTED_CROP_YIELDS


def validate_crop_code(crop_code: str) -> str:
    """
    Validate and return the crop_code; raise ValueError for unknown codes.
    Kept as a free function so it can be imported by services without coupling
    them to the ORM.
    """
    if crop_code not in _SUPPORTED_CROPS:
        raise ValueError(f"Unsupported crop code: '{crop_code}'")
    return crop_code


def estimate_yield(crop_code):
    """
    Return the prototype baseline yield in tonnes per hectare.
    This is a demo assumption, not a real-world forecast.
    """
    if crop_code not in SUPPORTED_CROP_YIELDS:
        raise ValueError(f"Unsupported crop code: {crop_code}")

    return SUPPORTED_CROP_YIELDS[crop_code]


def apply_scenario(base_yield, scenario_code):
    """
    Apply illustrative rainfall scenario adjustments to baseline yield.
    """
    scenario_multipliers = {
        "normal": 1.0,
        "low_rain": 0.8,
        "heavy_rain": 0.9,
    }

    if scenario_code not in scenario_multipliers:
        raise ValueError(f"Unsupported scenario: {scenario_code}")

    return round(base_yield * scenario_multipliers[scenario_code], 3)


def calculate_profit(
    area_ha,
    yield_t_per_ha=None,
    price_per_kg=None,
    total_cost_bdt=None,
    *,
    market_price_bdt_per_kg=None,
    total_cost_bdt_kw=None,
    crop_code=None,
    # Accept keyword aliases used by the new service layer
    **kwargs,
):
    """
    Calculate production, revenue, and net profit.

    Accepts both the original positional signature and the keyword-argument
    style used by the new service layer:
        calculate_profit(
            area_ha=…, yield_t_per_ha=…,
            market_price_bdt_per_kg=…, total_cost_bdt=…, crop_code=…
        )
    ``crop_code`` is accepted but not used in the calculation (reserved for
    future crop-specific logic).
    """
    # Normalise keyword alias
    if price_per_kg is None:
        price_per_kg = market_price_bdt_per_kg
    if total_cost_bdt is None:
        total_cost_bdt = kwargs.get("total_cost_bdt", total_cost_bdt_kw)

    total_production_kg = round(area_ha * yield_t_per_ha * 1000, 2)
    revenue_bdt = round(total_production_kg * price_per_kg, 2)
    net_profit_bdt = round(revenue_bdt - total_cost_bdt, 2)

    return {
        "total_production_kg": total_production_kg,
        "revenue_bdt": revenue_bdt,
        "total_cost_bdt": round(total_cost_bdt, 2),
        "net_profit_bdt": net_profit_bdt,
    }
