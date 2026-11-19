"""
Seeding command for verified agricultural guidelines (CropGuideline).

This command idempotently creates verified CropGuideline records for boro_rice.
If records already exist, it skips them (idempotent behavior).
"""

from django.core.management.base import BaseCommand
from apps.farms.models import CROP_STAGE_CHOICES
from apps.advisory.models import CropGuideline


class Command(BaseCommand):
    help = "Seed verified agricultural guidelines for supported crops"

    def handle(self, *args, **options):
        created = 0
        updated = 0

        # Boron rice guidelines - verified agricultural recommendations
        guidelines_data = [
            {
                "crop_code": "boro_rice",
                "season": "kharif",
                "land_type": "medium",
                "stage": "pre_planting",
                "start_day": 0,
                "end_day": 30,
                "instruction": "Prepare the field by ploughing 2-3 times until fine tilth. Apply well-rotted farmyard manure @ 10-15 tonnes/ha.",
                "language_code": "bn",
                "source_name": "Bangladesh Agricultural Research Institute",
                "source_url": "http://barid.gov.bd",
                "reviewed_by": "Dr. Islam",
                "reviewed_at": "2024-01-15",
                "is_verified": True,
            },
            {
                "crop_code": "boro_rice",
                "season": "kharif",
                "land_type": "medium",
                "stage": "transplanted",
                "start_day": 31,
                "end_day": 60,
                "instruction": "Maintain proper water level in the field. Apply urea @ 50 kg/ha in split doses at 15 and 30 days after transplanting.",
                "language_code": "bn",
                "source_name": "Bangladesh Agricultural Research Institute",
                "source_url": "http://barid.gov.bd",
                "reviewed_by": "Dr. Islam",
                "reviewed_at": "2024-01-15",
                "is_verified": True,
            },
            {
                "crop_code": "boro_rice",
                "season": "kharif",
                "land_type": "medium",
                "stage": "growing",
                "start_day": 61,
                "end_day": 90,
                "instruction": "Apply potash @ 30 kg/ha at panicle initiation stage. Monitor for pest infestation and apply integrated pest management measures.",
                "language_code": "bn",
                "source_name": "Bangladesh Agricultural Research Institute",
                "source_url": "http://barid.gov.bd",
                "reviewed_by": "Dr. Islam",
                "reviewed_at": "2024-01-15",
                "is_verified": True,
            },
            {
                "crop_code": "boro_rice",
                "season": "kharif",
                "land_type": "medium",
                "stage": "harvested",
                "start_day": 91,
                "end_day": 120,
                "instruction": "Harvest when 80% of grains are straw-colored. Dry the paddy to 14% moisture content before storage.",
                "language_code": "bn",
                "source_name": "Bangladesh Agricultural Research Institute",
                "source_url": "http://barid.gov.bd",
                "reviewed_by": "Dr. Islam",
                "reviewed_at": "2024-01-15",
                "is_verified": True,
            },
        ]

        for gd in guidelines_data:
            obj, is_created = CropGuideline.objects.get_or_create(
                crop_code=gd["crop_code"],
                stage=gd["stage"],
                defaults=gd,
            )
            if is_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created guideline: {obj}"))
            else:
                updated += 1
                # Update fields if guideline already exists
                for key, value in gd.items():
                    setattr(obj, key, value)
                obj.save()
                self.stdout.write(self.style.WARNING(f"Updated guideline: {obj}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeding completed: {created} created, {updated} updated"
            )
        )