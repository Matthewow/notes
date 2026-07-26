import { createHash } from "node:crypto"
import { differenceInDays } from "./date"
import type { EnglishLearningItem, LoadedEnglishConfig, ReviewSelection } from "./types"

function supplementalHash(revisionDate: string, itemId: string): string {
  return createHash("sha256").update(`${revisionDate}\0${itemId}`).digest("hex")
}

export function selectReviewItems(
  items: EnglishLearningItem[],
  revisionDate: string,
  config: LoadedEnglishConfig,
): ReviewSelection {
  const intervals = new Set(config.review.intervalsDays)

  const eligible = items
    .map((item) => ({ item, age: differenceInDays(revisionDate, item.capturedDate) }))
    .filter(({ age }) => age >= 0)

  const scheduled = eligible
    .filter(({ age }) => intervals.has(age))
    .map(({ item }) => item)
    .toSorted(
      (left, right) =>
        left.capturedDate.localeCompare(right.capturedDate) || left.id.localeCompare(right.id),
    )

  if (
    !config.review.supplementalReview.enabled ||
    scheduled.length >= config.review.targetMinItems
  ) {
    return { scheduled, supplemental: [] }
  }

  const scheduledIds = new Set(scheduled.map((item) => item.id))
  const candidates = eligible
    .filter(
      ({ item, age }) =>
        age >= config.review.supplementalReview.minimumAgeDays && !scheduledIds.has(item.id),
    )
    .map(({ item }) => ({
      item,
      hash: supplementalHash(revisionDate, item.id),
    }))
    .toSorted(
      (left, right) =>
        left.hash.localeCompare(right.hash) || left.item.id.localeCompare(right.item.id),
    )

  const needed = Math.max(0, config.review.targetMinItems - scheduled.length)
  return {
    scheduled,
    supplemental: candidates.slice(0, needed).map(({ item }) => item),
  }
}
