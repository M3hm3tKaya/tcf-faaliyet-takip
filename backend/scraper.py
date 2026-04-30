import json
import re
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from config import FAALIYETLER_URL, FAALIYETLER_JSON, HEADERS


def fetch_page(yil=None):
    if yil:
        data = {"yilsec": str(yil)}
        resp = requests.post(FAALIYETLER_URL, data=data, headers=HEADERS, timeout=30)
    else:
        resp = requests.get(FAALIYETLER_URL, headers=HEADERS, timeout=30)
    resp.encoding = "utf-8"
    return resp.text


def parse_faaliyetler(html):
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", class_="sonuc-tablo-tum")
    if not table:
        return []

    tbody = table.find("tbody")
    if not tbody:
        return []

    faaliyetler = []
    for tr in tbody.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 7:
            continue

        yil = tds[0].get_text(strip=True)
        kategori = tds[1].get_text(strip=True)
        baslik = tds[2].get_text(strip=True)

        brans_span = tds[3].find("span")
        brans = brans_span.get_text(strip=True) if brans_span else tds[3].get_text(strip=True)

        yer = tds[4].get_text(strip=True)

        tarih_td = tds[5]
        hidden_span = tarih_td.find("span", style=re.compile("display.*none"))
        siralama_tarihi = hidden_span.get_text(strip=True) if hidden_span else ""
        tarih_text = tarih_td.get_text(strip=True)
        if siralama_tarihi and tarih_text.startswith(siralama_tarihi):
            tarih_text = tarih_text[len(siralama_tarihi):]
        tarih = tarih_text.strip()

        link_tag = tds[6].find("a", href=True)
        detay_url = link_tag["href"] if link_tag else ""

        slug = ""
        if detay_url:
            parts = detay_url.rstrip("/").split("/")
            slug = parts[-1] if parts else ""

        faaliyet = {
            "slug": slug,
            "yil": yil,
            "kategori": kategori,
            "baslik": baslik,
            "brans": brans,
            "yer": yer,
            "tarih": tarih,
            "detay_url": detay_url,
        }
        faaliyetler.append(faaliyet)

    return faaliyetler


def scrape_all():
    print(f"[{datetime.now():%H:%M:%S}] TCF faaliyetler çekiliyor...")
    html = fetch_page()
    faaliyetler = parse_faaliyetler(html)
    print(f"[{datetime.now():%H:%M:%S}] {len(faaliyetler)} faaliyet bulundu.")
    return faaliyetler


def save_faaliyetler(faaliyetler):
    data = {
        "son_guncelleme": datetime.now().isoformat(),
        "toplam": len(faaliyetler),
        "faaliyetler": faaliyetler,
    }
    with open(FAALIYETLER_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[{datetime.now():%H:%M:%S}] {FAALIYETLER_JSON} kaydedildi.")


def load_faaliyetler():
    if not FAALIYETLER_JSON.exists():
        return []
    with open(FAALIYETLER_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("faaliyetler", [])


if __name__ == "__main__":
    faaliyetler = scrape_all()
    save_faaliyetler(faaliyetler)
    for f in faaliyetler[:5]:
        print(f"  {f['yil']} | {f['kategori']:20s} | {f['baslik'][:50]:50s} | {f['brans']}")
    print(f"  ... toplam {len(faaliyetler)} kayıt")
