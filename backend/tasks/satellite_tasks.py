"""
Celery tasks for async satellite imagery fetching.
Currently stubs — wired for future real API (Sentinel Hub) integration.
"""
try:
    from celery import shared_task

    @shared_task(bind=True, max_retries=3)
    def fetch_satellite_imagery(self, farm_id: int, task_record_id: int):
        """
        Stub: would call Sentinel Hub API here.
        Currently marks task as failed with a clear explanation.
        """
        from apps.satellite.models import SatelliteImageryRequest
        try:
            task = SatelliteImageryRequest.objects.get(id=task_record_id)
            task.status = "failed"
            task.error_message = (
                "No satellite API key configured. "
                "Set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET to enable real imagery."
            )
            task.save()
        except Exception as exc:
            raise self.retry(exc=exc, countdown=60)

except ImportError:
    # Celery not installed — graceful degradation
    pass
