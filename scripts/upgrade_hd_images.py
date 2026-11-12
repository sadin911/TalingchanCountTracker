#!/usr/bin/env python3
"""
Upgrades all low-resolution (388x528) card images in public/card-images/<setCode>/<collectorNumber>.webp:
1. Fetches authentic high-resolution originals (1175x1600 to 3125x4365) from Battle of Talingchan Fandom Wiki when available.
2. For cards where only 388x528 exists anywhere, performs a clean 2x Lanczos + UnsharpMask super-resolution upscale (776x1056) so text and artwork look crisp at large display sizes.
"""
import io
import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageFilter

BASE_API = "https://battle-of-talingchan.fandom.com/th/api.php"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def fetch_wiki_allimages() -> dict[str, tuple[str, int, int]]:
    all_imgs: dict[str, tuple[str, int, int]] = {}
    aicontinue = ""
    while True:
        url = f"{BASE_API}?action=query&list=allimages&ailimit=500&format=json&aiprop=url|dimensions"
        if aicontinue:
            url += f"&aicontinue={aicontinue}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for img in data.get("query", {}).get("allimages", []):
            stem = re.sub(r"\.(png|jpe?g|webp|gif)$", "", img["name"], flags=re.I).lower().strip()
            w = int(img.get("width", 0))
            h = int(img.get("height", 0))
            if stem not in all_imgs or w > all_imgs[stem][1]:
                all_imgs[stem] = (img["url"], w, h)
        if "continue" in data:
            aicontinue = data["continue"].get("aicontinue", "")
        else:
            break
    return all_imgs


def upgrade_single_card(card: dict, images_dir: str, wiki_imgs: dict[str, tuple[str, int, int]]) -> dict:
    set_code = card["setCode"]
    col_num = card["collectorNumber"]
    path = os.path.join(images_dir, set_code, f"{col_num}.webp")
    if not os.path.exists(path):
        return {"status": "missing", "id": card["id"]}

    try:
        with Image.open(path) as im:
            w, h = im.size
    except Exception:
        w, h = 0, 0

    if w >= 750:
        return {"status": "already_hd", "id": card["id"], "size": (w, h)}

    # Check if Wiki has a genuine High-Res (>600px wide) scan
    candidates = [
        card["id"].lower(),
        card["id"].lower().replace("-scr", "-sec"),
        card["id"].lower().replace("-sec", "-scr"),
        card["id"].lower().replace("-", ""),
        card["name"].lower().strip(),
    ]
    wiki_match = None
    for cand in candidates:
        if cand in wiki_imgs and wiki_imgs[cand][1] > 600:
            wiki_match = wiki_imgs[cand]
            break

    if wiki_match:
        url, tw, th = wiki_match
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=20) as resp:
                    raw = resp.read()
                    if len(raw) > 1000:
                        img = Image.open(io.BytesIO(raw))
                        if img.mode not in ("RGB", "RGBA"):
                            img = img.convert("RGBA")
                        # Cap extremely huge 3125x4365 scans to 1175x1600 so they load fast while staying razor sharp
                        if img.width > 1200:
                            ratio = 1175 / img.width
                            img = img.resize((1175, int(img.height * ratio)), Image.Resampling.LANCZOS)
                        img.save(path, format="WEBP", quality=92, method=4)
                        return {"status": "wiki_hd", "id": card["id"], "size": img.size}
            except Exception:
                time.sleep(0.5)

    # Fallback: 2x Lanczos + UnsharpMask crisp upscale for cards that only exist in 388x528
    try:
        with Image.open(path) as img:
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            new_size = (img.width * 2, img.height * 2)
            upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
            sharpened = upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=2))
            sharpened.save(path, format="WEBP", quality=92, method=4)
            return {"status": "upscaled_2x", "id": card["id"], "size": new_size}
    except Exception as e:
        return {"status": "error", "id": card["id"], "error": str(e)}


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cards_path = os.path.join(base_dir, "src", "data", "talingchanCards.json")
    images_dir = os.path.join(base_dir, "public", "card-images")

    with open(cards_path, "r", encoding="utf-8") as f:
        cards = json.load(f)

    print("Fetching high-resolution image index from Fandom Wiki...")
    wiki_imgs = fetch_wiki_allimages()
    print(f"Indexed {len(wiki_imgs)} Wiki images.")

    counts = {"already_hd": 0, "wiki_hd": 0, "upscaled_2x": 0, "missing": 0, "error": 0}
    start = time.time()

    with ThreadPoolExecutor(max_workers=16) as ex:
        futures = {ex.submit(upgrade_single_card, c, images_dir, wiki_imgs): c for c in cards}
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            counts[res["status"]] = counts.get(res["status"], 0) + 1
            if idx % 200 == 0 or idx == len(cards):
                elapsed = time.time() - start
                print(
                    f"Progress: {idx}/{len(cards)} | "
                    f"already_hd={counts['already_hd']}, wiki_hd={counts['wiki_hd']}, "
                    f"upscaled_2x={counts['upscaled_2x']}, error={counts['error']} [{elapsed:.1f}s]"
                )

    print("\n✅ High-Res Image Upgrade Complete:", counts)


if __name__ == "__main__":
    main()
