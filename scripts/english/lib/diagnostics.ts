import type { Diagnostic } from "./types"

export class EnglishWorkflowError extends Error {
  constructor(
    message: string,
    readonly code = "ENGLISH_WORKFLOW_ERROR",
  ) {
    super(message)
    this.name = "EnglishWorkflowError"
  }
}

export function errorDiagnostic(
  code: string,
  message: string,
  file?: string,
  line?: number,
): Diagnostic {
  return { severity: "error", code, message, file, line }
}

export function warningDiagnostic(
  code: string,
  message: string,
  file?: string,
  line?: number,
): Diagnostic {
  return { severity: "warning", code, message, file, line }
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const location =
    diagnostic.file === undefined
      ? ""
      : diagnostic.line === undefined
        ? `${diagnostic.file}: `
        : `${diagnostic.file}:${diagnostic.line}: `
  return `${location}${diagnostic.severity.toUpperCase()} [${diagnostic.code}] ${diagnostic.message}`
}
