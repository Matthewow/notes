import { EnglishWorkflowError } from "./diagnostics"

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MILLISECONDS = 86_400_000

export function parseISODate(value: string): Date {
  const match = ISO_DATE_PATTERN.exec(value)
  if (match === null) {
    throw new EnglishWorkflowError(`Invalid ISO date: ${value}`, "INVALID_DATE")
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new EnglishWorkflowError(`Invalid calendar date: ${value}`, "INVALID_DATE")
  }

  return date
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }
  try {
    parseISODate(value)
    return true
  } catch {
    return false
  }
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return formatISODate(date)
}

export function differenceInDays(later: string, earlier: string): number {
  return Math.round(
    (parseISODate(later).getTime() - parseISODate(earlier).getTime()) / DAY_MILLISECONDS,
  )
}

export function todayInTimeZone(timezone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const result = `${values.year}-${values.month}-${values.day}`
    parseISODate(result)
    return result
  } catch {
    throw new EnglishWorkflowError(`Invalid IANA timezone: ${timezone}`, "INVALID_TIMEZONE")
  }
}

export function isoWeekRange(value: string): { key: string; start: string; end: string } {
  const date = parseISODate(value)
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - weekday + 1)
  const start = formatISODate(date)

  const thursday = parseISODate(start)
  thursday.setUTCDate(thursday.getUTCDate() + 3)
  const isoYear = thursday.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstWeekday = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay()
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 4)
  const week =
    1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MILLISECONDS))

  return {
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
    start,
    end: addDays(start, 6),
  }
}
