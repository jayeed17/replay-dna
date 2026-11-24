import unittest

from normalize import apply_override, canonical, clean_tags, decade, primary


class TestNormalize(unittest.TestCase):
    def test_canonical_merges_variants(self):
        for v in ["Hip-Hop", "hip hop", "HipHop", "hip_hop"]:
            self.assertEqual(canonical(v), "hip hop")
        for v in ["RnB", "R&B", "r and b", "Rhythm and Blues"]:
            self.assertEqual(canonical(v), "r&b")
        self.assertEqual(canonical("Lo-Fi"), "lo-fi")
        self.assertEqual(canonical("Bangladeshi"), "bangla")

    def test_decades(self):
        self.assertEqual(decade("80s"), "1980s")
        self.assertEqual(decade("90's"), "1990s")
        self.assertEqual(decade("2010s"), "2010s")
        self.assertEqual(decade("00s"), "2000s")
        self.assertIsNone(decade("house"))

    def test_clean_tags(self):
        raw = [
            {"name": "Hip-Hop", "count": 100}, {"name": "rap", "count": 80}, {"name": "hip hop", "count": 60},
            {"name": "seen live", "count": 50}, {"name": "90s", "count": 40}, {"name": "Kendrick Lamar", "count": 30},
            {"name": "west coast", "count": 20}, {"name": "jazz rap", "count": 10}, {"name": "obscure", "count": 2},
        ]
        out = clean_tags(raw, "Kendrick Lamar")
        self.assertEqual([t["tag"] for t in out["tags"]], ["hip hop", "rap", "west coast"])
        self.assertEqual(out["tags"][0]["weight"], 1.0)
        self.assertEqual(out["era"], "1990s")

    def test_empty(self):
        self.assertEqual(clean_tags([], "X"), {"tags": [], "era": None})
        self.assertEqual(clean_tags([{"name": "seen live", "count": 100}], "X")["tags"], [])

    def test_override(self):
        self.assertEqual(apply_override(["Bangla Rock", "alternative"])["tags"], [{"tag": "bangla rock", "weight": 1.0}, {"tag": "alternative", "weight": 0.8}])
        self.assertEqual(apply_override({"tags": ["folk"], "era": "2000s"})["era"], "2000s")

    def test_primary_prefers_specific(self):
        t = lambda *p: [{"tag": a, "weight": w} for a, w in p]
        self.assertEqual(primary(t(("rock", 1.0), ("classic rock", 0.6))), "classic rock")
        self.assertEqual(primary(t(("rock", 1.0), ("classic rock", 0.3))), "rock")
        self.assertEqual(primary(t(("shoegaze", 1.0), ("rock", 0.9))), "shoegaze")
        self.assertEqual(primary(t(("rock", 1.0), ("pop", 0.9))), "rock")
        self.assertEqual(primary([]), "unknown")


if __name__ == "__main__":
    unittest.main()
