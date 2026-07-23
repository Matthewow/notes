import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test, { describe } from "node:test"
import { parseEnglishConfig } from "../lib/config"
import { generateRevision } from "../generate-revision"
import { parseRevisionNote } from "../lib/parser"
import { renderRevision } from "../lib/render"

async function createRepository(): Promise<{
  root: string
  config: ReturnType<typeof parseEnglishConfig>
  todayPath: string
  yesterdayPath: string
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "english-generator-"))
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
        target_min_items: 1,
        target_max_items: 15,
        supplemental_review: { enabled: true, minimum_age_days: 14 },
      },
    },
    root,
    path.join(root, "config.yaml"),
  )
  await fs.mkdir(config.absolutePaths.daily, { recursive: true })
  await fs.mkdir(config.absolutePaths.revision, { recursive: true })
  const todayPath = path.join(config.absolutePaths.revision, "today.md")
  const yesterdayPath = path.join(config.absolutePaths.revision, "yesterday.md")
  await fs.writeFile(todayPath, renderRevision("2026-07-22", [], "today"))
  await fs.writeFile(yesterdayPath, renderRevision("2026-07-21", [], "yesterday"))
  await fs.writeFile(
    path.join(config.absolutePaths.daily, "2026-07-21.md"),
    `---
title: English — 2026-07-21
date: 2026-07-21
tags:
  - english
  - learning
---

<!-- english-item-id: 2026-07-21-get-a-read-on -->

### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact.

**Note:** This note must not appear in revision output.
`,
  )
  return { root, config, todayPath, yesterdayPath }
}

describe("revision generation", () => {
  test("generates scheduled content and is idempotent on the same date", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    const originalYesterday = await fs.readFile(repository.yesterdayPath, "utf8")

    const first = await generateRevision({
      config: repository.config,
      revisionDate: "2026-07-22",
    })
    assert.equal(first.scheduledCount, 1)
    assert.equal(first.rotated, false)
    assert.match(first.todayContent, /### get a read on/)
    assert.doesNotMatch(first.todayContent, /english-item-id|This note must not appear/)

    const second = await generateRevision({
      config: repository.config,
      revisionDate: "2026-07-22",
    })
    assert.equal(second.rotated, false)
    assert.equal(await fs.readFile(repository.yesterdayPath, "utf8"), originalYesterday)
    assert.equal(second.todayContent, first.todayContent)
  })

  test("rotates the previous generated revision after one or more missed days", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    await generateRevision({ config: repository.config, revisionDate: "2026-07-22" })

    const result = await generateRevision({
      config: repository.config,
      revisionDate: "2026-07-26",
    })
    assert.equal(result.rotated, true)
    const yesterday = parseRevisionNote(
      repository.yesterdayPath,
      await fs.readFile(repository.yesterdayPath, "utf8"),
    )
    assert.equal(yesterday.value?.revisionDate, "2026-07-22")
    assert.equal(yesterday.value?.title, "Yesterday's English Revision")
    assert.equal(yesterday.value?.items[0].expression, "get a read on")
  })

  test("writes a dated empty state when nothing is due", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    const result = await generateRevision({
      config: repository.config,
      revisionDate: "2026-07-23",
    })
    assert.match(result.todayContent, /revisionDate: 2026-07-23/)
    assert.match(result.todayContent, /No items are scheduled for review today\./)
  })

  test("dry-run does not change revision files", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    const beforeToday = await fs.readFile(repository.todayPath, "utf8")
    const beforeYesterday = await fs.readFile(repository.yesterdayPath, "utf8")
    await generateRevision({
      config: repository.config,
      revisionDate: "2026-07-23",
      dryRun: true,
    })
    assert.equal(await fs.readFile(repository.todayPath, "utf8"), beforeToday)
    assert.equal(await fs.readFile(repository.yesterdayPath, "utf8"), beforeYesterday)
  })

  test("preserves revision files when canonical validation fails", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    const beforeToday = await fs.readFile(repository.todayPath, "utf8")
    const beforeYesterday = await fs.readFile(repository.yesterdayPath, "utf8")
    await fs.appendFile(
      path.join(repository.config.absolutePaths.daily, "2026-07-21.md"),
      "\nUnsupported content\n",
    )
    await assert.rejects(
      generateRevision({ config: repository.config, revisionDate: "2026-07-23" }),
      /Unsupported canonical item content/,
    )
    assert.equal(await fs.readFile(repository.todayPath, "utf8"), beforeToday)
    assert.equal(await fs.readFile(repository.yesterdayPath, "utf8"), beforeYesterday)
  })

  test("rejects generation before the current today date", async (t) => {
    const repository = await createRepository()
    t.after(() => fs.rm(repository.root, { recursive: true, force: true }))
    await assert.rejects(
      generateRevision({ config: repository.config, revisionDate: "2026-07-21" }),
      /future revisionDate/,
    )
  })
})
