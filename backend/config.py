import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
KEYS_DIR = BASE_DIR / "keys"
FRONTEND_DIR = BASE_DIR.parent / "frontend"

DATA_DIR.mkdir(exist_ok=True)
KEYS_DIR.mkdir(exist_ok=True)

FAALIYETLER_URL = "https://www.tcf.gov.tr/faaliyetler/"

FAALIYETLER_JSON = DATA_DIR / "faaliyetler.json"
SUBSCRIPTIONS_JSON = DATA_DIR / "subscriptions.json"

VAPID_PRIVATE_KEY = KEYS_DIR / "private_key.pem"
VAPID_PUBLIC_KEY = KEYS_DIR / "public_key.pem"
VAPID_CLAIMS = {"sub": "mailto:bilgi@sirdaryo.com"}

CHECK_INTERVAL_MINUTES = 30

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9",
}

YILLAR = list(range(2014, 2028))

KATEGORILER = {
    "202": "Faaliyet Programı",
    "72": "Yarışma",
    "73": "Kamp",
    "74": "Kurs",
    "75": "Seminer",
    "83": "Sonuçlar",
}

BRANSLAR = {
    "64": "Erkek Artistik Cimnastik",
    "65": "Kadın Artistik Cimnastik",
    "66": "Ritmik Cimnastik",
    "67": "Trampolin Cimnastik",
    "68": "Aerobik Cimnastik",
    "69": "Parkur",
    "188": "Akrobatik Cimnastik",
    "70": "Pilates",
    "128": "Step",
    "127": "Step - Aerobik",
    "187": "Okul Sporları",
    "154": "Cimnastik Balesi",
    "155": "Ems Sis.Egz.",
    "156": "Genel Cimnastik Hareket Eğitimi",
}
