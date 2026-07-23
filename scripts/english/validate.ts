import path from "node:path"
import { loadEnglishConfig } from "./lib/config"
import { formatDiagnostic, hasErrors } from "./lib/diagnostics"
import { validateEnglishRepository } from "./lib/validation"

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
  const result = await validateEnglishRepository(config)
  for (const diagnostic of result.diagnostics) {
    console.log(formatDiagnostic(diagnostic))
  }

  if (hasErrors(result.diagnostics)) {
    process.exitCode = 1
    return
  }

  const warningCount = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length
  const itemCount = result.notes.reduce((total, note) => total + note.items.length, 0)
  console.log(
    `English validation passed: ${result.notes.length} daily notes, ${itemCount} items, ${warningCount} warnings.`,
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
