import assert from "node:assert/strict"
import test, { describe } from "node:test"
import path from "node:path"
import { parseEnglishConfig } from "../lib/config"
import { addDays, differenceInDays, isoWeekRange, parseISODate, todayInTimeZone } from "../lib/date"

const validConfig = {
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
    target_min_items: 8,
    target_max_items: 15,
    supplemental_review: {
      enabled: true,
      minimum_age_days: 14,
    },
  },
}

describe("English configuration", () => {
  test("loads and resolves a valid configuration", () => {
    const root = "/tmp/example-repo"
    const config = parseEnglishConfig(validConfig, root, path.join(root, "config.yaml"))
    assert.equal(config.timezone, "America/Toronto")
    assert.equal(config.absolutePaths.daily, path.join(root, "content/english/daily"))
    assert.deepEqual(config.review.intervalsDays, [1, 3, 7, 14, 30, 60, 120])
  })

  test("rejects a path outside the repository", () => {
    const raw = structuredClone(validConfig)
    raw.paths.daily = "../../private"
    assert.throws(() => parseEnglishConfig(raw, "/tmp/repo", "/tmp/repo/config.yaml"), {
      message: /escapes the repository root/,
    })
  })

  test("rejects unsorted or duplicate intervals", () => {
    const raw = structuredClone(validConfig)
    raw.review.intervals_days = [1, 3, 3]
    assert.throws(() => parseEnglishConfig(raw, "/tmp/repo", "/tmp/repo/config.yaml"), {
      message: /strictly ascending/,
    })
  })

  test("rejects a minimum above the maximum", () => {
    const raw = structuredClone(validConfig)
    raw.review.target_min_items = 20
    assert.throws(() => parseEnglishConfig(raw, "/tmp/repo", "/tmp/repo/config.yaml"), {
      message: /must not exceed/,
    })
  })

  test("rejects an invalid timezone", () => {
    const raw = structuredClone(validConfig)
    raw.timezone = "Mars/Olympus"
    assert.throws(() => parseEnglishConfig(raw, "/tmp/repo", "/tmp/repo/config.yaml"), {
      message: /Invalid IANA timezone/,
    })
  })
})

describe("calendar date helpers", () => {
  test("rejects impossible calendar dates", () => {
    assert.throws(() => parseISODate("2026-02-30"), /Invalid calendar date/)
  })

  test("uses calendar days across a daylight-saving transition", () => {
    assert.equal(addDays("2026-03-07", 1), "2026-03-08")
    assert.equal(differenceInDays("2026-03-09", "2026-03-07"), 2)
  })

  test("finds Toronto's date from an instant", () => {
    assert.equal(todayInTimeZone("America/Toronto", new Date("2026-07-23T02:00:00Z")), "2026-07-22")
  })

  test("calculates ISO week boundaries across a year boundary", () => {
    assert.deepEqual(isoWeekRange("2027-01-01"), {
      key: "2026-W53",
      start: "2026-12-28",
      end: "2027-01-03",
    })
  })
})
