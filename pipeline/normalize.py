"""Pure tag-normalization logic (no I/O), so it can be unit-tested."""
from __future__ import annotations

import re
import unicodedata

# Tags that describe the listener or the listing, not the music.
JUNK = {
    "seen live", "favorites", "favourites", "favorite", "favourite", "my favorite", "my favourites",
    "love", "loved", "awesome", "beautiful", "amazing", "cool", "good", "great", "best", "fav", "favs",
    "albums i own", "my music", "spotify", "all", "music", "under 2000 listeners", "check out",
    "male vocalists", "male vocalist", "female vocalists", "female vocalist", "vocalist",
    "singer songwriter", "singer", "songwriter", "composer", "producer", "rapper", "band",
    "american", "british", "uk", "usa", "english", "canadian", "australian", "german", "french",
    "swedish", "korean", "japanese", "indian", "irish", "scottish", "norwegian", "dutch",
}

# Spelling variants -> one canonical tag. Keys are already normalized (lowercase, no hyphens).
ALIASES = {
    "hiphop": "hip hop", "hip hop": "hip hop", "hip hop rap": "hip hop", "rap hip hop": "hip hop",
    "rnb": "r&b", "r b": "r&b", "r and b": "r&b", "rhythm and blues": "r&b", "contemporary r b": "contemporary r&b",
    "alt r b": "alternative r&b", "alternative r b": "alternative r&b",
    "lofi": "lo-fi", "lo fi": "lo-fi", "lo fi hip hop": "lo-fi hip hop", "lofi hip hop": "lo-fi hip hop",
    "electronica": "electronic", "electro": "electronic",
    "alt rock": "alternative rock", "alternative": "alternative", "alt": "alternative",
    "indie": "indie", "indie rock": "indie rock", "indiepop": "indie pop",
    "kpop": "k-pop", "k pop": "k-pop", "jpop": "j-pop", "j pop": "j-pop",
    "synth pop": "synthpop", "synthpop": "synthpop", "dream pop": "dream pop", "dreampop": "dream pop",
    "post rock": "post-rock", "post punk": "post-punk", "pop punk": "pop punk",
    "drum and bass": "drum and bass", "drum n bass": "drum and bass", "dnb": "drum and bass", "d b": "drum and bass",
    "edm": "edm", "house music": "house",
    "bangladeshi": "bangla", "bangladesh": "bangla", "bengali": "bangla", "bangla band": "bangla rock", "bangladeshi rock": "bangla rock",
    "bengali rock": "bangla rock", "bangla music": "bangla",
    "soundtrack": "soundtrack", "ost": "soundtrack", "film score": "soundtrack",
}

DECADE = re.compile(r"^(?:(19|20)?(\d)0)\s?'?s$")


def norm(s: str) -> str:
    """lowercase, strip accents, unify separators: 'Hip-Hop' -> 'hip hop'."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode() or s  # keep non-latin tags as-is
    s = s.lower().strip()
    s = s.replace("&", " and ") if s not in ("r&b",) else s
    s = re.sub(r"[-_/.]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def decade(tag: str) -> str | None:
    """'80s' -> '1980s', "90's" -> '1990s', '2010s' -> '2010s', '00s' -> '2000s'."""
    m = DECADE.match(tag)
    if not m:
        return None
    century, d = m.group(1), m.group(2)
    if century:
        return f"{century}{d}0s"
    return f"{'20' if d in '012' else '19'}{d}0s"


def canonical(tag: str) -> str:
    t = norm(tag)
    t = ALIASES.get(t, t)
    # catch "r and b" left by the & expansion
    return ALIASES.get(t.replace(" and ", " "), t)


def clean_tags(raw: list[dict], artist: str, top_n: int = 3, min_count: int = 5) -> dict:
    """
    raw: Last.fm toptags [{'name': str, 'count': int(0..100)}, ...]
    Returns {'tags': [{'tag', 'weight'}...], 'era': str|None}; tags == [] when nothing usable.
    """
    artist_key = norm(artist)
    merged: dict[str, int] = {}
    eras: dict[str, int] = {}
    for t in raw:
        name, count = str(t.get("name", "")), int(t.get("count", 0) or 0)
        if count < min_count or not name.strip():
            continue
        n = norm(name)
        era = decade(n)
        if era:
            eras[era] = max(eras.get(era, 0), count)
            continue
        c = canonical(name)
        if not c or c in JUNK or n in JUNK or n == artist_key or c == artist_key or artist_key and artist_key in n and len(n) <= len(artist_key) + 3:
            continue
        merged[c] = max(merged.get(c, 0), count)  # near-duplicates: keep the stronger signal
    top = sorted(merged.items(), key=lambda kv: (-kv[1], kv[0]))[:top_n]
    return {
        "tags": [{"tag": t, "weight": round(c / 100, 2)} for t, c in top],
        "era": max(eras.items(), key=lambda kv: kv[1])[0] if eras else None,
    }


def apply_override(value) -> dict:
    """Override formats: ["bangla rock", "alternative"] or {"tags": [...], "era": "2000s"}.
    Tags may be strings (weights 1.0, 0.8, 0.6) or {"tag", "weight"}."""
    tags, era = (value, None) if isinstance(value, list) else (value.get("tags", []), value.get("era"))
    out = []
    for i, t in enumerate(tags[:3]):
        if isinstance(t, str):
            out.append({"tag": canonical(t), "weight": round(1 - 0.2 * i, 2)})
        else:
            out.append({"tag": canonical(t["tag"]), "weight": float(t.get("weight", 1 - 0.2 * i))})
    return {"tags": out, "era": era}


# Umbrella tags: true but uninformative when a more specific one is nearly as strong.
UMBRELLA = {"rock", "pop", "indie", "alternative", "electronic", "dance", "metal", "jazz", "folk", "hip hop", "rap", "soul", "punk", "classical", "country", "blues", "bangla"}


def primary(tags: list[dict], ratio: float = 0.5) -> str:
    """Pick the display genre: the top tag, unless it's an umbrella term and a more specific
    tag has >= `ratio` of its weight (e.g. 'classic rock' over 'rock')."""
    if not tags:
        return "unknown"
    top = tags[0]
    if top["tag"] in UMBRELLA:
        for t in tags[1:]:
            if t["tag"] not in UMBRELLA and t["weight"] >= ratio * top["weight"]:
                return t["tag"]
    return top["tag"]
