#!/usr/bin/env python3
"""
Scrapes all cards and sets from Battle of Talingchan Wiki on Fandom
Output:
  - src/data/talingchanSets.json
  - src/data/talingchanCards.json
"""
import urllib.request
import urllib.parse
import json
import re
import os
import time

BASE_API = 'https://battle-of-talingchan.fandom.com/th/api.php'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

SETS_METADATA = [
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
    {"code": "BT12", "name": "ทำไงดี ??!! เกิดใหม่ทั้งทีก็ต้องมานั่งเล่นการ์ดท่ามกลางคนไม่ปกติในตลิ่งชันซะแล้ว", "type": "Booster", "releasedAt": "2025-11-28"},
    {"code": "BT13", "name": "Battle of Gods", "type": "Booster", "releasedAt": "2026-01-30"},
    
    # Starter Sets
    {"code": "SD01", "name": "ตัวตึงไกรลาส", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD02", "name": "วีรบุรุษปากซอย", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD03", "name": "นรกก็แค่น้ำพริก", "type": "Starter", "releasedAt": "2023-12-15"},
    {"code": "SD04", "name": "ทหารไก่ชนเขา", "type": "Starter", "releasedAt": "2024-02-16"},
    {"code": "SD05", "name": "กำเนิดจากน้ำ", "type": "Starter", "releasedAt": "2024-04-19"},
    {"code": "SD06", "name": "๖ ประจัญบาน", "type": "Starter", "releasedAt": "2024-06-21"},
    {"code": "SD07", "name": "VS 18 หัวเมือง", "type": "Starter", "releasedAt": "2024-08-23"},
    {"code": "SD08", "name": "กองทัพตัวจี๊ดหัวใจยึดโลก", "type": "Starter", "releasedAt": "2024-10-25"},
    {"code": "SD09", "name": "ลิงกว่านรก", "type": "Starter", "releasedAt": "2024-12-20"},
    {"code": "SD10", "name": "บริษัทจุ้นเรื่องชาวบ้านไม่จำกัด", "type": "Starter", "releasedAt": "2025-02-21"},
    {"code": "SD11", "name": "พุธ 13", "type": "Starter", "releasedAt": "2025-04-18"},

    # Special Sets
    {"code": "CC01", "name": "Community Collection 01", "type": "Special", "releasedAt": "2024-03-01"},
    {"code": "CC02", "name": "Community Collection 02", "type": "Special", "releasedAt": "2024-07-01"},
    {"code": "CC03", "name": "Community Collection 03", "type": "Special", "releasedAt": "2024-11-01"},
    {"code": "KD01", "name": "อวาตาร์ลงทัณฑ์", "type": "Special", "releasedAt": "2024-05-10"},
    {"code": "KD02", "name": "พันธสัญญาโลหิต", "type": "Special", "releasedAt": "2024-07-12"},
    {"code": "KD03", "name": "มุ่งสู่ฝันเป็นที่ 1", "type": "Special", "releasedAt": "2024-09-13"},
    {"code": "KD04", "name": "ชะตากรแห่งจุดจบ", "type": "Special", "releasedAt": "2024-11-15"},
    {"code": "KD05", "name": "ไดโนกาฬสินธุ์ Crisis", "type": "Special", "releasedAt": "2025-01-17"},
    {"code": "ODY1", "name": "Odenya 01", "type": "Special", "releasedAt": "2024-02-01"},
    {"code": "RM01", "name": "Remix 01", "type": "Special", "releasedAt": "2024-12-06"},
    {"code": "SL01", "name": "Selection 01", "type": "Special", "releasedAt": "2024-10-11"},
    {"code": "SL02", "name": "Selection 02", "type": "Special", "releasedAt": "2025-02-14"},
    {"code": "B2SA", "name": "สมรภูมิ Passion", "type": "Special", "releasedAt": "2024-08-09"},
]

SET_MAP = {s["code"]: s["name"] for s in SETS_METADATA}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_all_category_members(cat_name):
    members = []
    cmcontinue = ''
    while True:
        url = f'{BASE_API}?action=query&list=categorymembers&cmtitle={urllib.parse.quote(cat_name)}&cmlimit=500&format=json'
        if cmcontinue:
            url += f'&cmcontinue={cmcontinue}'
        data = fetch_json(url)
        members.extend(data.get('query', {}).get('categorymembers', []))
        if 'continue' in data:
            cmcontinue = data['continue'].get('cmcontinue', '')
        else:
            break
    return members

def parse_template(text, template_name):
    idx = text.find('{{' + template_name)
    if idx == -1:
        # Case insensitive attempt
        lower_text = text.lower()
        idx = lower_text.find('{{' + template_name.lower())
        if idx == -1:
            return {}
            
    i = idx + 2 + len(template_name)
    params = {}
    buf = []
    brace_depth = 0
    bracket_depth = 0
    
    while i < len(text):
        c = text[i]
        next_c = text[i+1] if i + 1 < len(text) else ''
        
        if c == '{' and next_c == '{':
            brace_depth += 1
            buf.append('{{')
            i += 2
            continue
        elif c == '}' and next_c == '}':
            if brace_depth > 0:
                brace_depth -= 1
                buf.append('}}')
                i += 2
                continue
            else:
                break
        elif c == '[' and next_c == '[':
            bracket_depth += 1
            buf.append('[[')
            i += 2
            continue
        elif c == ']' and next_c == ']':
            if bracket_depth > 0:
                bracket_depth -= 1
                buf.append(']]')
                i += 2
                continue
        elif c == '|' and brace_depth == 0 and bracket_depth == 0:
            token = ''.join(buf).strip()
            buf = []
            if '=' in token:
                k, v = token.split('=', 1)
                params[k.strip().lower()] = v.strip()
            i += 1
            continue
            
        buf.append(c)
        i += 1
        
    token = ''.join(buf).strip()
    if '=' in token:
        k, v = token.split('=', 1)
        params[k.strip().lower()] = v.strip()
        
    return params

def clean_wiki_text(text):
    if not text:
        return ''
    # Replace {{Keyword|...}} with [...]
    text = re.sub(r'\{\{Keyword\|([^}]+)\}\}', r'[\1]', text)
    # Replace {{Rarity|...}} with ''
    text = re.sub(r'\{\{Rarity[^}]*\}\}', '', text, flags=re.I)
    # Replace [[Foo|Bar]] with Bar
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    # Replace {{...}} with empty
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    # Strip HTML tags
    text = re.sub(r'<br\s*/?>', ' ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    # Strip whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_rarity(rare_str):
    rare_str = (rare_str or '').upper()
    if 'SCR' in rare_str or 'SEC' in rare_str:
        return 'Secret_rare'
    if 'UR' in rare_str or 'ULTRA' in rare_str:
        return 'Ultra_rare'
    if 'SR' in rare_str or 'SUPER' in rare_str:
        return 'Super_rare'
    if 'RR' in rare_str:
        return 'Double_rare'
    if ' R' in rare_str or rare_str.startswith('R') or '/R' in rare_str:
        return 'Rare'
    if ' C' in rare_str or rare_str.startswith('C') or '/C' in rare_str:
        return 'Common'
    return 'Common'

def clean_artist(artist_str):
    if not artist_str:
        return 'PASULOL'
    cleaned = clean_wiki_text(artist_str)
    # Sometimes artist is "ภาพประกอบโดย PASULOL"
    cleaned = re.sub(r'ภาพประกอบโดย\s*', '', cleaned)
    cleaned = re.sub(r'Category:[^|]+\|', '', cleaned)
    return cleaned.strip() or 'PASULOL'

def parse_int_safe(val):
    if val is None or val == '':
        return None
    val = str(val).strip()
    m = re.search(r'\d+', val)
    return int(m.group(0)) if m else None

def map_color(col):
    col = (col or '').upper().strip()
    valid = ['RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'YELLOW', 'COLORLESS']
    for v in valid:
        if v in col:
            return v
    # Thai color mappings
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
    if 'Magic' in t or 'เวท' in t: return 'Magic'
    if 'Construct' in t: return 'Construct'
    return 'Avatar'

def main():
    print("Fetching Category:Cards from Battle of Talingchan Wiki...")
    members = get_all_category_members('Category:Cards')
    titles = [m['title'] for m in members if not m['title'].startswith('Category:') and not m['title'].startswith('Keyword')]
    print(f"Total card pages to process: {len(titles)}")
    
    parsed_cards = []
    seen_ids = set()
    
    # Process in batches of 40
    batch_size = 40
    for i in range(0, len(titles), batch_size):
        batch = titles[i:i+batch_size]
        titles_str = '|'.join([urllib.parse.quote(t) for t in batch])
        url = f'{BASE_API}?action=query&prop=revisions&rvprop=content&rvslots=main&titles={titles_str}&format=json'
        
        try:
            data = fetch_json(url)
            pages = data.get('query', {}).get('pages', {})
            for pid, p in pages.items():
                title = p.get('title')
                revs = p.get('revisions', [])
                if not revs:
                    continue
                content = revs[0].get('slots', {}).get('main', {}).get('*', '')
                
                table = parse_template(content, 'CardTable')
                if not table:
                    continue
                
                name = clean_wiki_text(table.get('name') or title)
                raw_print = table.get('print', '')
                prints = [re.sub(r'<[^>]+>', '', pr).strip() for pr in re.split(r'<br\s*/?>|\n', raw_print) if pr.strip()]
                
                # If no print field, generate a fallback from set categories or title
                if not prints:
                    # check for BTxx or SDxx in content
                    found_set = re.search(r'\[\[Category:(BT\d+|SD\d+|CC\d+|KD\d+|ODY\d+|RM\d+|SL\d+|B2SA)\]\]', content)
                    if found_set:
                        prints = [f"{found_set.group(1)}-000"]
                    else:
                        continue
                        
                card_type = map_card_type(table.get('type'))
                color = map_color(table.get('color'))
                symbol = clean_wiki_text(table.get('symbol'))
                soi = parse_int_safe(table.get('ซอย'))
                cost = parse_int_safe(table.get('cost'))
                gems = parse_int_safe(table.get('gem'))
                power = parse_int_safe(table.get('power'))
                rarity = parse_rarity(table.get('rare'))
                artist = clean_artist(table.get('artist'))
                effect = clean_wiki_text(table.get('main effect') or table.get('effect'))
                
                # Detect special rule flags
                is_only_one = 'Only 1' in content or 'Only 1' in effect or 'only 1' in (table.get('main effect') or '').lower()
                is_biased = 'ลำเอียง' in content or 'ลำเอียง' in effect
                is_collab = 'โดนใจ' in content or 'โดนใจ' in effect
                
                for pr in prints:
                    # Parse setCode and collectorNumber
                    parts = pr.split('-')
                    if len(parts) >= 2:
                        set_code = parts[0].upper()
                        collector_num = parts[1]
                    else:
                        set_code = pr[:4].upper()
                        collector_num = pr[4:]
                    
                    card_id = f"{set_code}-{collector_num}"
                    if card_id in seen_ids:
                        continue
                    seen_ids.add(card_id)
                    
                    set_name = SET_MAP.get(set_code, f"ชุด {set_code}")
                    
                    # Available finishes
                    finishes = ["normal"]
                    if rarity in ["Super_rare", "Ultra_rare", "Secret_rare"]:
                        finishes.append("foil")
                    if "SCR" in (table.get('rare') or '').upper() or "SEC" in (table.get('rare') or '').upper():
                        finishes.append("secret")
                        
                    parsed_cards.append({
                        "id": card_id,
                        "name": name,
                        "setCode": set_code,
                        "setName": set_name,
                        "collectorNumber": collector_num,
                        "cardType": card_type,
                        "color": color,
                        "symbol": symbol,
                        "soi": soi,
                        "cost": cost,
                        "gems": gems,
                        "power": power,
                        "rarity": rarity,
                        "isOnlyOne": is_only_one,
                        "isBiased": is_biased,
                        "isCollab": is_collab,
                        "illustrator": artist,
                        "effect": effect,
                        "rarityVariants": [rarity[:2].upper()],
                        "finishes": finishes
                    })
        except Exception as e:
            print(f"Error fetching batch {i}-{i+batch_size}: {e}")
            
        print(f"Processed {min(i+batch_size, len(titles))}/{len(titles)} cards... (Total collected: {len(parsed_cards)})")
        time.sleep(0.2)
        
    print(f"\nScraping complete! Total unique cards: {len(parsed_cards)}")
    
    # Sort cards by setCode, collectorNumber
    def sort_key(c):
        return (c["setCode"], c["collectorNumber"], c["name"])
        
    parsed_cards.sort(key=sort_key)
    
    # Update set card counts
    counts_by_set = {}
    for c in parsed_cards:
        counts_by_set[c["setCode"]] = counts_by_set.get(c["setCode"], 0) + 1
        
    final_sets = []
    for s in SETS_METADATA:
        s_copy = dict(s)
        s_copy["cardCount"] = counts_by_set.get(s["code"], s.get("cardCount", 0))
        final_sets.append(s_copy)
        
    # Write to files
    data_dir = os.path.join(os.path.dirname(__file__), '../src/data')
    cards_path = os.path.join(data_dir, 'talingchanCards.json')
    sets_path = os.path.join(data_dir, 'talingchanSets.json')
    
    with open(cards_path, 'w', encoding='utf-8') as f:
        json.dump(parsed_cards, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(parsed_cards)} cards to {cards_path}")
    
    with open(sets_path, 'w', encoding='utf-8') as f:
        json.dump(final_sets, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(final_sets)} sets to {sets_path}")

if __name__ == '__main__':
    main()
