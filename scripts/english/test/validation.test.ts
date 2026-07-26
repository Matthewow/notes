import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { parseEnglishConfig } from "../lib/config"
import { renderRevision } from "../lib/render"
import { validateEnglishRepository } from "../lib/validation"

test("allows duplicate expressions when item IDs are unique", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "english-validation-"))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const config = parseEnglishConfig(
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
        target_min_items: 8,
        target_max_items: 15,
        supplemental_review: { enabled: true, minimum_age_days: 14 },
      },
    },
    root,
    path.join(root, "config.yaml"),
  )
  await fs.mkdir(config.absolutePaths.daily, { recursive: true })
  await fs.mkdir(config.absolutePaths.revision, { recursive: true })
  await fs.writeFile(
    path.join(config.absolutePaths.daily, "2026-07-22.md"),
    `---
title: English — 2026-07-22
date: 2026-07-22
---

<!-- english-item-id: 2026-07-22-repeat-me -->

### repeat me

**Meaning:** 再说一次。

**Examples**
- Please repeat that when everyone joins the call.

<!-- english-item-id: 2026-07-22-repeat-me-2 -->

### repeat me

**Meaning:** 再说一次。

**Examples**
- Could you repeat that last point with a little more context?
`,
  )
  await fs.writeFile(
    path.join(config.absolutePaths.revision, "today.md"),
    renderRevision("2026-07-22", [], "today"),
  )
  await fs.writeFile(
    path.join(config.absolutePaths.revision, "yesterday.md"),
    renderRevision("2026-07-21", [], "yesterday"),
  )

  const result = await validateEnglishRepository(config)

  assert.deepEqual(result.diagnostics, [])
  assert.equal(result.notes[0]?.items.length, 2)
})
