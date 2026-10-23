export type Versioned = { updatedAt: number | string };
export type Draft<T extends Versioned> = { record: T; dirty: boolean };

/** Keep the values and their concurrency token from the same server revision. */
export function reconcileDraft<T extends Versioned>(draft: Draft<T>, latest: T): Draft<T> {
  return draft.dirty || draft.record.updatedAt === latest.updatedAt
    ? draft
    : { record: latest, dirty: false };
}
