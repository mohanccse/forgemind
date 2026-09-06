import { CURATED_NOVEL_CHALLENGES } from '../data/curatedNovelChallenges';

// Server-side stores for challenge definition caching and hint gating enforcement
export const serverChallengeStore = new Map<string, any>();
export const serverHintStateStore = new Map<string, any>();

// Preload curated challenges into serverChallengeStore
Object.values(CURATED_NOVEL_CHALLENGES).forEach((c: any) => {
  serverChallengeStore.set(c.id, c);
  if (c.conceptId) {
    serverChallengeStore.set(c.conceptId, c);
  }
});
