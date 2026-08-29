import cocaSeed from "@/data/coca-seed.json";

export type CocaEntry = {
  rank: number;
  word: string;
  pos: string;
  cefrHint: string;
  topics: string[];
};

const CEFR_ORDER = ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

function cefrIndex(level?: string): number {
  if (!level) return 1;
  const idx = CEFR_ORDER.indexOf(level as (typeof CEFR_ORDER)[number]);
  return idx === -1 ? 1 : idx;
}

/**
 * Returns a small relevant sample from the COCA seed.
 * Replace `src/data/coca-seed.json` with a curated extract from
 * `english-learning/references/coca-5000.csv` (or a licensed source)
 * when moving beyond MVP seed data.
 */
export function selectCocaSample(options: {
  cefr?: string;
  interests?: string[];
  limit?: number;
}): CocaEntry[] {
  const limit = options.limit ?? 8;
  const levelIdx = cefrIndex(options.cefr);
  const interests = (options.interests ?? []).map((i) => i.toLowerCase());

  const scored = (cocaSeed as CocaEntry[])
    .map((entry) => {
      const entryLevel = cefrIndex(entry.cefrHint);
      const levelDistance = Math.abs(entryLevel - levelIdx);
      const topicHits = entry.topics.filter((t) =>
        interests.some((interest) => interest.includes(t) || t.includes(interest)),
      ).length;
      return { entry, score: topicHits * 10 - levelDistance };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}
