export interface EnglishLearningItem {
  id: string
  expression: string
  meaning: string
  examples: string[]
  note?: string
  sourceFile: string
  capturedDate: string
  line: number
}

export interface DailyEnglishNote {
  date: string
  path: string
  title?: string
  frontmatter: Record<string, unknown>
  items: EnglishLearningItem[]
}

export interface RevisionItem {
  expression: string
  meaning: string
  examples: string[]
  line: number
}

export interface RevisionNote {
  path: string
  title?: string
  revisionDate?: string
  generated?: boolean
  frontmatter: Record<string, unknown>
  items: RevisionItem[]
  emptyMessage?: string
}

export interface EnglishConfig {
  version: number
  timezone: string
  paths: {
    inbox: string
    daily: string
    weekly: string
    revision: string
  }
  review: {
    intervalsDays: number[]
    targetMinItems: number
    targetMaxItems: number
    supplementalReview: {
      enabled: boolean
      minimumAgeDays: number
    }
  }
}

export interface LoadedEnglishConfig extends EnglishConfig {
  repoRoot: string
  configPath: string
  absolutePaths: {
    inbox: string
    daily: string
    weekly: string
    revision: string
  }
}

export interface ReviewSelection {
  scheduled: EnglishLearningItem[]
  supplemental: EnglishLearningItem[]
}

export type DiagnosticSeverity = "error" | "warning"

export interface Diagnostic {
  severity: DiagnosticSeverity
  message: string
  file?: string
  line?: number
  code: string
}

export interface ParseResult<T> {
  value?: T
  diagnostics: Diagnostic[]
}

export interface ValidationResult {
  notes: DailyEnglishNote[]
  diagnostics: Diagnostic[]
}
