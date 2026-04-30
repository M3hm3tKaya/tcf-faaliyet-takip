import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from config import FRONTEND_DIR, FAALIYETLER_JSON
from scraper import load_faaliyetler, scrape_all, save_faaliyetler
from checker import check_for_updates
from notifier import (
    generate_vapid_keys,
    get_vapid_public_key,
    add_subscription,
    notify_all,
)
from scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    generate_vapid_keys()
    if not FAALIYETLER_JSON.exists():
        logger.info("İlk çalıştırma — faaliyetler çekiliyor...")
        faaliyetler = scrape_all()
        save_faaliyetler(faaliyetler)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="TCF Faaliyet Takip", lifespan=lifespan)


@app.get("/api/faaliyetler")
def get_faaliyetler(kategori: str = None, brans: str = None):
    faaliyetler = load_faaliyetler()
    if kategori:
        faaliyetler = [f for f in faaliyetler if f["kategori"] == kategori]
    if brans:
        faaliyetler = [f for f in faaliyetler if f["brans"] == brans]
    return {"toplam": len(faaliyetler), "faaliyetler": faaliyetler}


@app.get("/api/vapid-public-key")
def get_public_key():
    return {"publicKey": get_vapid_public_key()}


@app.post("/api/subscribe")
async def subscribe(request: Request):
    sub_info = await request.json()
    added = add_subscription(sub_info)
    if added:
        return {"status": "ok", "message": "Abone olundu."}
    return {"status": "ok", "message": "Zaten abone."}


@app.post("/api/check-now")
def check_now():
    result = check_for_updates()
    if result["eklenenler"]:
        notify_all(result["eklenenler"])
    return {
        "eklenen": len(result["eklenenler"]),
        "silinen": len(result["silinenler"]),
        "toplam": result["toplam_yeni"],
        "eklenenler": result["eklenenler"],
    }


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
