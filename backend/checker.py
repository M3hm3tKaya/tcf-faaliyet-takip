from scraper import scrape_all, save_faaliyetler, load_faaliyetler


def find_changes(old_list, new_list):
    old_slugs = {f["slug"] for f in old_list}
    new_slugs = {f["slug"] for f in new_list}

    eklenen_slugs = new_slugs - old_slugs
    silinen_slugs = old_slugs - new_slugs

    eklenenler = [f for f in new_list if f["slug"] in eklenen_slugs]
    silinenler = [f for f in old_list if f["slug"] in silinen_slugs]

    return eklenenler, silinenler


def check_for_updates():
    old_list = load_faaliyetler()
    new_list = scrape_all()

    eklenenler, silinenler = find_changes(old_list, new_list)

    save_faaliyetler(new_list)

    return {
        "eklenenler": eklenenler,
        "silinenler": silinenler,
        "toplam_yeni": len(new_list),
        "toplam_eski": len(old_list),
    }


if __name__ == "__main__":
    result = check_for_updates()
    print(f"Toplam: {result['toplam_eski']} → {result['toplam_yeni']}")
    if result["eklenenler"]:
        print(f"\nYeni eklenen {len(result['eklenenler'])} faaliyet:")
        for f in result["eklenenler"]:
            print(f"  + {f['baslik']} ({f['brans']}) - {f['tarih']}")
    if result["silinenler"]:
        print(f"\nSilinen {len(result['silinenler'])} faaliyet:")
        for f in result["silinenler"]:
            print(f"  - {f['baslik']} ({f['brans']}) - {f['tarih']}")
    if not result["eklenenler"] and not result["silinenler"]:
        print("Değişiklik yok.")
