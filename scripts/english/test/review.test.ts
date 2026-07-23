import assert from "node:assert/strict"
import test, { describe } from "node:test"
import { parseEnglishConfig } from "../lib/config"
import { selectReviewItems } from "../lib/review"
import type { EnglishLearningItem } from "../lib/types"

function config(targetMinItems = 2, minimumAgeDays = 14) {
  return parseEnglishConfig(
    {
      version: 1,
      timezone: "America/Toronto",
      paths: {
        inbox: "content/english/inbox/current.md",
        daily: "content/english/daily",
        weekly: "content/english/weekly",
        revision: "content/english/revision",
      },
      review: {
        intervals_days: [1, 3, 7, 14, 30, 60, 120],
        target_min_items: targetMinItems,
        target_max_items: 15,
        supplemental_review: { enabled: true, minimum_age_days: minimumAgeDays },
      },
    },
    "/repo",
    "/repo/config.yaml",
  )
}

function item(id: string, capturedDate: string, expression = id): EnglishLearningItem {
  return {
    id,
    capturedDate,
    expression,
    meaning: "meaning",
    examples: ["example"],
    sourceFile: `/repo/${capturedDate}.md`,
    line: 1,
  }
}

describe("deterministic review selection", () => {
  test("matches every date in the documented schedule", () => {
    const learned = item("2026-07-22-test", "2026-07-22")
    for (const revisionDate of [
      "2026-07-23",
      "2026-07-25",
      "2026-07-29",
      "2026-08-05",
      "2026-08-21",
      "2026-09-20",
      "2026-11-19",
    ]) {
      assert.deepEqual(
        selectReviewItems([learned], revisionDate, config(1)).scheduled.map(({ id }) => id),
        [learned.id],
      )
    }
  })

  test("returns the same supplemental order for the same date", () => {
    const items = [
      item("2026-06-01-a", "2026-06-01"),
      item("2026-06-01-b", "2026-06-01"),
      item("2026-06-01-c", "2026-06-01"),
    ]
    const first = selectReviewItems(items, "2026-07-22", config()).supplemental
    const second = selectReviewItems(items, "2026-07-22", config()).supplemental
    assert.deepEqual(
      first.map(({ id }) => id),
      second.map(({ id }) => id),
    )
  })

  test("places yesterday's supplemental expression after fresh candidates", () => {
    const items = [
      item("2026-06-01-a", "2026-06-01", "repeat me"),
      item("2026-06-01-b", "2026-06-01", "fresh one"),
      item("2026-06-01-c", "2026-06-01", "fresh two"),
    ]
    const result = selectReviewItems(items, "2026-07-22", config(2), [" Repeat   Me "])
    assert.equal(
      result.supplemental.some(({ expression }) => expression === "repeat me"),
      false,
    )
  })

  test("keeps every scheduled item above the target maximum", () => {
    const items = Array.from({ length: 16 }, (_, index) =>
      item(`2026-07-21-item-${index}`, "2026-07-21"),
    )
    const result = selectReviewItems(items, "2026-07-22", config(8))
    assert.equal(result.scheduled.length, 16)
    assert.equal(result.supplemental.length, 0)
  })

  test("never selects future items", () => {
    const result = selectReviewItems(
      [item("2026-07-23-future", "2026-07-23")],
      "2026-07-22",
      config(1, 0),
    )
    assert.deepEqual(result, { scheduled: [], supplemental: [] })
  })
})
