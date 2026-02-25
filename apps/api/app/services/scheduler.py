from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.start()
    return _scheduler


def add_one_shot(job_id: str, run_time: datetime) -> None:
    sched = start_scheduler()

    def _job():
        logger.info("Reminder triggered: %s at %s", job_id, datetime.now(timezone.utc).isoformat())

    sched.add_job(_job, "date", run_date=run_time, id=job_id, replace_existing=True)
