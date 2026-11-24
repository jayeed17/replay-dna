# Genre pipeline (optional)

Spotify's export has no genres, so this script asks Last.fm for each artist's top tags.
**Only artist names are sent to Last.fm**; your listening history never leaves your machine.

```bash
cp .env.example .env   # add LASTFM_API_KEY
python3 pipeline/genres.py --limit 20   # quick test
python3 pipeline/genres.py              # all artists (cached; ~4 req/s)
```

Outputs (all in `data/derived/`, gitignored):

| File | What |
|---|---|
| `genres.json` | `artists → { tags: [{tag, weight}] (top 3), era, source }`. Drop it into the app with your export. |
| `lastfm_cache.json` | raw Last.fm responses, so reruns are instant |
| `untagged.txt` | artists with no usable tags, most-listened first |
| `genres_overrides.json` | your hand-filled tags (see `genres_overrides.example.json`); merged in, wins over Last.fm |

Normalization: lowercase; variants merged (`Hip-Hop`/`hip hop`/`hiphop` → `hip hop`, `RnB` → `r&b`);
junk dropped (`seen live`, `favorites`, nationalities, the artist's own name); decade tags (`80s`)
become a separate `era` field; artists with nothing left get `unknown`.

After editing overrides: `python3 pipeline/genres.py --offline`. Tests: `cd pipeline && python3 -m unittest`.
