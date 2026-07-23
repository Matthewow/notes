import { createHash } from "node:crypto"
import { differenceInDays } from "./date"
import { normalizeExpression } from "./ids"
import type { EnglishLearningItem, LoadedEnglishConfig, ReviewSelection } from "./types"

function supplementalHash(revisionDate: string, itemId: string): string {
  return createHash("sha256").update(`${revisionDate}\0${itemId}`).digest("hex")
}

export function selectReviewItems(
  items: EnglishLearningItem[],
  revisionDate: string,
  config: LoadedEnglishConfig,
  yesterdayExpressions: Iterable<string> = [],
): ReviewSelection {
  const intervals = new Set(config.review.intervalsDays)
  const yesterday = new Set(
    Array.from(yesterdayExpressions, (expression) => normalizeExpression(expression)),
  )

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
      appearedYesterday: yesterday.has(normalizeExpression(item.expression)),
      hash: supplementalHash(revisionDate, item.id),
    }))
    .toSorted(
      (left, right) =>
        Number(left.appearedYesterday) - Number(right.appearedYesterday) ||
        left.hash.localeCompare(right.hash) ||
        left.item.id.localeCompare(right.item.id),
    )

  const needed = Math.max(0, config.review.targetMinItems - scheduled.length)
  return {
    scheduled,
    supplemental: candidates.slice(0, needed).map(({ item }) => item),
  }
}
