import path from "node:path"
import { loadEnglishConfig } from "./lib/config"
import { parseISODate } from "./lib/date"
import { formatDiagnostic, hasErrors } from "./lib/diagnostics"
import { nextItemId } from "./lib/ids"
import { readDailyNotes } from "./lib/parser"

function requiredOption(name: string): string {
  const index = process.argv.indexOf(name)
  const value = index === -1 ? undefined : process.argv[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing required option ${name}`)
  }
  return value
}

function optionalOption(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const date = requiredOption("--date")
  const expression = requiredOption("--expression")
  parseISODate(date)
  const configOption = optionalOption("--config")
  const config = await loadEnglishConfig(
    repoRoot,
    configOption === undefined ? undefined : path.resolve(repoRoot, configOption),
  )
  const parsed = await readDailyNotes(config.absolutePaths.daily)
  for (const diagnostic of parsed.diagnostics) {
    console.error(formatDiagnostic(diagnostic))
  }
  if (hasErrors(parsed.diagnostics)) {
    process.exitCode = 1
    return
  }
  const ids = parsed.notes.flatMap((note) => note.items.map((item) => item.id))
  console.log(nextItemId(date, expression, ids))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
