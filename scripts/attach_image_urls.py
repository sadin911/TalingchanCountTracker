#!/usr/bin/env python3
"""
Attaches imageUrl to all cards in src/data/talingchanCards.json
by querying the Battle of Talingchan wiki MediaWiki allimages API.
"""
import urllib.request
import json
import re
import os

BASE_API = 'https://battle-of-talingchan.fandom.com/th/api.php'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    data_path = os.path.join(os.path.dirname(__file__), '../src/data/talingchanCards.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)
        
    print(f"Loaded {len(cards)} cards. Fetching image directory from wiki...")
    
    all_imgs = {}
    aicontinue = ''
    while True:
        url = f'{BASE_API}?action=query&list=allimages&ailimit=500&format=json'
        if aicontinue:
            url += f'&aicontinue={aicontinue}'
        data = fetch_json(url)
        for img in data.get('query', {}).get('allimages', []):
            all_imgs[img['name']] = img['url']
        if 'continue' in data:
            aicontinue = data['continue'].get('aicontinue', '')
        else:
            break
            
    print(f"Fetched {len(all_imgs)} images from wiki.")
    
    # Build lookup index by clean stem
    by_stem = {}
    for name, u in all_imgs.items():
        stem = re.sub(r'\.(png|jpe?g|webp|gif)$', '', name, flags=re.I).lower().strip()
        by_stem[stem] = u
        
    matched = 0
    for c in cards:
        cid = c['id']
        cid_lower = cid.lower()
        
        # 1. Exact ID match e.g. "bt01-001"
        if cid_lower in by_stem:
            c['imageUrl'] = by_stem[cid_lower]
            matched += 1
            continue
            
        # 2. No-dash ID match e.g. "bt01001"
        no_dash = cid_lower.replace('-', '')
        if no_dash in by_stem:
            c['imageUrl'] = by_stem[no_dash]
            matched += 1
            continue
            
        # 3. Normalized number e.g. "bt01-01" or "bt01-1"
        parts = cid.split('-')
        found = False
        if len(parts) == 2:
            try:
                num = int(parts[1])
                for fmt in [f'{parts[0]}-{num}'.lower(), f'{parts[0]}-{num:02d}'.lower(), f'{parts[0]}_{num:03d}'.lower()]:
                    if fmt in by_stem:
                        c['imageUrl'] = by_stem[fmt]
                        matched += 1
                        found = True
                        break
            except ValueError:
                pass
        if found:
            continue
            
        # 4. Check Thai name match
        name_clean = c['name'].lower().strip()
        if name_clean in by_stem:
            c['imageUrl'] = by_stem[name_clean]
            matched += 1
            continue
            
    print(f"Attached imageUrl to {matched}/{len(cards)} cards ({matched*100/len(cards):.1f}%)")
    
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved updated cards to {data_path}")

if __name__ == '__main__':
    main()
