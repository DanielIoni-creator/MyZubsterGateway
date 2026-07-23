#!/usr/bin/env python3
"""
My DeepWebHarvester - Scraping OSINT di siti onion
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

TARGET = "http://awazonsnag7pv4jxhfeiw37nuibg3gibokou2sawcgucapt3d2tyggid.onion"
PROXY = {'http': 'socks5h://127.0.0.1:9050', 'https': 'socks5h://127.0.0.1:9050'}

def harvest(url, depth=1):
    visited = set()
    results = {'pages': [], 'btc': [], 'xmr': [], 'links': []}
    
    def crawl(page_url, current_depth):
        if current_depth > depth or page_url in visited:
            return
        visited.add(page_url)
        print(f"🔍 {page_url}")
        try:
            r = requests.get(page_url, proxies=PROXY, timeout=30)
            if r.status_code != 200:
                return
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # Estrai indirizzi
            btc = re.findall(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b', r.text)
            xmr = re.findall(r'\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b', r.text)
            results['btc'].extend(btc)
            results['xmr'].extend(xmr)
            results['pages'].append(page_url)
            
            # Trova link
            for link in soup.find_all('a', href=True):
                href = link['href']
                full = urljoin(page_url, href)
                if '.onion' in full and full not in visited:
                    results['links'].append(full)
                    if current_depth < depth:
                        crawl(full, current_depth + 1)
            time.sleep(1)
        except Exception as e:
            print(f"❌ Errore: {e}")
    
    crawl(url, 0)
    results['btc'] = list(set(results['btc']))
    results['xmr'] = list(set(results['xmr']))
    return results

if __name__ == "__main__":
    print("🧅 My DeepWebHarvester")
    data = harvest(TARGET, depth=1)
    print(f"📊 Pagine: {len(data['pages'])}")
    print(f"💰 BTC: {len(data['btc'])}")
    print(f"💰 XMR: {len(data['xmr'])}")
    print(f"🔗 Link: {len(data['links'])}")
    with open('/tmp/my_harvest.json', 'w') as f:
        json.dump(data, f, indent=2)
