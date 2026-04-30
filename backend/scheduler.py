import logging
from apscheduler.schedulers.background import BackgroundScheduler

from checker import check_for_updates
from notifier import notify_all
from config import CHECK_INTERVAL_MINUTES

logger = logging.getLogger(__name__)

_scheduler = None


def scheduled_check():
    try:
        result = check_for_updates()
        if result["eklenenler"]:
            logger.info(f"{len(result['eklenenler'])} yeni faaliyet tespit edildi!")
            notify_all(result["eklenenler"])
        else:
            logger.info("Yeni faaliyet yok.")
    except Exception as e:
        logger.error(f"Zamanlı kontrol hatası: {e}")


def start_scheduler():
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        scheduled_check,
        "interval",
        minutes=CHECK_INTERVAL_MINUTES,
        id="tcf_check",
    )
    _scheduler.start()
    logger.info(f"Zamanlayıcı başlatıldı — her {CHECK_INTERVAL_MINUTES} dakikada kontrol edilecek.")


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        logger.info("Zamanlayıcı durduruldu.")
