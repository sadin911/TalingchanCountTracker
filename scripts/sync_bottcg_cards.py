#!/usr/bin/env python3
"""
Synchronizes the complete Battle of Talingchan card catalog and artwork from
the official https://bottcg.com/cards database (https://cdn.bottcg.com/data/cards.2a2b9f7e.json)
into:
  - src/data/talingchanCards.json
  - src/data/talingchanSets.json
  - public/card-images/<setCode>/<collectorNumber>.webp

Then ready for Cloudflare R2 upload via `node scripts/upload-to-r2.mjs`.
"""
import io
import json
import os
import re
import time
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}

CARD_DB_URL = "https://cdn.bottcg.com/data/cards.feab7649.json"
CDN_CARDS_BASE = "https://cdn.bottcg.com/cards"
SPECIAL_RARITIES = {"SCR", "PR", "CBR"}
RARITY_SUFFIX_SETS = {"B2SA", "B2SB"}
FOLDER_MAP = {
    "SD09": "123v1k1",
    "RM01": "0aslabe",
    "BT12": "thankyoupnes",
    "B2SA": "thankyoupnes",
    "B2SB": "thankyoupnes",
}

SET_METADATA = [
    # Booster Sets
    {"code": "BT01", "name": "Welcome ตลิ่งชัน", "type": "Booster", "releasedAt": "2024-01-12"},
    {"code": "BT02", "name": "Attack on เพื่อนบ้าน", "type": "Booster", "releasedAt": "2024-03-29"},
    {"code": "BT03", "name": "อมนุษย์ Invasion", "type": "Booster", "releasedAt": "2024-05-31"},
    {"code": "BT04", "name": "ความจริง Today", "type": "Booster", "releasedAt": "2024-07-26"},
    {"code": "BT05", "name": "Culture ช็อค", "type": "Booster", "releasedAt": "2024-09-27"},
    {"code": "BT06", "name": "โลกา Armageddon", "type": "Booster", "releasedAt": "2024-11-29"},
    {"code": "BT07", "name": "Life of หน่วง", "type": "Booster", "releasedAt": "2025-01-24"},
    {"code": "BT08", "name": "เพราะ Warrior is นักรบ", "type": "Booster", "releasedAt": "2025-03-28"},
    {"code": "BT09", "name": "มิตรภาพและสายฟ้า", "type": "Booster", "releasedAt": "2025-05-30"},
    {"code": "BT10", "name": "อันธการไร้นาม", "type": "Booster", "releasedAt": "2025-07-25"},
    {"code": "BT11", "name": "Journey to นคร Z", "type": "Booster", "releasedAt": "2025-09-26"},
    {"code": "BT12", "name": "ทำไงดี ??!! เกิดใหม่ทั้งทีก็ต้องมานั่งเล่นการ์ดท่ามกลางคนไม่ปกติในตลิ่งชันซะแล้ว", "type": "Booster", "releasedAt": "2026-11-13"},
    # Starter Decks
    {"code": "SD01", "name": "ตัวตึงไกรลาส", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD02", "name": "วีรบุรุษปากซอย", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD03", "name": "นรกก็แค่น้ำพริก", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD04", "name": "ทหารไก่ชนเขา", "type": "Starter", "releasedAt": "2024-02-16"},
    {"code": "SD05", "name": "กำเนิดจากน้ำ", "type": "Starter", "releasedAt": "2024-04-19"},
    {"code": "SD06", "name": "๖ ประจัญบาน", "type": "Starter", "releasedAt": "2024-06-21"},
    {"code": "SD07", "name": "VS 18 หัวเมือง", "type": "Starter", "releasedAt": "2024-08-23"},
    {"code": "SD08", "name": "กองทัพตัวจี๊ดหัวใจยึดโลก", "type": "Starter", "releasedAt": "2024-10-25"},
    {"code": "SD09", "name": "ลิงกว่านรก", "type": "Starter", "releasedAt": "2024-12-20"},
    # Special & Community Sets
    {"code": "CC01", "name": "Community Collection 01", "type": "Special", "releasedAt": "2024-03-01"},
    {"code": "CC02", "name": "Community Collection 02", "type": "Special", "releasedAt": "2024-07-01"},
    {"code": "KD00", "name": "ศึกชิงเจ้ายุทธภพ (KD00)", "type": "Special", "releasedAt": "2024-04-01"},
    {"code": "KD01", "name": "อวาตาร์ลงทัณฑ์", "type": "Special", "releasedAt": "2024-05-10"},
    {"code": "KD02", "name": "พันธสัญญาโลหิต", "type": "Special", "releasedAt": "2024-07-12"},
    {"code": "KD03", "name": "มุ่งสู่ฝันเป็นที่ 1", "type": "Special", "releasedAt": "2024-09-13"},
    {"code": "KD04", "name": "ชะตากรแห่งจุดจบ", "type": "Special", "releasedAt": "2024-11-15"},
    {"code": "ODY1", "name": "Odenya 01", "type": "Special", "releasedAt": "2024-02-01"},
    {"code": "RM01", "name": "Remix 01", "type": "Special", "releasedAt": "2024-12-06"},
    {"code": "SL01", "name": "Selection 01", "type": "Special", "releasedAt": "2024-10-11"},
    {"code": "SL02", "name": "Selection 02", "type": "Special", "releasedAt": "2025-02-14"},
    {"code": "B2SA", "name": "สมรภูมิ Passion", "type": "Special", "releasedAt": "2026-10-31"},
    {"code": "B2SB", "name": "มินิไกรลาส", "type": "Special", "releasedAt": "2026-10-31"},
    {"code": "PRMO", "name": "การ์ดโปรโม (Promo)", "type": "Special", "releasedAt": "2024-01-01"},
    {"code": "STOR", "name": "การ์ดโปรโมร้านค้า (Store Promo)", "type": "Special", "releasedAt": "2026-10-31"},
    {"code": "FPRO", "name": "Festival Promo", "type": "Special", "releasedAt": "2024-10-01"},
    {"code": "PRE0", "name": "Pre-Release / Demo (PRE0)", "type": "Special", "releasedAt": "2023-11-01"},
    {"code": "APFD", "name": "April Fools' Day (APFD)", "type": "Special", "releasedAt": "2025-04-01"},
]

SET_NAME_MAP = {s["code"]: s["name"] for s in SET_METADATA}


def get_bottcg_image_url(print_code: str, rare: str) -> str:
    set_code = print_code.split("-")[0]
    folder = FOLDER_MAP.get(set_code, "")
    base = f"{CDN_CARDS_BASE}/{folder}" if folder else CDN_CARDS_BASE
    filename = f"{print_code}-{rare}" if (rare in SPECIAL_RARITIES or set_code in RARITY_SUFFIX_SETS) else print_code
    return f"{base}/{filename}.png"


def map_card_type(raw_type: str, raw_subtype: str | None) -> str:
    if raw_type == "Avatar":
        return "Avatar"
    if raw_type == "Construct":
        return "Construct"
    if raw_type == "Life":
        return "Life Card"
    if raw_type == "Token":
        return "Avatar"
    if raw_type == "Magic":
        if raw_subtype == "Modification":
            return "Modification"
        if raw_subtype == "React":
            return "React Magic"
        if raw_subtype == "Land":
            return "Land Magic"
        return "Magic"
    return "Avatar"


def map_color(raw_color: str | None) -> str:
    c = (raw_color or "").strip()
    if c == "แดง":
        return "RED"
    if c == "ฟ้า":
        return "BLUE"
    if c == "เขียว":
        return "GREEN"
    if c == "ม่วง":
        return "BLACK"
    return "COLORLESS"


def map_rarity(raw_rare: str | None) -> str:
    r = (raw_rare or "C").upper().strip()
    if r in ("SCR", "USEC", "SEC"):
        return "Secret_rare"
    if r == "UR":
        return "Ultra_rare"
    if r == "SR":
        return "Super_rare"
    if r == "R":
        return "Rare"
    if r in ("PR", "CBR"):
        return "Promo"
    return "Common"


def clean_effect_text(main_effect: str | None, favor_text: str | None) -> str:
    text = (main_effect or "").strip()
    # Convert {symbol X} to [เผ่า: X] for clean readability
    text = re.sub(r"\{symbol\s+([^}]+)\}", r"[\1]", text)
    if not text and favor_text:
        return favor_text.strip()
    return text


def ensure_card_webp(card: dict, output_root: str) -> dict:
    set_code = card["setCode"]
    col_num = card["collectorNumber"]
    url = card["imageUrl"]

    set_dir = os.path.join(output_root, set_code)
    os.makedirs(set_dir, exist_ok=True)
    dest_path = os.path.join(set_dir, f"{col_num}.webp")

    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        return {"status": "cached", "id": card["id"]}

    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw_bytes = resp.read()
                if len(raw_bytes) > 500:
                    img = Image.open(io.BytesIO(raw_bytes))
                    if img.mode not in ("RGB", "RGBA"):
                        img = img.convert("RGBA")
                    img.save(dest_path, format="WEBP", quality=92, method=4)
                    return {
                        "status": "downloaded",
                        "id": card["id"],
                        "bytes": os.path.getsize(dest_path),
                    }
        except Exception as e:
            if attempt == 3:
                return {"status": "failed", "id": card["id"], "url": url, "error": str(e)}
            time.sleep(0.8 * (attempt + 1))

    return {"status": "failed", "id": card["id"], "url": url, "error": "exhausted retries"}


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "src", "data")
    cards_path = os.path.join(data_dir, "talingchanCards.json")
    sets_path = os.path.join(data_dir, "talingchanSets.json")
    images_dir = os.path.join(base_dir, "public", "card-images")

    print(f"Fetching official card database from {CARD_DB_URL} ...")
    req = urllib.request.Request(CARD_DB_URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        bot_cards = json.loads(resp.read().decode("utf-8"))

    print(f"Fetched {len(bot_cards)} official card entries from bottcg.com.")

    # Count how many entries share each print code and collect all rarity variants per print
    print_counts = Counter(c["print"] for c in bot_cards)
    print_rarities = defaultdict(list)
    for c in bot_cards:
        r = c.get("rare", "C")
        if r not in print_rarities[c["print"]]:
            print_rarities[c["print"]].append(r)

    transformed_cards = []
    for c in bot_cards:
        p = c["print"]
        rare = c.get("rare", "C")
        set_code, rest_num = p.split("-", 1)
        is_alt_art = print_counts[p] > 1 and (
            rare in SPECIAL_RARITIES or set_code in RARITY_SUFFIX_SETS
        )

        card_id = f"{p}-{rare}" if is_alt_art else p
        collector_number = f"{rest_num}-{rare}" if is_alt_art else rest_num
        raw_type = c.get("type", "Avatar")
        raw_subtype = c.get("subtype")
        card_type = map_card_type(raw_type, raw_subtype)
        color = map_color(c.get("color"))
        rarity = map_rarity(rare)
        ex = c.get("ex", "")

        # Cost / Gems / Power mapping according to Battle of Talingchan rules:
        # - Avatar & Construct: cost = c.cost, gems = c.gem, power = c.power
        # - Magic (all subtypes): cost = 0 (free to cast), gems = c.cost (gem value printed on Magic card), power = None
        # - Life Card: cost = None, gems = None, power = None
        if raw_type == "Life":
            cost = None
            gems = None
            power = None
        elif raw_type == "Magic":
            cost = 0
            gems = int(c["cost"]) if "cost" in c and c["cost"] is not None else 1
            power = None
        else:
            cost = int(c["cost"]) if "cost" in c and c["cost"] is not None else 0
            gems = int(c["gem"]) if "gem" in c and c["gem"] is not None else 0
            power = int(c["power"]) if "power" in c and c["power"] is not None else 0

        # Finishes
        if rare in ("SCR", "USEC") or (is_alt_art and set_code not in RARITY_SUFFIX_SETS):
            finishes = ["normal", "foil", "secret"]
        elif rare in ("SR", "UR", "PR", "CBR"):
            finishes = ["normal", "foil"]
        else:
            finishes = ["normal"]

        img_url = get_bottcg_image_url(p, rare)
        set_name = SET_NAME_MAP.get(set_code, set_code)

        transformed_cards.append(
            {
                "id": card_id,
                "name": c.get("name", card_id).strip(),
                "setCode": set_code,
                "setName": set_name,
                "collectorNumber": collector_number,
                "cardType": card_type,
                "color": color,
                "symbol": c.get("symbol") or ("Life" if raw_type == "Life" else "ทั่วไป"),
                "soi": int(c.get("soi", 1)),
                "cost": cost,
                "gems": gems,
                "power": power,
                "rarity": rarity,
                "isOnlyOne": ex == "Only #1",
                "isBiased": ex == "ลำเอียง",
                "isCollab": ex == "โดนใจ",
                "illustrator": c.get("creator") or "PASULOL",
                "effect": clean_effect_text(c.get("mainEffect"), c.get("favorText")),
                "rarityVariants": [rare] if is_alt_art else print_rarities[p],
                "finishes": finishes,
                "imageUrl": img_url,
            }
        )

    # Sort cards cleanly by set order then collectorNumber
    set_order = {s["code"]: idx for idx, s in enumerate(SET_METADATA)}
    transformed_cards.sort(
        key=lambda x: (set_order.get(x["setCode"], 999), x["collectorNumber"], x["id"])
    )

    # Build sets array with exact card counts
    counts_by_set = Counter(c["setCode"] for c in transformed_cards)
    final_sets = []
    for s in SET_METADATA:
        code = s["code"]
        if counts_by_set[code] > 0:
            final_sets.append(
                {
                    "code": code,
                    "name": s["name"],
                    "type": s["type"],
                    "releasedAt": s["releasedAt"],
                    "cardCount": counts_by_set[code],
                }
            )

    with open(cards_path, "w", encoding="utf-8") as f:
        json.dump(transformed_cards, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {len(transformed_cards)} cards to {cards_path}")

    with open(sets_path, "w", encoding="utf-8") as f:
        json.dump(final_sets, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {len(final_sets)} sets to {sets_path}")

    # Download & convert all missing card images to public/card-images/<setCode>/<collectorNumber>.webp
    print(f"\n--- Syncing {len(transformed_cards)} Card Images from cdn.bottcg.com ---")
    downloaded = 0
    cached = 0
    failed = []
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {
            executor.submit(ensure_card_webp, card, images_dir): card
            for card in transformed_cards
        }
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res["status"] == "downloaded":
                downloaded += 1
            elif res["status"] == "cached":
                cached += 1
            else:
                failed.append(res)

            if idx % 100 == 0 or idx == len(transformed_cards):
                elapsed = time.time() - start_time
                print(
                    f"  Progress: {idx}/{len(transformed_cards)} "
                    f"(new: {downloaded}, cached: {cached}, failed: {len(failed)}) [{elapsed:.1f}s]"
                )

    print(
        f"\n🎉 Image Sync Summary: {downloaded} newly downloaded & converted to WebP, "
        f"{cached} already cached, {len(failed)} failed."
    )
    if failed:
        print("Failed items:")
        for item in failed[:20]:
            print(" ", item)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
