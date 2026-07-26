import path from "node:path"
import { errorDiagnostic, warningDiagnostic } from "./diagnostics"
import { isISODate } from "./date"
import { isStructurallyValidItemId } from "./ids"
import { readDailyNotes, readRevisionNote } from "./parser"
import type { Diagnostic, LoadedEnglishConfig, RevisionNote, ValidationResult } from "./types"

function validateRevision(
  note: RevisionNote | undefined,
  file: string,
  expectedTitle: string,
): Diagnostic[] {
  if (note === undefined) {
    return [errorDiagnostic("MISSING_REVISION_FILE", "Required revision file is missing", file)]
  }

  const diagnostics: Diagnostic[] = []
  if (note.title !== expectedTitle) {
    diagnostics.push(
      errorDiagnostic("INVALID_REVISION_TITLE", `Revision title must be "${expectedTitle}"`, file),
    )
  }
  if (!isISODate(note.revisionDate)) {
    diagnostics.push(
      errorDiagnostic("INVALID_REVISION_DATE", "revisionDate must be a real YYYY-MM-DD date", file),
    )
  }
  if (note.generated !== true) {
    diagnostics.push(
      errorDiagnostic(
        "INVALID_GENERATED_FLAG",
        "Revision frontmatter must set generated: true",
        file,
      ),
    )
  }
  if (note.items.length === 0 && note.emptyMessage?.trim() === "") {
    diagnostics.push(
      errorDiagnostic(
        "MISSING_REVISION_EMPTY_STATE",
        "A revision without items must contain an empty-state message",
        file,
      ),
    )
  }
  for (const item of note.items) {
    if (item.examples.length > 3) {
      diagnostics.push(
        errorDiagnostic(
          "TOO_MANY_EXAMPLES",
          "Revision items may contain at most three examples",
          file,
          item.line,
        ),
      )
    }
  }
  return diagnostics
}

export async function validateEnglishRepository(
  config: LoadedEnglishConfig,
): Promise<ValidationResult> {
  const daily = await readDailyNotes(config.absolutePaths.daily)
  const diagnostics = [...daily.diagnostics]
  const seenIds = new Map<string, { file: string; line: number }>()

  for (const note of daily.notes) {
    if (note.title === undefined || note.title.trim() === "") {
      diagnostics.push(
        errorDiagnostic("MISSING_DAILY_TITLE", "Daily frontmatter must contain a title", note.path),
      )
    }
    if (note.frontmatter.date !== note.date) {
      diagnostics.push(
        errorDiagnostic(
          "DAILY_DATE_MISMATCH",
          `Daily frontmatter date must equal ${note.date}`,
          note.path,
        ),
      )
    }

    for (const item of note.items) {
      if (!isStructurallyValidItemId(item.id)) {
        diagnostics.push(
          errorDiagnostic(
            "INVALID_ITEM_ID",
            `Invalid item ID: ${item.id}`,
            item.sourceFile,
            item.line,
          ),
        )
      }

      const firstSeen = seenIds.get(item.id)
      if (firstSeen !== undefined) {
        diagnostics.push(
          errorDiagnostic(
            "DUPLICATE_ITEM_ID",
            `Item ID also appears at ${firstSeen.file}:${firstSeen.line}`,
            item.sourceFile,
            item.line,
          ),
        )
      } else {
        seenIds.set(item.id, { file: item.sourceFile, line: item.line })
      }

      if (!item.id.startsWith(`${item.capturedDate}-`)) {
        diagnostics.push(
          warningDiagnostic(
            "ITEM_ID_DATE_MISMATCH",
            `Item ID does not start with capture date ${item.capturedDate}`,
            item.sourceFile,
            item.line,
          ),
        )
      }
      if (item.expression.trim() === "") {
        diagnostics.push(
          errorDiagnostic(
            "EMPTY_EXPRESSION",
            "Expression must not be empty",
            item.sourceFile,
            item.line,
          ),
        )
      }
      if (item.meaning.trim() === "") {
        diagnostics.push(
          errorDiagnostic("EMPTY_MEANING", "Meaning must not be empty", item.sourceFile, item.line),
        )
      }
      if (item.examples.length === 0 || item.examples.length > 3) {
        diagnostics.push(
          errorDiagnostic(
            "INVALID_EXAMPLE_COUNT",
            "Canonical items must contain one to three examples",
            item.sourceFile,
            item.line,
          ),
        )
      }
      if (item.meaning.length > 160) {
        diagnostics.push(
          warningDiagnostic(
            "LONG_MEANING",
            "Meaning is unusually long; keep canonical notes concise",
            item.sourceFile,
            item.line,
          ),
        )
      }
      if (item.note !== undefined && item.note.length > 200) {
        diagnostics.push(
          warningDiagnostic(
            "LONG_NOTE",
            "Note is unusually long; keep canonical notes concise",
            item.sourceFile,
            item.line,
          ),
        )
      }
    }
  }

  const todayPath = path.join(config.absolutePaths.revision, "today.md")
  const yesterdayPath = path.join(config.absolutePaths.revision, "yesterday.md")
  const [today, yesterday] = await Promise.all([
    readRevisionNote(todayPath),
    readRevisionNote(yesterdayPath),
  ])
  diagnostics.push(...today.diagnostics, ...yesterday.diagnostics)
  diagnostics.push(
    ...validateRevision(today.value, todayPath, "Today's English Revision"),
    ...validateRevision(yesterday.value, yesterdayPath, "Yesterday's English Revision"),
  )

  return { notes: daily.notes, diagnostics }
}
