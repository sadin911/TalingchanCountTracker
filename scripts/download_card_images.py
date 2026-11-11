#!/usr/bin/env python3
"""
Downloads all card artwork images from Battle of Talingchan wiki into the repo:
  public/card-images/<setCode>/<collectorNumber>.webp

Run with: python3 scripts/download_card_images.py
"""
import os
import json
import urllib.request
import urllib.error
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

CARDS_JSON = os.path.join(os.path.dirname(__file__), '../src/data/talingchanCards.json')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '../public/card-images')
R2_CDN_BASE = 'https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

def download_card_image(card):
    set_code = card.get('setCode')
    col_num = card.get('collectorNumber')
    if not set_code or not col_num:
        return {'status': 'skipped', 'id': card.get('id'), 'reason': 'missing setCode/collectorNumber'}
        
    set_dir = os.path.join(OUTPUT_DIR, set_code)
    os.makedirs(set_dir, exist_ok=True)
    dest_path = os.path.join(set_dir, f"{col_num}.webp")
    
    # Check if already exists and valid
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        return {'status': 'cached', 'id': card['id']}

    r2_url = f"{R2_CDN_BASE}/card-images/{set_code}/{col_num}.webp"
    fallback_url = card.get('imageUrl')
    urls_to_try = [r2_url] + ([fallback_url] if fallback_url else [])
        
    for url in urls_to_try:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                    if len(data) > 500:
                        with open(dest_path, 'wb') as f:
                            f.write(data)
                        return {'status': 'downloaded', 'id': card['id'], 'bytes': len(data)}
            except Exception as e:
                last_error = str(e)
                time.sleep(0.5)
    return {'status': 'failed', 'id': card['id'], 'error': last_error}

def main():
    with open(CARDS_JSON, 'r', encoding='utf-8') as f:
        cards = json.load(f)
        
    cards_with_images = [c for c in cards if c.get('setCode') and c.get('collectorNumber')]
    total = len(cards_with_images)
    print(f"Total cards to download from R2: {total} / {len(cards)}")
    
    downloaded = 0
    cached = 0
    failed = 0
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=24) as executor:
        futures = {executor.submit(download_card_image, c): c for c in cards_with_images}
        
        for idx, fut in enumerate(as_completed(futures), 1):
            res = fut.result()
            if res['status'] == 'downloaded':
                downloaded += 1
            elif res['status'] == 'cached':
                cached += 1
            elif res['status'] == 'failed':
                failed += 1
                
            if idx % 50 == 0 or idx == total:
                elapsed = time.time() - start_time
                print(f"Progress: {idx}/{total} ({downloaded} new, {cached} cached, {failed} failed) [{elapsed:.1f}s]")
                
    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed:.1f}s! Downloaded: {downloaded}, Cached: {cached}, Failed: {failed}")

if __name__ == '__main__':
    main()
