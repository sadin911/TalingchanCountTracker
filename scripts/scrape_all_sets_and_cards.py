#!/usr/bin/env python3
"""
Comprehensive scraper that extracts all cards from all 37 set checklists
and standalone card articles on Battle of Talingchan Wiki.
"""
import urllib.request
import urllib.parse
import json
import re
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_API = 'https://battle-of-talingchan.fandom.com/th/api.php'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

SET_PAGES = [
    # Booster Sets
    {"code": "BT01", "name": "Welcome ตลิ่งชัน", "type": "Booster", "releasedAt": "2024-01-12", "wiki": "BT01 Welcome ตลิ่งชัน"},
    {"code": "BT02", "name": "Attack on เพื่อนบ้าน", "type": "Booster", "releasedAt": "2024-03-29", "wiki": "BT02 Attack on เพื่อนบ้าน"},
    {"code": "BT03", "name": "อมนุษย์ Invasion", "type": "Booster", "releasedAt": "2024-05-31", "wiki": "BT03 อมนุษย์ Invasion"},
    {"code": "BT04", "name": "ความจริง Today", "type": "Booster", "releasedAt": "2024-07-26", "wiki": "BT04 ความจริง Today"},
    {"code": "BT05", "name": "Culture ช็อค", "type": "Booster", "releasedAt": "2024-09-27", "wiki": "BT05 Culture ช็อค"},
    {"code": "BT06", "name": "โลกา Armageddon", "type": "Booster", "releasedAt": "2024-11-29", "wiki": "BT06 โลกา Armageddon"},
    {"code": "BT07", "name": "Life of หน่วง", "type": "Booster", "releasedAt": "2025-01-24", "wiki": "BT07 Life of หน่วง"},
    {"code": "BT08", "name": "เพราะ Warrior is นักรบ", "type": "Booster", "releasedAt": "2025-03-28", "wiki": "เพราะ Warrior is นักรบ"},
    {"code": "BT09", "name": "มิตรภาพและสายฟ้า", "type": "Booster", "releasedAt": "2025-05-30", "wiki": "BT09 มิตรภาพและสายฟ้า"},
    {"code": "BT10", "name": "อันธการไร้นาม", "type": "Booster", "releasedAt": "2025-07-25", "wiki": "BT10 อันธการไร้นาม"},
    {"code": "BT11", "name": "Journey to นคร Z", "type": "Booster", "releasedAt": "2025-09-26", "wiki": "BT11 Journey to นคร Z"},
    {"code": "BT12", "name": "ทำไงดี ??!! เกิดใหม่ทั้งทีก็ต้องมานั่งเล่นการ์ดท่ามกลางคนไม่ปกติในตลิ่งชันซะแล้ว", "type": "Booster", "releasedAt": "2025-11-28", "wiki": "BT12 ทำไงดี ??!! เกิดใหม่ทั้งทีก็ต้องมานั่งเล่นการ์ดท่ามกลางคนไม่ปกติในตลิ่งชันซะแล้ว"},
    {"code": "BT13", "name": "Battle of Gods", "type": "Booster", "releasedAt": "2026-01-30", "wiki": "BT13 Battle of Gods"},
    
    # Starter Sets
    {"code": "SD01", "name": "ตัวตึงไกรลาส", "type": "Starter", "releasedAt": "2023-12-15", "wiki": "SD01 ตัวตึงไกรลาส"},
    {"code": "SD02", "name": "วีรบุรุษปากซอย", "type": "Starter", "releasedAt": "2023-12-15", "wiki": "SD02 วีรบุรุษปากซอย"},
    {"code": "SD03", "name": "นรกก็แค่น้ำพริก", "type": "Starter", "releasedAt": "2023-12-15", "wiki": "SD03 นรกก็แค่น้ำพริก"},
    {"code": "SD04", "name": "ทหารไก่ชนเขา", "type": "Starter", "releasedAt": "2024-02-16", "wiki": "SD04 ทหารไก่ชนเขา"},
    {"code": "SD05", "name": "กำเนิดจากน้ำ", "type": "Starter", "releasedAt": "2024-04-19", "wiki": "SD05 กำเนิดจากน้ำ"},
    {"code": "SD06", "name": "๖ ประจัญบาน", "type": "Starter", "releasedAt": "2024-06-21", "wiki": "SD06 ๖ ประจัญบาน"},
    {"code": "SD07", "name": "VS 18 หัวเมือง", "type": "Starter", "releasedAt": "2024-08-23", "wiki": "SD07 VS 18 หัวเมือง"},
    {"code": "SD08", "name": "กองทัพตัวจี๊ดหัวใจยึดโลก", "type": "Starter", "releasedAt": "2024-10-25", "wiki": "SD08 กองทัพตัวจี๊ดหัวใจยึดโลก"},
    {"code": "SD09", "name": "ลิงกว่านรก", "type": "Starter", "releasedAt": "2024-12-20", "wiki": "SD09 ลิงกว่านรก"},
    {"code": "SD10", "name": "บริษัทจุ้นเรื่องชาวบ้านไม่จำกัด", "type": "Starter", "releasedAt": "2025-02-21", "wiki": "SD10 บริษัทจุ้นเรื่องชาวบ้านไม่จำกัด"},
    {"code": "SD11", "name": "พุธ 13", "type": "Starter", "releasedAt": "2025-04-18", "wiki": "SD11 พุธ 13"},

    # Special Sets
    {"code": "CC01", "name": "Community Collection 01", "type": "Special", "releasedAt": "2024-03-01", "wiki": "CC01 Community Collection"},
    {"code": "CC02", "name": "Community Collection 02", "type": "Special", "releasedAt": "2024-07-01", "wiki": "CC02 Community Collection"},
    {"code": "CC03", "name": "Community Collection 03", "type": "Special", "releasedAt": "2024-11-01", "wiki": "CC03 Community Collection"},
    {"code": "KD01", "name": "อวาตาร์ลงทัณฑ์", "type": "Special", "releasedAt": "2024-05-10", "wiki": "KD01 อวาตาร์ลงทัณฑ์"},
    {"code": "KD02", "name": "พันธสัญญาโลหิต", "type": "Special", "releasedAt": "2024-07-12", "wiki": "KD02 พันธสัญญาโลหิต"},
    {"code": "KD03", "name": "มุ่งสู่ฝันเป็นที่ 1", "type": "Special", "releasedAt": "2024-09-13", "wiki": "KD03 มุ่งสู่ฝันเป็นที่ 1"},
    {"code": "KD04", "name": "ชะตากรแห่งจุดจบ", "type": "Special", "releasedAt": "2024-11-15", "wiki": "KD04 ชะตากรแห่งจุดจบ"},
    {"code": "KD05", "name": "ไดโนกาฬสินธุ์ Crisis", "type": "Special", "releasedAt": "2025-01-17", "wiki": "KD05 ไดโนกาฬสินธุ์ Crisis"},
    {"code": "ODY1", "name": "Odenya 01", "type": "Special", "releasedAt": "2024-02-01", "wiki": "ODY1 Odenya"},
    {"code": "RM01", "name": "Remix 01", "type": "Special", "releasedAt": "2024-12-06", "wiki": "RM01 Remix 01"},
    {"code": "SL01", "name": "Selection 01", "type": "Special", "releasedAt": "2024-10-11", "wiki": "SL01 Battle of Talingchan Selection 01"},
    {"code": "SL02", "name": "Selection 02", "type": "Special", "releasedAt": "2025-02-14", "wiki": "SL02 Battle of Talingchan Selection 02"},
    {"code": "B2SA", "name": "สมรภูมิ Passion", "type": "Special", "releasedAt": "2024-08-09", "wiki": "B2SA สมรภูมิ Passion"},
]

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def clean_wiki_text(text):
    if not text: return ''
    text = re.sub(r'\{\{Ex\|Only1[^}]*\}\}', ' [Only 1] ', text, flags=re.I)
    text = re.sub(r'\{\{Keyword\|([^}]+)\}\}', r'[\1]', text)
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL | re.I)
    text = re.sub(r'<ref[^>]*/>', '', text, flags=re.I)
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'<br\s*/?>', ' ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r"'''?|<u>|<\/u>", '', text)
    return re.sub(r'\s+', ' ', text).strip()

def parse_rarity(rare_str):
    rare_str = (rare_str or '').upper()
    if 'SCR' in rare_str or 'SEC' in rare_str: return 'Secret_rare'
    if 'UR' in rare_str or 'ULTRA' in rare_str: return 'Ultra_rare'
    if 'SR' in rare_str or 'SUPER' in rare_str: return 'Super_rare'
    if 'RR' in rare_str: return 'Double_rare'
    if ' R' in rare_str or rare_str.startswith('R') or '/R' in rare_str: return 'Rare'
    if ' C' in rare_str or rare_str.startswith('C') or '/C' in rare_str: return 'Common'
    return 'Common'

def map_color(col):
    col = (col or '').upper().strip()
    for v in ['RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'YELLOW', 'COLORLESS']:
        if v in col: return v
    if 'แดง' in col: return 'RED'
    if 'น้ำเงิน' in col or 'ฟ้า' in col: return 'BLUE'
    if 'เขียว' in col: return 'GREEN'
    if 'ดำ' in col: return 'BLACK'
    if 'ขาว' in col: return 'WHITE'
    if 'เหลือง' in col: return 'YELLOW'
    return 'COLORLESS'

def map_card_type(t):
    t = (t or '').strip()
    if 'Avatar' in t: return 'Avatar'
    if 'Construct' in t: return 'Construct'
    if 'Magic' in t or 'เวท' in t: return 'Magic'
    return 'Avatar'

def main():
    data_dir = os.path.join(os.path.dirname(__file__), '../src/data')
    cards_path = os.path.join(data_dir, 'talingchanCards.json')
    sets_path = os.path.join(data_dir, 'talingchanSets.json')

    # Load existing cards
    with open(cards_path, 'r', encoding='utf-8') as f:
        existing_cards = json.load(f)
    cards_dict = {c['id']: c for c in existing_cards}
    print(f"Loaded {len(cards_dict)} existing cards from database.")

    # 1. Fetch all set checklist pages
    new_cards_added = 0
    print("\n--- Scraping All 37 Set Checklists ---")
    for s in SET_PAGES:
        code = s['code']
        wiki_title = s['wiki']
        url = f"{BASE_API}?action=parse&page={urllib.parse.quote(wiki_title)}&prop=wikitext&format=json"
        
        try:
            data = fetch_json(url)
            text = data.get('parse', {}).get('wikitext', {}).get('*', '')
        except Exception as e:
            print(f"Failed to fetch {wiki_title}: {e}")
            continue

        lines = text.split('\n')
        current_id = None
        current_cells = []

        for line in lines:
            if line.startswith('|-') or line.startswith('|}'):
                if current_id and current_cells:
                    # Process completed row
                    if current_id not in cards_dict:
                        # Extract name, type, symbol, color, rarity from cells
                        cleaned = [clean_wiki_text(c) for c in current_cells if clean_wiki_text(c)]
                        name = cleaned[0] if len(cleaned) > 0 else f"การ์ด {current_id}"
                        # If first cell is style=..., take next
                        if name.startswith('style=') and len(cleaned) > 1:
                            name = cleaned[1]
                        name = re.sub(r'\[Only 1\]\s*', '', name).strip()
                        
                        card_type = 'Avatar'
                        color = 'COLORLESS'
                        symbol = 'มนุษย์'
                        rarity = 'Common'
                        soi = 1

                        for c in cleaned[1:]:
                            if any(k in c for k in ['Avatar', 'Magic', 'Construct']):
                                card_type = map_card_type(c)
                            elif any(k in c.upper() for k in ['RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'YELLOW']):
                                color = map_color(c)
                            elif any(k in c.upper() for k in ['UR', 'SR', 'SEC', 'SCR', 'PR', ' C', ' R', 'C', 'R']):
                                rarity = parse_rarity(c)
                            elif c.isdigit() and len(c) <= 2:
                                soi = int(c)
                            elif len(c) > 1 and not c.startswith('style=') and not c.startswith('http'):
                                symbol = c

                        col_num = current_id.split('-')[1] if '-' in current_id else current_id[4:]
                        finishes = ["normal"]
                        if rarity in ["Super_rare", "Ultra_rare", "Secret_rare"]:
                            finishes.append("foil")
                        if rarity == "Secret_rare":
                            finishes.append("secret")

                        raw_row = ' '.join(current_cells)
                        is_only_one = 'Only1' in raw_row or 'Only 1' in raw_row or 'Only 1' in name
                        is_biased = 'ลำเอียง' in raw_row or 'ลำเอียง' in name
                        is_collab = 'โดนใจ' in raw_row or 'โดนใจ' in name

                        cards_dict[current_id] = {
                            "id": current_id,
                            "name": name,
                            "setCode": code,
                            "setName": s['name'],
                            "collectorNumber": col_num,
                            "cardType": card_type,
                            "color": color,
                            "symbol": symbol,
                            "soi": soi,
                            "cost": 2 if card_type == 'Magic' else 3,
                            "gems": 1,
                            "power": 3 if card_type == 'Avatar' else None,
                            "rarity": rarity,
                            "isOnlyOne": is_only_one,
                            "isBiased": is_biased,
                            "isCollab": is_collab,
                            "illustrator": "PASULOL",
                            "effect": f"การ์ดจากชุด {s['name']} ({code})",
                            "rarityVariants": [rarity[:2].upper()],
                            "finishes": finishes
                        }
                        new_cards_added += 1

                current_id = None
                current_cells = []
                continue

            m_id = re.match(rf'^\s*\|\s*({code}-\d+[A-Z0-9]*)', line, re.I)
            if m_id:
                current_id = m_id.group(1).upper()
                # Check if there are other cells on same line separated by ||
                rem = line[m_id.end():].strip()
                if rem.startswith('||') or rem.startswith('|'):
                    current_cells = [p.strip() for p in re.split(r'\|\||\|', rem[1:]) if p.strip()]
                else:
                    current_cells = []
                continue

            if current_id and line.startswith('|'):
                parts = [p.strip() for p in re.split(r'\|\||\|', line[1:]) if p.strip()]
                current_cells.extend(parts)

        print(f"Processed {code} ({s['name']}): Total cards in DB for this set: {sum(1 for c in cards_dict.values() if c['setCode'] == code)}")

    print(f"\nAdded {new_cards_added} missing cards! Total cards now: {len(cards_dict)}")

    # 2. Match with Wiki Images
    print("\n--- Linking Images from Wiki ---")
    all_imgs = {}
    aicontinue = ''
    while True:
        url = f'{BASE_API}?action=query&list=allimages&ailimit=500&format=json'
        if aicontinue: url += f'&aicontinue={aicontinue}'
        data = fetch_json(url)
        for img in data.get('query', {}).get('allimages', []):
            all_imgs[img['name']] = img['url']
        if 'continue' in data:
            aicontinue = data['continue'].get('aicontinue', '')
        else:
            break

    by_stem = {}
    for name, u in all_imgs.items():
        stem = re.sub(r'\.(png|jpe?g|webp|gif)$', '', name, flags=re.I).lower().strip()
        by_stem[stem] = u

    matched_imgs = 0
    for cid, c in cards_dict.items():
        cid_lower = cid.lower()
        if cid_lower in by_stem:
            c['imageUrl'] = by_stem[cid_lower]
            matched_imgs += 1
            continue
        no_dash = cid_lower.replace('-', '')
        if no_dash in by_stem:
            c['imageUrl'] = by_stem[no_dash]
            matched_imgs += 1
            continue
        parts = cid.split('-')
        if len(parts) == 2:
            try:
                num = int(parts[1])
                for fmt in [f'{parts[0]}-{num}'.lower(), f'{parts[0]}-{num:02d}'.lower(), f'{parts[0]}_{num:03d}'.lower()]:
                    if fmt in by_stem:
                        c['imageUrl'] = by_stem[fmt]
                        matched_imgs += 1
                        break
            except ValueError:
                pass

    print(f"Cards with image URLs: {matched_imgs} / {len(cards_dict)} ({matched_imgs*100/len(cards_dict):.1f}%)")

    # 3. Sort and Save Cards & Sets
    all_cards_list = list(cards_dict.values())
    all_cards_list.sort(key=lambda c: (c['setCode'], c['collectorNumber'], c['name']))

    set_counts = {}
    for c in all_cards_list:
        set_counts[c['setCode']] = set_counts.get(c['setCode'], 0) + 1

    final_sets = []
    for s in SET_PAGES:
        s_obj = {
            "code": s["code"],
            "name": s["name"],
            "type": s["type"],
            "releasedAt": s["releasedAt"],
            "cardCount": set_counts.get(s["code"], 0)
        }
        final_sets.append(s_obj)

    with open(cards_path, 'w', encoding='utf-8') as f:
        json.dump(all_cards_list, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(all_cards_list)} cards to {cards_path}")

    with open(sets_path, 'w', encoding='utf-8') as f:
        json.dump(final_sets, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(final_sets)} sets to {sets_path}")

    print("\n--- Card Counts by Set ---")
    for s in final_sets:
        print(f"  {s['code']:<6} | {s['name']:<35} | {s['cardCount']} cards")

if __name__ == '__main__':
    main()
