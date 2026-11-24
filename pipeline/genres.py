#!/usr/bin/env python3
"""
Build data/derived/genres.json: artist -> top-3 normalized Last.fm tags (+ era).

  python3 pipeline/genres.py               # fetch missing artists, write outputs
  python3 pipeline/genres.py --limit 50    # only the 50 most-listened artists
  python3 pipeline/genres.py --refresh     # ignore cache, refetch everything
  python3 pipeline/genres.py --offline     # rebuild outputs from cache + overrides only

Privacy: only artist names are sent to Last.fm. Listening history stays on disk.
Reads LASTFM_API_KEY from .env (repo root). Stdlib only.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from normalize import apply_override, clean_tags, primary  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "derived"
CACHE = OUT / "lastfm_cache.json"
OVERRIDES = OUT / "genres_overrides.json"
API = "https://ws.audioscrobbler.com/2.0/"
MIN_INTERVAL = 0.25  # 4 req/s, under Last.fm's 5 req/s guideline
USER_AGENT = "replay-dna/0.1 (personal listening analysis)"


def load_key() -> str:
    key = os.environ.get("LASTFM_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.strip().startswith("LASTFM_API_KEY="):
                key = line.split("=", 1)[1].strip().strip("'\"")
    if not key:
        sys.exit("LASTFM_API_KEY not found. Add it to .env (see .env.example).")
    return key


def artist_minutes() -> Counter:
    """Minutes per artist from every StreamingHistory_music_*.json under data/raw/."""
    mins: Counter = Counter()
    files = glob.glob(str(RAW / "**" / "StreamingHistory_music_*.json"), recursive=True)
    if not files:
        sys.exit(f"No StreamingHistory_music_*.json under {RAW}")
    for f in files:
        for row in json.loads(Path(f).read_text(encoding="utf-8")):
            a = row.get("artistName")
            if a:
                mins[a] += row.get("msPlayed", 0) / 60000
    return mins


class LastFm:
    def __init__(self, key: str):
        self.key, self.last = key, 0.0

    def top_tags(self, artist: str) -> list[dict] | None:
        """Raw toptags list; [] when the artist is unknown to Last.fm; None on persistent failure."""
        q = urllib.parse.urlencode({"method": "artist.gettoptags", "artist": artist, "autocorrect": 1, "api_key": self.key, "format": "json"})
        for attempt in range(5):
            wait = self.last + MIN_INTERVAL - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self.last = time.monotonic()
            try:
                req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=15) as r:
                    data = json.load(r)
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 ** attempt)
                    continue
                try:
                    data = json.load(e)
                except Exception:
                    return None
            except (urllib.error.URLError, TimeoutError):
                time.sleep(2 ** attempt)
                continue
            if "error" in data:
                if data["error"] == 6:  # artist not found
                    return []
                if data["error"] in (10, 26):  # invalid / suspended key
                    sys.exit(f"Last.fm rejected the API key (error {data['error']}). Check .env.")
                if data["error"] == 29:  # rate limit
                    time.sleep(2 ** attempt + 1)
                    continue
                return None
            tags = data.get("toptags", {}).get("tag", [])
            return [tags] if isinstance(tags, dict) else tags
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, help="only the N most-listened artists")
    ap.add_argument("--refresh", action="store_true", help="refetch even if cached")
    ap.add_argument("--offline", action="store_true", help="no network; use cache + overrides")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    mins = artist_minutes()
    artists = [a for a, _ in mins.most_common(args.limit)]
    cache: dict = json.loads(CACHE.read_text()) if CACHE.exists() and not args.refresh else {}
    overrides: dict = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}

    todo = [] if args.offline else [a for a in artists if a not in cache and a not in overrides]
    print(f"{len(artists)} artists · {len(cache)} cached · {len(overrides)} overrides · fetching {len(todo)}")
    if todo:
        api = LastFm(load_key())
        for i, a in enumerate(todo, 1):
            tags = api.top_tags(a)
            if tags is not None:  # don't cache transient failures
                cache[a] = tags
            if i % 25 == 0 or i == len(todo):
                CACHE.write_text(json.dumps(cache, ensure_ascii=False))
                print(f"  {i}/{len(todo)}", flush=True)

    result, untagged, failed = {}, [], []
    for a in artists:
        if a in overrides:
            entry, source = apply_override(overrides[a]), "override"
        elif a in cache:
            entry, source = clean_tags(cache[a], a), "lastfm"
        else:
            entry, source = {"tags": [], "era": None}, "failed"
            failed.append(a)
        if not entry["tags"]:
            untagged.append(a)
            entry["tags"] = [{"tag": "unknown", "weight": 1.0}]
            source = "none" if source != "failed" else source
        result[a] = {"primary": primary(entry["tags"]) if source == "lastfm" else entry["tags"][0]["tag"] if source == "override" else "unknown", **entry, "source": source}

    tagged_minutes = sum(mins[a] for a in artists if a not in untagged)
    out = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "last.fm artist.getTopTags, normalized (top 3, weights = Last.fm count / 100; primary prefers a specific tag over an umbrella one)",
        "artists": result,
    }
    (OUT / "genres.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    lines = [f"{a}\t{mins[a]:.0f} min" for a in sorted(untagged, key=lambda a: -mins[a])]
    (OUT / "untagged.txt").write_text(
        "# Artists with no usable Last.fm tags, most-listened first.\n"
        "# Add them to data/derived/genres_overrides.json (see pipeline/genres_overrides.example.json),\n"
        "# then run: python3 pipeline/genres.py --offline\n" + "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    total = sum(mins[a] for a in artists) or 1
    print(f"wrote data/derived/genres.json · {len(artists) - len(untagged)}/{len(artists)} artists tagged "
          f"({tagged_minutes / total:.0%} of minutes) · {len(untagged)} untagged -> data/derived/untagged.txt"
          + (f" · {len(failed)} failed (rerun to retry)" if failed else ""))


if __name__ == "__main__":
    main()
