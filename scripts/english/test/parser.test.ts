import assert from "node:assert/strict"
import test, { describe } from "node:test"
import { hasErrors } from "../lib/diagnostics"
import { parseDailyNote, parseRevisionNote } from "../lib/parser"

const validDaily = `---
title: English — 2026-07-22
date: 2026-07-22
tags:
  - english
  - learning
---

<!-- english-item-id: 2026-07-22-get-a-read-on -->

### get a read on

**Meaning:**    对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact first.
- I want to get a read on how the team feels.

---

<!-- english-item-id: 2026-07-22-paint-yourself-into-a-corner -->
### paint yourself into a corner
**Meaning:** 把自己限制到以后很难调整选择的境地。
**Examples**
- We shouldn't paint ourselves into a corner.
**Note:** Often used when a choice limits future flexibility.
`

describe("canonical daily Markdown parser", () => {
  test("parses whitespace, separators, examples, and an optional note", () => {
    const result = parseDailyNote("/repo/content/english/daily/2026-07-22.md", validDaily)
    assert.equal(hasErrors(result.diagnostics), false)
    assert.equal(result.value?.items.length, 2)
    assert.equal(result.value?.items[0].expression, "get a read on")
    assert.equal(result.value?.items[0].examples.length, 2)
    assert.equal(result.value?.items[1].note, "Often used when a choice limits future flexibility.")
  })

  test("allows a daily note with zero items", () => {
    const result = parseDailyNote(
      "/repo/content/english/daily/2026-07-22.md",
      "---\ntitle: English — 2026-07-22\ndate: 2026-07-22\n---\n",
    )
    assert.equal(hasErrors(result.diagnostics), false)
    assert.equal(result.value?.items.length, 0)
  })

  test("reports unsupported content and missing examples", () => {
    const result = parseDailyNote(
      "/repo/content/english/daily/2026-07-22.md",
      `---
title: English
date: 2026-07-22
---
<!-- english-item-id: 2026-07-22-test -->
### test
**Meaning:** 测试
**Examples**
Unsupported paragraph
`,
    )
    assert.equal(hasErrors(result.diagnostics), true)
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "UNKNOWN_ITEM_CONTENT"))
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "MISSING_EXAMPLES"))
  })

  test("rejects a non-date filename", () => {
    const result = parseDailyNote("/repo/content/english/daily/index.md", validDaily)
    assert.equal(result.value, undefined)
    assert.equal(result.diagnostics[0].code, "INVALID_DAILY_FILENAME")
  })
})

describe("generated revision parser", () => {
  test("parses visible items without requiring IDs", () => {
    const result = parseRevisionNote(
      "/repo/content/english/revision/today.md",
      `---
title: Today's English Revision
revisionDate: 2026-07-22
generated: true
---

### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact.
`,
    )
    assert.equal(hasErrors(result.diagnostics), false)
    assert.equal(result.value?.items[0].expression, "get a read on")
  })

  test("rejects hidden IDs in generated revisions", () => {
    const result = parseRevisionNote(
      "/repo/content/english/revision/today.md",
      `---
title: Today's English Revision
revisionDate: 2026-07-22
generated: true
---
<!-- english-item-id: 2026-07-22-test -->
`,
    )
    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.code === "REVISION_ID_NOT_ALLOWED"),
    )
  })
})
