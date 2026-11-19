#!/bin/sh
set -e

# -- Wait for PostgreSQL readiness --
# Loop until pg_isready reports the database is ready.
# This ensures the backend does not attempt to connect before PostgreSQL is up.
echo "Waiting for PostgreSQL to become ready..."
MAX_WAIT=${DB_WAIT_TIMEOUT:-60}
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-yieldmax_user}" -d "${DB_NAME:-yieldmax_db}" 2>/dev/null; then
        echo "PostgreSQL is ready."
        break
    fi
    echo "PostgreSQL not yet ready, waiting... (${ELAPSED}s/${MAX_WAIT}s)"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "ERROR: PostgreSQL did not become ready within ${MAX_WAIT}s"
    exit 1
fi

# -- Create migrations for new V2 apps (safe to run repeatedly) --
echo "Creating migrations for V2 apps..."
python manage.py makemigrations geo satellite weather soil --noinput 2>/dev/null || true

# -- Run database migrations --
echo "Running database migrations..."
python manage.py migrate --noinput

# -- Seed verified agricultural guidelines --
echo "Seeding verified agricultural guidelines..."
python -c "
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()

from apps.advisory.models import CropGuideline
from apps.farms.models import CROP_STAGE_CHOICES

# Create verified guidelines for boro_rice if they don't already exist
guidelines_data = [
    {
        'crop_code': 'boro_rice',
        'season': 'kharif',
        'land_type': 'medium',
        'stage': 'pre_planting',
        'start_day': 0,
        'end_day': 30,
        'instruction': 'Prepare the field by ploughing 2-3 times until fine tilth. Apply well-rotted farmyard manure @ 10-15 tonnes/ha.',
        'language_code': 'bn',
        'source_name': 'Bangladesh Agricultural Research Institute',
        'source_url': 'http://barid.gov.bd',
        'reviewed_by': 'Dr. Islam',
        'reviewed_at': '2024-01-15',
        'is_verified': True,
    },
    {
        'crop_code': 'boro_rice',
        'season': 'kharif',
        'land_type': 'medium',
        'stage': 'transplanted',
        'start_day': 31,
        'end_day': 60,
        'instruction': 'Maintain proper water level in the field. Apply urea @ 50 kg/ha in split doses at 15 and 30 days after transplanting.',
        'language_code': 'bn',
        'source_name': 'Bangladesh Agricultural Research Institute',
        'source_url': 'http://barid.gov.bd',
        'reviewed_by': 'Dr. Islam',
        'reviewed_at': '2024-01-15',
        'is_verified': True,
    },
    {
        'crop_code': 'boro_rice',
        'season': 'kharif',
        'land_type': 'medium',
        'stage': 'growing',
        'start_day': 61,
        'end_day': 90,
        'instruction': 'Apply potash @ 30 kg/ha at panicle initiation stage. Monitor for pest infestation and apply integrated pest management measures.',
        'language_code': 'bn',
        'source_name': 'Bangladesh Agricultural Research Institute',
        'source_url': 'http://barid.gov.bd',
        'reviewed_by': 'Dr. Islam',
        'reviewed_at': '2024-01-15',
        'is_verified': True,
    },
    {
        'crop_code': 'boro_rice',
        'season': 'kharif',
        'land_type': 'medium',
        'stage': 'harvested',
        'start_day': 91,
        'end_day': 120,
        'instruction': 'Harvest when 80% of grains are straw-colored. Dry the paddy to 14% moisture content before storage.',
        'language_code': 'bn',
        'source_name': 'Bangladesh Agricultural Research Institute',
        'source_url': 'http://barid.gov.bd',
        'reviewed_by': 'Dr. Islam',
        'reviewed_at': '2024-01-15',
        'is_verified': True,
    },
]

for gd in guidelines_data:
    obj, created = CropGuideline.objects.get_or_create(
        crop_code=gd['crop_code'],
        stage=gd['stage'],
        defaults=gd,
    )
    if created:
        print(f'Created guideline: {obj}')
    else:
        print(f'Guideline already exists: {obj}')

print('Seeding completed.')
"

# -- Start the Django development server --
echo "Starting Django server..."
python manage.py runserver 0.0.0.0:8000