import requests

url = "https://www.tcf.gov.tr/faaliyetler/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers, timeout=30)
resp.encoding = "utf-8"

with open("backend/data/raw_page.html", "w", encoding="utf-8") as f:
    f.write(resp.text)

print(f"Status: {resp.status_code}")
print(f"Boyut: {len(resp.text)} karakter")
print("Kaydedildi: backend/data/raw_page.html")
