import type { EnglishLearningItem, RevisionItem } from "./types"

type RenderableRevisionItem = Pick<
  EnglishLearningItem | RevisionItem,
  "expression" | "meaning" | "examples"
>

export type RevisionMode = "today" | "yesterday"

function titleForMode(mode: RevisionMode): string {
  return mode === "today" ? "Today's English Revision" : "Yesterday's English Revision"
}

function emptyMessageForMode(mode: RevisionMode): string {
  return mode === "today"
    ? "No items are scheduled for review today."
    : "No items were scheduled for review on this date."
}

function renderItem(item: RenderableRevisionItem): string {
  return [
    `### ${item.expression}`,
    "",
    `**Meaning:** ${item.meaning}`,
    "",
    "**Examples**",
    ...item.examples.map((example) => `- ${example}`),
  ].join("\n")
}

export function renderRevision(
  revisionDate: string,
  items: RenderableRevisionItem[],
  mode: RevisionMode,
): string {
  const frontmatter = [
    "---",
    `title: ${mode === "today" ? "Today's" : "Yesterday's"} English Revision`,
    `revisionDate: ${revisionDate}`,
    "generated: true",
    "---",
  ].join("\n")

  const body =
    items.length === 0 ? emptyMessageForMode(mode) : items.map(renderItem).join("\n\n---\n\n")
  return `${frontmatter}\n\n${body}\n`
}

export function expectedRevisionTitle(mode: RevisionMode): string {
  return titleForMode(mode)
}
