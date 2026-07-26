---
name: weekly-english-review
description: Conduct an interactive ISO-week review of canonical Quartz English daily notes, compare related expressions, identify useful patterns or corrections, and persist a confirmed concise weekly synthesis. Use for requests such as "review this week's English", "let's do my weekly English review", or a review of a specified YYYY-Www week. Do not use as a simple concatenation tool or for daily revision generation.
---

# Weekly English Review

Work from the Quartz repository root. Daily notes are canonical. Weekly notes
are concise synthesis views, not a second database.

## Load the week

1. Read `.codex/english-learning/config.yaml`.
2. Use an explicitly requested ISO week when supplied. Otherwise use the
   current `America/Toronto` ISO week, Monday through Sunday.
3. Read every existing date-named daily note in that range.
4. Run `npm run english:validate` before relying on the inventory.
5. If the week contains no items, report that and do not create a weekly file
   unless the user explicitly asks for an empty one.

## Conduct the review

Guide the discussion in manageable stages:

1. give a short inventory and overview;
2. group related or overlapping expressions;
3. compare useful distinctions and usage limits;
4. identify expressions worth actively using;
5. identify items that need more review;
6. flag inaccurate meanings, unnatural examples, or better canonical forms;
7. treat repeated expressions as evidence of useful repetition or an
   active-vocabulary need, not as duplicate data to consolidate.

Do not immediately dump a long analysis. Expand only where semantic
explanation helps learning.

## Propose changes

Keep two proposal groups separate:

1. optional edits to canonical daily items;
2. the weekly synthesis note.

For every daily edit, show the current and proposed versions. Never change its
`english-item-id`.

Each ID identifies a learning occurrence. Do not merge or remove items only
because their expression text or meaning repeats another item.

The weekly note belongs at
`content/english/weekly/YYYY-Www.md`. Use frontmatter and no Markdown H1:

```markdown
---
title: English Weekly Review — 2026 W30
tags:
  - english
  - learning
  - weekly-review
---

## Worth Actively Using

...

## Related Expressions

...

## Review Again

...
```

Omit sections that add no value. Do not reproduce every daily expression in
full.

## Confirmation and persistence

Require clear confirmation before creating or replacing the weekly note.
Require confirmation for material daily-note edits as well. The user may
approve both proposal groups together when their approval is explicit.

After confirmation:

1. prepare all candidate files before writing;
2. apply the related changes together where possible;
3. run `npm run english:validate`;
4. if validation fails, restore files changed by this workflow and report the
   error;
5. preserve all existing item IDs.

This is best-effort multi-file rollback, not a database transaction. Never run
`npx quartz sync` unless the user separately requests it.
