import assert from "node:assert/strict"
import test, { describe } from "node:test"
import { isStructurallyValidItemId, nextItemId, slugifyExpression } from "../lib/ids"

describe("stable English item IDs", () => {
  test("normalizes punctuation, apostrophes, accents, and spaces", () => {
    assert.equal(slugifyExpression("  Don’t déjà-vu this!  "), "dont-deja-vu-this")
  })

  test("uses an item fallback when no ASCII word remains", () => {
    assert.equal(slugifyExpression("中文"), "item")
  })

  test("adds increasing collision suffixes", () => {
    const existing = [
      "2026-07-22-get-a-read-on",
      "2026-07-22-get-a-read-on-2",
      "2026-07-22-get-a-read-on-3",
    ]
    assert.equal(nextItemId("2026-07-22", "get a read on", existing), "2026-07-22-get-a-read-on-4")
  })

  test("validates the stored structure", () => {
    assert.equal(isStructurallyValidItemId("2026-07-22-get-a-read-on-2"), true)
    assert.equal(isStructurallyValidItemId("get a read on"), false)
  })
})
