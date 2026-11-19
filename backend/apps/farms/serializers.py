from decimal import Decimal

from rest_framework import serializers

from services.calculations import SUPPORTED_CROP_YIELDS

from .models import Farmer, Farm


# Keep serializer validation aligned with the crops the prediction engine supports.
VALID_CROP_CODES = set(SUPPORTED_CROP_YIELDS)


class FarmerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = ["id", "name"]


class FarmSerializer(serializers.ModelSerializer):

    area_ha = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    farmer_name = serializers.CharField(
        source="farmer.name",
        read_only=True,
    )

    crop_code = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_crop_code(self, value):
        if value not in VALID_CROP_CODES:
            raise serializers.ValidationError(
                "Invalid crop code. Supported crops: boro_rice."
            )
        return value

    class Meta:
        model = Farm
        fields = [
            "id",
            "farmer",
            "farmer_name",
            "area_ha",
            "district",
            "upazila",
            "land_type",
            "crop_code",
            "planting_date",
            "crop_stage",
        ]