import fs from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"
import { EnglishWorkflowError } from "./diagnostics"
import { todayInTimeZone } from "./date"
import type { EnglishConfig, LoadedEnglishConfig } from "./types"

export const DEFAULT_CONFIG_PATH = ".codex/english-learning/config.yaml"

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EnglishWorkflowError(`${label} must be an object`, "INVALID_CONFIG")
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new EnglishWorkflowError(`${label} must be a non-empty string`, "INVALID_CONFIG")
  }
  return value
}

function requireInteger(value: unknown, label: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new EnglishWorkflowError(
      `${label} must be an integer greater than or equal to ${minimum}`,
      "INVALID_CONFIG",
    )
  }
  return value as number
}

function requireSafeRelativePath(value: unknown, label: string, repoRoot: string): string {
  const relativePath = requireString(value, label)
  if (path.isAbsolute(relativePath)) {
    throw new EnglishWorkflowError(`${label} must be relative to the repository`, "UNSAFE_PATH")
  }
  const resolved = path.resolve(repoRoot, relativePath)
  const relative = path.relative(repoRoot, resolved)
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new EnglishWorkflowError(`${label} escapes the repository root`, "UNSAFE_PATH")
  }
  return relativePath
}

export function parseEnglishConfig(
  raw: unknown,
  repoRoot: string,
  configPath: string,
): LoadedEnglishConfig {
  const root = requireObject(raw, "config")
  const version = requireInteger(root.version, "version", 1)
  if (version !== 1) {
    throw new EnglishWorkflowError(`Unsupported config version: ${version}`, "INVALID_CONFIG")
  }

  const timezone = requireString(root.timezone, "timezone")
  todayInTimeZone(timezone)

  const paths = requireObject(root.paths, "paths")
  const configuredPaths: EnglishConfig["paths"] = {
    inbox: requireSafeRelativePath(paths.inbox, "paths.inbox", repoRoot),
    daily: requireSafeRelativePath(paths.daily, "paths.daily", repoRoot),
    weekly: requireSafeRelativePath(paths.weekly, "paths.weekly", repoRoot),
    revision: requireSafeRelativePath(paths.revision, "paths.revision", repoRoot),
  }

  const review = requireObject(root.review, "review")
  if (!Array.isArray(review.intervals_days) || review.intervals_days.length === 0) {
    throw new EnglishWorkflowError(
      "review.intervals_days must be a non-empty array",
      "INVALID_CONFIG",
    )
  }
  const intervalsDays = review.intervals_days.map((value, index) =>
    requireInteger(value, `review.intervals_days[${index}]`, 1),
  )
  const uniqueIntervals = new Set(intervalsDays)
  if (
    uniqueIntervals.size !== intervalsDays.length ||
    intervalsDays.some((value, index) => index > 0 && value <= intervalsDays[index - 1])
  ) {
    throw new EnglishWorkflowError(
      "review.intervals_days must be unique and strictly ascending",
      "INVALID_CONFIG",
    )
  }

  const targetMinItems = requireInteger(review.target_min_items, "review.target_min_items", 1)
  const targetMaxItems = requireInteger(review.target_max_items, "review.target_max_items", 1)
  if (targetMinItems > targetMaxItems) {
    throw new EnglishWorkflowError(
      "review.target_min_items must not exceed review.target_max_items",
      "INVALID_CONFIG",
    )
  }

  const supplemental = requireObject(review.supplemental_review, "review.supplemental_review")
  if (typeof supplemental.enabled !== "boolean") {
    throw new EnglishWorkflowError(
      "review.supplemental_review.enabled must be boolean",
      "INVALID_CONFIG",
    )
  }
  const minimumAgeDays = requireInteger(
    supplemental.minimum_age_days,
    "review.supplemental_review.minimum_age_days",
    0,
  )

  return {
    version,
    timezone,
    paths: configuredPaths,
    review: {
      intervalsDays,
      targetMinItems,
      targetMaxItems,
      supplementalReview: {
        enabled: supplemental.enabled,
        minimumAgeDays,
      },
    },
    repoRoot,
    configPath,
    absolutePaths: {
      inbox: path.resolve(repoRoot, configuredPaths.inbox),
      daily: path.resolve(repoRoot, configuredPaths.daily),
      weekly: path.resolve(repoRoot, configuredPaths.weekly),
      revision: path.resolve(repoRoot, configuredPaths.revision),
    },
  }
}

export async function loadEnglishConfig(
  repoRoot = process.cwd(),
  configPath = path.resolve(repoRoot, DEFAULT_CONFIG_PATH),
): Promise<LoadedEnglishConfig> {
  let contents: string
  try {
    contents = await fs.readFile(configPath, "utf8")
  } catch (error) {
    throw new EnglishWorkflowError(
      `Cannot read English configuration at ${configPath}: ${(error as Error).message}`,
      "CONFIG_NOT_FOUND",
    )
  }

  let raw: unknown
  try {
    raw = parse(contents)
  } catch (error) {
    throw new EnglishWorkflowError(
      `Cannot parse English configuration: ${(error as Error).message}`,
      "INVALID_CONFIG",
    )
  }
  return parseEnglishConfig(raw, path.resolve(repoRoot), path.resolve(configPath))
}
