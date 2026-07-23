import path from "node:path"
import { loadEnglishConfig } from "./lib/config"
import { differenceInDays, parseISODate, todayInTimeZone } from "./lib/date"
import { EnglishWorkflowError, formatDiagnostic, hasErrors } from "./lib/diagnostics"
import { writeFilesWithRollback } from "./lib/files"
import { parseRevisionNote, readRevisionNote } from "./lib/parser"
import { renderRevision } from "./lib/render"
import { selectReviewItems } from "./lib/review"
import type { LoadedEnglishConfig } from "./lib/types"
import { validateEnglishRepository } from "./lib/validation"

export interface GenerateRevisionOptions {
  config: LoadedEnglishConfig
  revisionDate: string
  dryRun?: boolean
}

export interface GenerateRevisionResult {
  revisionDate: string
  scheduledCount: number
  supplementalCount: number
  rotated: boolean
  exceededTargetMaximum: boolean
  todayContent: string
}

function validateCandidate(file: string, contents: string): void {
  const result = parseRevisionNote(file, contents)
  if (hasErrors(result.diagnostics)) {
    throw new EnglishWorkflowError(
      result.diagnostics.map(formatDiagnostic).join("\n"),
      "INVALID_GENERATED_REVISION",
    )
  }
}

export async function generateRevision(
  options: GenerateRevisionOptions,
): Promise<GenerateRevisionResult> {
  parseISODate(options.revisionDate)
  const validation = await validateEnglishRepository(options.config)
  if (hasErrors(validation.diagnostics)) {
    throw new EnglishWorkflowError(
      validation.diagnostics.map(formatDiagnostic).join("\n"),
      "CANONICAL_VALIDATION_FAILED",
    )
  }

  const todayPath = path.join(options.config.absolutePaths.revision, "today.md")
  const yesterdayPath = path.join(options.config.absolutePaths.revision, "yesterday.md")
  const [currentTodayResult, currentYesterdayResult] = await Promise.all([
    readRevisionNote(todayPath),
    readRevisionNote(yesterdayPath),
  ])
  const currentToday = currentTodayResult.value
  const currentYesterday = currentYesterdayResult.value
  if (currentToday?.revisionDate === undefined || currentYesterday === undefined) {
    throw new EnglishWorkflowError(
      "Both today.md and yesterday.md must be valid before generation",
      "MISSING_REVISION_FILE",
    )
  }

  const dateDelta = differenceInDays(options.revisionDate, currentToday.revisionDate)
  if (dateDelta < 0) {
    throw new EnglishWorkflowError(
      `today.md has future revisionDate ${currentToday.revisionDate}`,
      "FUTURE_REVISION_DATE",
    )
  }
  const rotated = dateDelta > 0
  const effectiveYesterday = rotated ? currentToday : currentYesterday
  const allItems = validation.notes.flatMap((note) => note.items)
  const selection = selectReviewItems(
    allItems,
    options.revisionDate,
    options.config,
    effectiveYesterday.items.map((item) => item.expression),
  )
  const selectedItems = [...selection.scheduled, ...selection.supplemental]
  const todayContent = renderRevision(options.revisionDate, selectedItems, "today")
  validateCandidate(todayPath, todayContent)

  const changes = [{ path: todayPath, contents: todayContent }]
  if (rotated) {
    const yesterdayContent = renderRevision(
      currentToday.revisionDate,
      currentToday.items,
      "yesterday",
    )
    validateCandidate(yesterdayPath, yesterdayContent)
    changes.unshift({ path: yesterdayPath, contents: yesterdayContent })
  }

  if (options.dryRun !== true) {
    await writeFilesWithRollback(changes)
  }

  return {
    revisionDate: options.revisionDate,
    scheduledCount: selection.scheduled.length,
    supplementalCount: selection.supplemental.length,
    rotated,
    exceededTargetMaximum: selection.scheduled.length > options.config.review.targetMaxItems,
    todayContent,
  }
}

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const configOption = optionValue("--config")
  const config = await loadEnglishConfig(
    repoRoot,
    configOption === undefined ? undefined : path.resolve(repoRoot, configOption),
  )
  const requestedDate = optionValue("--date") ?? todayInTimeZone(config.timezone)
  const result = await generateRevision({
    config,
    revisionDate: requestedDate,
    dryRun: process.argv.includes("--dry-run"),
  })

  if (process.argv.includes("--dry-run")) {
    process.stdout.write(result.todayContent)
  }
  console.log(
    `English revision ${result.revisionDate}: ${result.scheduledCount} scheduled, ${result.supplementalCount} supplemental, rotation ${result.rotated ? "performed" : "not needed"}.`,
  )
  if (result.exceededTargetMaximum) {
    console.warn(
      `Scheduled items exceed target maximum ${config.review.targetMaxItems}; all scheduled items were retained.`,
    )
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
