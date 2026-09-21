#!/usr/bin/env python3
"""Fetch tenki.jp 2週間 (10days) forecasts and write weather.json for the trip app.

Runs on GitHub Actions (see .github/workflows/weather.yml). Standard library only.
"""
import html as html_mod
import json, re, sys, urllib.request
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
AREAS = {
    "28110": {"name": "神戸市中央区", "url": "https://tenki.jp/forecast/6/31/6310/28110/10days.html"},
    "27100": {"name": "大阪市",       "url": "https://tenki.jp/forecast/6/30/6200/27100/10days.html"},
}
UA = "Mozilla/5.0 (compatible; kobe-trip-app/1.0; +https://penguin860809.github.io/2026-kobe-osaka-trip/)"

ROW = re.compile(r'<dd class="forecast10days-actab">(.*?)<input ', re.S)
DAY = re.compile(r'<div class="days">(\d{2})月(\d{2})日')
ICON = re.compile(r'forecast-days-weather/([0-9A-Za-z_]+)\.png"[^>]*alt="([^"]*)"')
HI = re.compile(r'class="high-temp">\s*(-?\d+)\s*(?:℃|&#8451;)')
LO = re.compile(r'class="low-temp">\s*(-?\d+)\s*(?:℃|&#8451;)')
POP = re.compile(r'class="prob-precip">\s*(\d+)%')
MM = re.compile(r'class="precip">\s*(\d+)mm')


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse(html, today):
    html = html_mod.unescape(html)  # tenki.jp serves ℃ as &#8451;
    days = {}
    year = today.year
    prev_month = None
    for block in ROW.findall(html):
        m = DAY.search(block)
        if not m:
            continue
        month, day = int(m.group(1)), int(m.group(2))
        if prev_month and month < prev_month:  # crossed New Year inside the table
            year += 1
        prev_month = month
        icon = ICON.search(block)
        hi, lo, pop, mm = HI.search(block), LO.search(block), POP.search(block), MM.search(block)
        key = f"{year:04d}-{month:02d}-{day:02d}"
        days[key] = {
            "icon": icon.group(1) if icon else None,
            "text": icon.group(2) if icon else None,
            "hi": int(hi.group(1)) if hi else None,
            "lo": int(lo.group(1)) if lo else None,
            "pop": int(pop.group(1)) if pop else None,
            "mm": int(mm.group(1)) if mm else None,
        }
    return days


def main():
    now = datetime.now(JST)
    out = {"updated": now.strftime("%Y-%m-%dT%H:%M:%S+09:00"), "source": "tenki.jp 2週間天気", "areas": {}}
    ok = 0
    for code, a in AREAS.items():
        try:
            days = parse(fetch(a["url"]), now.date())
            if not days:
                raise RuntimeError("no rows parsed")
            out["areas"][code] = {"name": a["name"], "url": a["url"], "days": days}
            ok += 1
            print(f"{code} {a['name']}: {len(days)} days")
        except Exception as e:  # keep previous data for this area if available
            print(f"WARN {code}: {e}", file=sys.stderr)
            try:
                prev = json.load(open("weather.json", encoding="utf-8"))
                if code in prev.get("areas", {}):
                    out["areas"][code] = prev["areas"][code]
            except Exception:
                pass
    if ok == 0:
        print("ERROR: nothing fetched", file=sys.stderr)
        sys.exit(1)
    with open("weather.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")


if __name__ == "__main__":
    main()
