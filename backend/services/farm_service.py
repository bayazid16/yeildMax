"""
FarmService — Service Layer (SRP, DIP).
Orchestrates Farmer and Farm business logic.
Views depend on this service, not on ORM or serializers directly.
"""
from typing import List, Optional

from apps.farms.serializers import FarmerSerializer, FarmSerializer
from services.repositories import FarmerRepository, FarmRepository


class FarmService:
    """
    Single responsibility: all farm-related business operations.
    Depends on repository abstractions (DIP), not concrete ORM calls.
    """

    def __init__(
        self,
        farmer_repo: FarmerRepository = None,
        farm_repo: FarmRepository = None,
    ):
        self._farmer_repo = farmer_repo or FarmerRepository()
        self._farm_repo = farm_repo or FarmRepository()

    def list_farmers(self) -> list:
        farmers = self._farmer_repo.list_all()
        return FarmerSerializer(farmers, many=True).data

    def create_farmer(self, data: dict) -> dict:
        serializer = FarmerSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        farmer = serializer.save()
        return FarmerSerializer(farmer).data

    def create_farm(self, data: dict) -> dict:
        serializer = FarmSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        farm = serializer.save()
        return FarmSerializer(farm).data

    def list_farms(self) -> list:
        farms = self._farm_repo.list_all()
        return FarmSerializer(farms, many=True).data

    def get_farm(self, pk: int) -> Optional[dict]:
        farm = self._farm_repo.get_by_id(pk)
        if farm is None:
            return None
        return FarmSerializer(farm).data
