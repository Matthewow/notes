import fs from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"
import { errorDiagnostic } from "./diagnostics"
import { isISODate } from "./date"
import type {
  DailyEnglishNote,
  Diagnostic,
  EnglishLearningItem,
  ParseResult,
  RevisionItem,
  RevisionNote,
} from "./types"

const ITEM_ID_PATTERN = /^<!--\s*english-item-id:\s*([^\s]+)\s*-->$/
const H3_PATTERN = /^###(?!#)\s+(.+?)\s*$/
const MEANING_PATTERN = /^\*\*Meaning:\*\*\s*(.+?)\s*$/
const NOTE_PATTERN = /^\*\*Note:\*\*\s*(.+?)\s*$/
const EXAMPLE_PATTERN = /^-\s+(.+?)\s*$/
const DAILY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/

interface SourceLine {
  text: string
  line: number
}

interface FrontmatterResult {
  frontmatter: Record<string, unknown>
  bodyStart: number
  diagnostics: Diagnostic[]
}

function parseFrontmatter(lines: string[], file: string): FrontmatterResult {
  if (lines[0]?.trim() !== "---") {
    return {
      frontmatter: {},
      bodyStart: 0,
      diagnostics: [
        errorDiagnostic("MISSING_FRONTMATTER", "File must start with YAML frontmatter", file, 1),
      ],
    }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---")
  if (closingIndex === -1) {
    return {
      frontmatter: {},
      bodyStart: lines.length,
      diagnostics: [
        errorDiagnostic("UNCLOSED_FRONTMATTER", "YAML frontmatter is not closed", file, 1),
      ],
    }
  }

  try {
    const parsed = parse(lines.slice(1, closingIndex).join("\n")) as unknown
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        frontmatter: {},
        bodyStart: closingIndex + 1,
        diagnostics: [
          errorDiagnostic("INVALID_FRONTMATTER", "YAML frontmatter must be an object", file, 1),
        ],
      }
    }
    return {
      frontmatter: parsed as Record<string, unknown>,
      bodyStart: closingIndex + 1,
      diagnostics: [],
    }
  } catch (error) {
    return {
      frontmatter: {},
      bodyStart: closingIndex + 1,
      diagnostics: [
        errorDiagnostic(
          "INVALID_FRONTMATTER",
          `Cannot parse YAML frontmatter: ${(error as Error).message}`,
          file,
          1,
        ),
      ],
    }
  }
}

function compactSegment(lines: string[], start: number, end: number): SourceLine[] {
  const compact = lines
    .slice(start, end)
    .map((text, offset) => ({ text: text.trim(), line: start + offset + 1 }))
    .filter(({ text }) => text !== "")

  while (compact.at(-1)?.text === "---") {
    compact.pop()
  }
  return compact
}

function parseVisibleItem(
  entries: SourceLine[],
  file: string,
  diagnostics: Diagnostic[],
): Omit<RevisionItem, "line"> & { line: number; note?: string } {
  const firstLine = entries[0]?.line ?? 1
  const headingMatch = H3_PATTERN.exec(entries[0]?.text ?? "")
  if (headingMatch === null) {
    diagnostics.push(
      errorDiagnostic(
        "MISSING_EXPRESSION",
        "Item must start with an H3 expression",
        file,
        firstLine,
      ),
    )
  }
  const expression = headingMatch?.[1]?.trim() ?? ""

  const meaningMatch = MEANING_PATTERN.exec(entries[1]?.text ?? "")
  if (meaningMatch === null) {
    diagnostics.push(
      errorDiagnostic(
        "MISSING_MEANING",
        "Item must contain a single-line **Meaning:** field after the expression",
        file,
        entries[1]?.line ?? firstLine,
      ),
    )
  }
  const meaning = meaningMatch?.[1]?.trim() ?? ""

  if (entries[2]?.text !== "**Examples**") {
    diagnostics.push(
      errorDiagnostic(
        "MISSING_EXAMPLES_HEADING",
        "Item must contain **Examples** after its meaning",
        file,
        entries[2]?.line ?? firstLine,
      ),
    )
  }

  const examples: string[] = []
  let note: string | undefined
  for (const entry of entries.slice(3)) {
    const exampleMatch = EXAMPLE_PATTERN.exec(entry.text)
    if (exampleMatch !== null && note === undefined) {
      examples.push(exampleMatch[1].trim())
      continue
    }

    const noteMatch = NOTE_PATTERN.exec(entry.text)
    if (noteMatch !== null && note === undefined) {
      note = noteMatch[1].trim()
      continue
    }

    diagnostics.push(
      errorDiagnostic(
        "UNKNOWN_ITEM_CONTENT",
        `Unsupported canonical item content: ${entry.text}`,
        file,
        entry.line,
      ),
    )
  }

  if (examples.length === 0) {
    diagnostics.push(
      errorDiagnostic(
        "MISSING_EXAMPLES",
        "Item must contain at least one example",
        file,
        firstLine,
      ),
    )
  }

  return { expression, meaning, examples, note, line: firstLine }
}

export function parseDailyNote(file: string, contents: string): ParseResult<DailyEnglishNote> {
  const diagnostics: Diagnostic[] = []
  const filenameMatch = DAILY_FILE_PATTERN.exec(path.basename(file))
  if (filenameMatch === null || !isISODate(filenameMatch[1])) {
    return {
      diagnostics: [
        errorDiagnostic(
          "INVALID_DAILY_FILENAME",
          "Daily filenames must use a real YYYY-MM-DD date",
          file,
        ),
      ],
    }
  }
  const date = filenameMatch[1]
  const lines = contents.split(/\r?\n/)
  const frontmatterResult = parseFrontmatter(lines, file)
  diagnostics.push(...frontmatterResult.diagnostics)

  const idLocations: Array<{ index: number; id: string }> = []
  for (let index = frontmatterResult.bodyStart; index < lines.length; index += 1) {
    const match = ITEM_ID_PATTERN.exec(lines[index].trim())
    if (match !== null) {
      idLocations.push({ index, id: match[1] })
    }
  }

  const firstItemIndex = idLocations[0]?.index ?? lines.length
  for (let index = frontmatterResult.bodyStart; index < firstItemIndex; index += 1) {
    if (lines[index].trim() !== "") {
      diagnostics.push(
        errorDiagnostic(
          "CONTENT_OUTSIDE_ITEM",
          "Canonical daily content must be inside an item",
          file,
          index + 1,
        ),
      )
    }
  }

  const items: EnglishLearningItem[] = []
  for (let itemIndex = 0; itemIndex < idLocations.length; itemIndex += 1) {
    const location = idLocations[itemIndex]
    const end = idLocations[itemIndex + 1]?.index ?? lines.length
    const entries = compactSegment(lines, location.index + 1, end)
    const parsed = parseVisibleItem(entries, file, diagnostics)
    items.push({
      id: location.id,
      expression: parsed.expression,
      meaning: parsed.meaning,
      examples: parsed.examples,
      note: parsed.note,
      sourceFile: file,
      capturedDate: date,
      line: location.index + 1,
    })
  }

  return {
    value: {
      date,
      path: file,
      title:
        typeof frontmatterResult.frontmatter.title === "string"
          ? frontmatterResult.frontmatter.title
          : undefined,
      frontmatter: frontmatterResult.frontmatter,
      items,
    },
    diagnostics,
  }
}

function parseRevisionVisibleItem(
  entries: SourceLine[],
  file: string,
  diagnostics: Diagnostic[],
): RevisionItem {
  const parsed = parseVisibleItem(entries, file, diagnostics)
  if (parsed.note !== undefined) {
    diagnostics.push(
      errorDiagnostic(
        "REVISION_NOTE_NOT_ALLOWED",
        "Revision items must omit optional canonical notes",
        file,
        parsed.line,
      ),
    )
  }
  return {
    expression: parsed.expression,
    meaning: parsed.meaning,
    examples: parsed.examples,
    line: parsed.line,
  }
}

export function parseRevisionNote(file: string, contents: string): ParseResult<RevisionNote> {
  const diagnostics: Diagnostic[] = []
  const lines = contents.split(/\r?\n/)
  const frontmatterResult = parseFrontmatter(lines, file)
  diagnostics.push(...frontmatterResult.diagnostics)

  const headingIndexes: number[] = []
  for (let index = frontmatterResult.bodyStart; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (ITEM_ID_PATTERN.test(trimmed)) {
      diagnostics.push(
        errorDiagnostic(
          "REVISION_ID_NOT_ALLOWED",
          "Generated revision files must not contain item IDs",
          file,
          index + 1,
        ),
      )
    }
    if (H3_PATTERN.test(trimmed)) {
      headingIndexes.push(index)
    }
  }

  let emptyMessage: string | undefined
  const items: RevisionItem[] = []
  if (headingIndexes.length === 0) {
    const body = lines
      .slice(frontmatterResult.bodyStart)
      .map((line) => line.trim())
      .filter(Boolean)
    emptyMessage = body.join(" ")
  } else {
    const firstHeading = headingIndexes[0]
    for (let index = frontmatterResult.bodyStart; index < firstHeading; index += 1) {
      if (lines[index].trim() !== "") {
        diagnostics.push(
          errorDiagnostic(
            "REVISION_CONTENT_OUTSIDE_ITEM",
            "Revision content before the first item is not allowed",
            file,
            index + 1,
          ),
        )
      }
    }

    for (let itemIndex = 0; itemIndex < headingIndexes.length; itemIndex += 1) {
      const start = headingIndexes[itemIndex]
      const end = headingIndexes[itemIndex + 1] ?? lines.length
      const entries = compactSegment(lines, start, end)
      items.push(parseRevisionVisibleItem(entries, file, diagnostics))
    }
  }

  const frontmatter = frontmatterResult.frontmatter
  return {
    value: {
      path: file,
      title: typeof frontmatter.title === "string" ? frontmatter.title : undefined,
      revisionDate:
        typeof frontmatter.revisionDate === "string" ? frontmatter.revisionDate : undefined,
      generated: typeof frontmatter.generated === "boolean" ? frontmatter.generated : undefined,
      frontmatter,
      items,
      emptyMessage,
    },
    diagnostics,
  }
}

export async function readDailyNotes(dailyDirectory: string): Promise<{
  notes: DailyEnglishNote[]
  diagnostics: Diagnostic[]
}> {
  let entries
  try {
    entries = await fs.readdir(dailyDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { notes: [], diagnostics: [] }
    }
    throw error
  }

  const notes: DailyEnglishNote[] = []
  const diagnostics: Diagnostic[] = []
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue
    }
    const file = path.join(dailyDirectory, entry.name)
    if (!DAILY_FILE_PATTERN.test(entry.name)) {
      diagnostics.push(
        errorDiagnostic(
          "INVALID_DAILY_FILENAME",
          "Every Markdown file in the daily directory must use YYYY-MM-DD.md",
          file,
        ),
      )
      continue
    }
    const contents = await fs.readFile(file, "utf8")
    const result = parseDailyNote(file, contents)
    diagnostics.push(...result.diagnostics)
    if (result.value !== undefined) {
      notes.push(result.value)
    }
  }
  return { notes, diagnostics }
}

export async function readRevisionNote(file: string): Promise<ParseResult<RevisionNote>> {
  try {
    return parseRevisionNote(file, await fs.readFile(file, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { diagnostics: [] }
    }
    throw error
  }
}
