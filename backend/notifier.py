import json
import logging
import base64
from pathlib import Path

from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS, SUBSCRIPTIONS_JSON

logger = logging.getLogger(__name__)


def generate_vapid_keys():
    if VAPID_PRIVATE_KEY.exists() and VAPID_PUBLIC_KEY.exists():
        return
    vapid = Vapid()
    vapid.generate_keys()
    vapid.save_key(str(VAPID_PRIVATE_KEY))
    vapid.save_public_key(str(VAPID_PUBLIC_KEY))
    logger.info("VAPID anahtarları oluşturuldu.")


def get_vapid_public_key():
    generate_vapid_keys()
    vapid = Vapid.from_file(str(VAPID_PRIVATE_KEY))
    raw = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def load_subscriptions():
    if not SUBSCRIPTIONS_JSON.exists():
        return []
    with open(SUBSCRIPTIONS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def save_subscriptions(subs):
    with open(SUBSCRIPTIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(subs, f, ensure_ascii=False, indent=2)


def add_subscription(subscription_info):
    subs = load_subscriptions()
    endpoints = {s["endpoint"] for s in subs}
    if subscription_info["endpoint"] not in endpoints:
        subs.append(subscription_info)
        save_subscriptions(subs)
        return True
    return False


def remove_subscription(endpoint):
    subs = load_subscriptions()
    subs = [s for s in subs if s["endpoint"] != endpoint]
    save_subscriptions(subs)


def send_push(subscription_info, message):
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(message, ensure_ascii=False),
            vapid_private_key=str(VAPID_PRIVATE_KEY),
            vapid_claims=VAPID_CLAIMS,
        )
        return True
    except WebPushException as e:
        if e.response and e.response.status_code in (404, 410):
            remove_subscription(subscription_info["endpoint"])
            logger.info("Geçersiz subscription silindi.")
        else:
            logger.error(f"Push gönderilemedi: {e}")
        return False


def notify_all(eklenenler):
    if not eklenenler:
        return 0

    subs = load_subscriptions()
    if not subs:
        logger.info("Bildirim gönderilecek abone yok.")
        return 0

    count = len(eklenenler)
    if count == 1:
        f = eklenenler[0]
        message = {
            "title": "Yeni TCF Faaliyeti",
            "body": f"{f['baslik']} - {f['brans']} ({f['yer']}, {f['tarih']})",
            "url": f["detay_url"],
            "tag": f["slug"],
        }
    else:
        basliklar = ", ".join(f["baslik"] for f in eklenenler[:3])
        message = {
            "title": f"{count} Yeni TCF Faaliyeti",
            "body": basliklar,
            "url": "https://www.tcf.gov.tr/faaliyetler/",
            "tag": "toplu-bildirim",
        }

    sent = 0
    for sub in subs:
        if send_push(sub, message):
            sent += 1

    logger.info(f"{sent}/{len(subs)} aboneye bildirim gönderildi.")
    return sent
