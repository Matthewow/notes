# English Learning Workflow for Quartz — Design

## 1. Purpose

This document defines the technical design for the English Learning Workflow described in `REQUIREMENTS.md`.

The design focuses on:

* Markdown data structure;
* stable item identification;
* daily processing behavior;
* weekly review behavior;
* revision scheduling;
* Codex skill contracts;
* file ownership and mutation boundaries;
* deterministic behavior where LLM reasoning is unnecessary.

The first version should prefer simplicity over theoretical completeness.

The system is designed around the following separation:

```text
LLM
├── understand language
├── interpret context
├── correct likely transcripts
├── generate examples
├── compare related expressions
└── synthesize weekly learning

Deterministic code
├── parse canonical Markdown
├── calculate review dates
├── select review items
├── rotate revision files
└── validate structural consistency
```

This distinction is important.

LLM reasoning should only be used where semantic judgment adds real value.

---

# 2. High-Level Architecture

```text
┌────────────────────────────┐
│ content/english/inbox/     │
│ current.md                 │
└─────────────┬──────────────┘
              │
              ▼
     process-english skill
              │
       interactive session
              │
         user confirms
              │
              ▼
┌────────────────────────────┐
│ content/english/daily/     │
│ YYYY-MM-DD.md              │
└─────────────┬──────────────┘
              │
        ┌─────┴──────┐
        │            │
        ▼            ▼
 weekly skill    revision generator
        │            │
 interactive    deterministic
        │            │
 confirmation   no confirmation
        │            │
        ▼            ▼
 weekly/*.md    revision/today.md
                revision/yesterday.md
```

The canonical knowledge source is the set of daily Markdown files.

Weekly notes are synthesis views.

Revision files are generated views.

---

# 3. Repository Layout

Recommended structure:

```text
quartz/
├── REQUIREMENTS.md
├── DESIGN.md
│
├── content/
│   └── english/
│       ├── inbox/
│       │   └── current.md
│       │
│       ├── daily/
│       │   ├── 2026-07-22.md
│       │   └── 2026-07-23.md
│       │
│       ├── weekly/
│       │   └── 2026-W30.md
│       │
│       └── revision/
│           ├── today.md
│           └── yesterday.md
│
├── .codex/
│   ├── english-learning/
│   │   └── config.yaml
│   │
│   └── skills/
│       ├── process-english/
│       │   └── SKILL.md
│       │
│       ├── weekly-english-review/
│       │   └── SKILL.md
│       │
│       └── generate-english-revision/
│           └── SKILL.md
│
└── scripts/
    └── english/
        ├── generate-revision.ts
        ├── validate.ts
        └── lib/
            ├── parser.ts
            ├── review.ts
            └── types.ts
```

The exact skill directory may be adjusted to match the current Codex skill convention.

The logical structure should remain equivalent.

---

# 4. Configuration

Repository-specific behavior should be defined in one configuration file.

Recommended location:

```text
.codex/english-learning/config.yaml
```

Example:

```yaml
version: 1

timezone: America/Toronto

paths:
  inbox: content/english/inbox/current.md
  daily: content/english/daily
  weekly: content/english/weekly
  revision: content/english/revision

review:
  intervals_days:
    - 1
    - 3
    - 7
    - 14
    - 30
    - 60
    - 120

  target_min_items: 8
  target_max_items: 15

  supplemental_review:
    enabled: true
    minimum_age_days: 14
```

The configuration should contain behavior that may reasonably change later.

It should not contain learning state.

---

# 5. Canonical Data Model

The canonical source of truth is:

```text
content/english/daily/*.md
```

Each daily file contains zero or more learning items.

Each learning item must have:

* a stable item ID;
* a canonical expression;
* a concise meaning;
* one to three examples.

It may optionally have:

* a short usage note.

---

# 6. Stable Item IDs

The revision generator needs a stable way to identify individual expressions.

Using only the heading text is not sufficient because:

* headings may later be improved;
* the same expression may accidentally appear twice;
* normalization may change the canonical wording.

The design should therefore assign each item a hidden stable ID.

Recommended format:

```markdown
<!-- english-item-id: 2026-07-22-paint-yourself-into-a-corner -->

### paint yourself into a corner

**Meaning:** 把自己限制到以后很难调整选择的境地。

**Examples**
- We shouldn't paint ourselves into a corner by committing to this design too early.
```

HTML comments are preferred because:

* they do not visually clutter Quartz pages;
* they remain human-readable;
* they are easy to parse;
* they survive Markdown editing;
* they do not require custom Quartz rendering.

---

## 6.1 ID generation

Default format:

```text
YYYY-MM-DD-{slug}
```

Example:

```text
2026-07-22-get-a-read-on
```

If a collision occurs:

```text
2026-07-22-get-a-read-on-2
```

Once created, an item ID must not change automatically.

This remains true even if the expression heading is later edited.

---

# 7. Daily Note Format

Recommended complete daily file:

```markdown
---
title: English — 2026-07-22
date: 2026-07-22
tags:
  - english
  - learning
---

# English — July 22, 2026

<!-- english-item-id: 2026-07-22-get-a-read-on -->

### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact before we roll this out.
- I want to get a read on how the team feels about the change.

---

<!-- english-item-id: 2026-07-22-paint-yourself-into-a-corner -->

### paint yourself into a corner

**Meaning:** 把自己限制到以后很难调整选择的境地。

**Examples**
- We shouldn't paint ourselves into a corner by committing too early.
- Hardcoding this behavior could paint us into a corner later.

**Note:** Often used when a decision unnecessarily limits future flexibility.
```

The visible content remains compact.

The hidden ID provides machine stability.

---

# 8. Daily Item Parsing Contract

A valid canonical item should follow this general structure:

```text
ITEM_ID_COMMENT
H3_EXPRESSION
MEANING
EXAMPLES
OPTIONAL_NOTE
```

The parser should not depend excessively on whitespace.

For example, both of these should remain parseable:

```markdown
**Meaning:** ...
```

and:

```markdown
**Meaning:**    ...
```

The parser should tolerate:

* blank lines;
* one to three examples;
* missing optional notes.

The validator should reject or warn about:

* missing item IDs;
* duplicate item IDs;
* missing meanings;
* zero examples;
* more than three examples;
* duplicate IDs across different files.

---

# 9. Daily Capture Design

The inbox remains intentionally unstructured.

Example:

```markdown
# Current English Inbox

- I don't want us to **paint ourselves into a corner** here.

- We should "double click" the issue before we commit.

- **get a read on**

- blast radius
  context: We were talking about the impact of changing a payment API.
```

No formal schema should be required.

The user should be able to capture ideas quickly without thinking about formatting rules.

The agent is responsible for interpreting the inbox.

---

# 10. Skill 1: `process-english`

## 10.1 Trigger

Typical user instructions may include:

```text
Process today's English.
```

```text
Process my English inbox.
```

```text
Let's go through today's expressions.
```

The skill should treat these as equivalent workflow triggers.

---

## 10.2 Inputs

Primary input:

```text
content/english/inbox/current.md
```

Optional input:

* additional context supplied directly in the conversation;
* an explicitly specified target date.

Default date:

```text
current date in America/Toronto
```

---

## 10.3 Processing stages

The skill should operate in five stages.

### Stage 1 — Parse

Identify candidate learning items.

Rules:

1. bold text is the default target when available;
2. otherwise inspect the full sentence;
3. expression-only bullets are accepted;
4. supporting context should be associated with the nearest item.

---

### Stage 2 — Understand

For each candidate:

* determine the likely expression;
* interpret its contextual meaning;
* check whether the transcript appears unnatural;
* identify likely transcription mistakes;
* determine whether normalization is useful.

This stage may be detailed.

No files should be modified.

---

### Stage 3 — Discuss

Present the useful explanation to the user.

The discussion may include:

* likely intended wording;
* contextual meaning;
* differences from similar expressions;
* usage limitations;
* transcript uncertainty.

The goal is understanding, not creating documentation.

The agent should avoid unnecessary explanation once the user clearly understands the item.

---

### Stage 4 — Propose canonical content

After the expression is understood, produce a compact proposed item.

Example:

```markdown
### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact before we roll this out.
- I want to get a read on how customers are reacting.
```

The proposal should not contain the hidden item ID yet unless the item already exists.

---

### Stage 5 — Persist after confirmation

Only after explicit user confirmation should the skill:

1. determine the target daily file;
2. create it if necessary;
3. generate stable item IDs;
4. append or update confirmed items;
5. validate the result;
6. clear successfully processed inbox content.

The skill should not run Git synchronization automatically.

---

# 11. Confirmation Semantics

The workflow should interpret clear user approval as confirmation.

Examples include:

```text
Looks good.
```

```text
Save it.
```

```text
Persist it.
```

```text
Confirm.
```

```text
That's good.
```

A user requesting additional explanation or modifications is not confirmation.

The agent should not repeatedly ask for ritual confirmation when the user has already clearly approved the final content.

---

# 12. Inbox Clearing Behavior

The inbox should only be cleared after:

1. confirmed content has been successfully written;
2. the resulting daily note passes structural validation.

After successful processing, the inbox may be reset to:

```markdown
# Current English Inbox
```

If persistence fails, the inbox must remain unchanged.

This prevents accidental loss of raw captures.

---

# 13. Multiple Processing Sessions Per Day

The user may process English more than once on the same date.

If:

```text
content/english/daily/YYYY-MM-DD.md
```

already exists, new confirmed items should be appended.

The skill should first check for obvious duplicates.

Possible duplicate signals include:

* identical canonical expressions;
* normalized forms that are effectively equivalent;
* semantically identical items already captured recently.

The agent should propose merging rather than silently duplicating.

---

# 14. Editing Existing Canonical Items

Existing daily notes may be improved later.

The workflow is:

```text
identify issue
    ↓
show current version
    ↓
show proposed replacement
    ↓
user confirms
    ↓
modify item
```

The item ID must remain unchanged.

Example:

```text
Before:
2026-07-22-get-a-read-on

After heading update:
get a better read on

ID remains:
2026-07-22-get-a-read-on
```

IDs represent item identity, not current wording.

---

# 15. Weekly Review Design

The weekly review is intentionally LLM-driven.

Unlike revision generation, its value comes from semantic reasoning.

---

# 16. Skill 2: `weekly-english-review`

## 16.1 Trigger

Typical instructions:

```text
Let's do this week's English review.
```

```text
Review my English from this week.
```

---

## 16.2 Week definition

Use ISO weeks:

```text
Monday → Sunday
```

Example:

```text
2026-W30
```

The target week should default to the current ISO week unless the user specifies otherwise.

For a normal weekend session, the skill should include all available daily notes from that ISO week.

---

## 16.3 Weekly session stages

### Stage 1 — Load

Read all daily notes for the target week.

Build an internal inventory of:

* expressions;
* meanings;
* examples;
* notes.

---

### Stage 2 — Identify relationships

Look for:

* similar expressions;
* overlapping meanings;
* useful contrasts;
* repeated themes;
* duplicated entries;
* potentially incorrect entries;
* expressions particularly useful for active vocabulary.

---

### Stage 3 — Conduct the review

The skill should guide a systematic review session.

It should not immediately dump a very long analysis.

A useful progression is:

```text
overview
    ↓
important clusters
    ↓
interesting distinctions
    ↓
items worth actively using
    ↓
items needing correction
```

The conversation may become detailed where useful.

---

### Stage 4 — Propose canonical improvements

If the weekly review discovers problems in daily notes, the skill may propose changes.

Examples:

* better canonical wording;
* corrected meanings;
* stronger examples;
* duplicate consolidation;
* useful short notes.

These proposals must not be silently applied.

---

### Stage 5 — Propose weekly note

After the review session, generate a compact synthesis.

Possible structure:

```markdown
# English Weekly Review — 2026 W30

## This Week

- get a read on
- paint yourself into a corner
- double-click on something
- blast radius

## Worth Actively Using

### get a read on

Useful when you want a preliminary understanding before making a decision.

### paint yourself into a corner

Useful when discussing design decisions that may reduce future flexibility.

## Related Expressions

### get a read on / get a sense of / gauge

Short comparison.

## Review Again

- ...
```

Sections should be omitted when they provide no useful content.

---

### Stage 6 — Confirm and persist

After user confirmation:

1. persist the weekly note;
2. separately apply any confirmed daily-note modifications;
3. run structural validation.

Weekly persistence should not automatically trigger Git synchronization.

---

# 17. Weekly Notes Are Not a Second Database

Weekly notes must not reproduce every daily item in full.

They should contain synthesis that did not already exist.

The weekly layer should answer questions such as:

```text
What patterns did I learn this week?

Which expressions are especially useful?

Which expressions are similar?

Which distinctions should I remember?

What should I actively try to use next week?
```

If a section only duplicates existing daily notes, it should usually be removed.

---

# 18. Revision Generation Design

Revision generation should be mostly deterministic.

The LLM should not regenerate explanations or examples every day.

This avoids:

* unnecessary wording changes;
* hallucinated nuance;
* inconsistent examples;
* unnecessary token usage.

Revision content should be extracted directly from canonical daily notes.

---

# 19. Skill 3: `generate-english-revision`

## 19.1 Trigger

Typical instructions:

```text
Generate today's English revision.
```

```text
Update my revision.
```

---

## 19.2 Execution model

The preferred implementation is:

```text
Codex skill
    ↓
invoke deterministic script
    ↓
scripts/english/generate-revision.ts
```

The skill itself should mainly:

* invoke the generator;
* report completion;
* surface validation errors.

The scheduler should not depend on LLM reasoning.

---

# 20. Review Schedule

For an item captured on day `D`, scheduled review dates are:

```text
D + 1
D + 3
D + 7
D + 14
D + 30
D + 60
D + 120
```

Example:

```text
Captured:
2026-07-22

Scheduled:
2026-07-23
2026-07-25
2026-07-29
2026-08-05
2026-08-21
2026-09-20
2026-11-19
```

The capture date is derived from the daily filename.

No separate review-state database is required.

---

# 21. Why V1 Has No Review State Database

The first version does not collect:

* Hard;
* Good;
* Easy;
* review completion status;
* recall scores.

Therefore maintaining fields such as:

```text
last_reviewed
next_review
ease_factor
```

would create false precision.

The schedule can be fully reconstructed from:

```text
item capture date
+
configured review intervals
```

This makes the canonical data model simpler and avoids synchronization problems.

A state system may be introduced later if actual user feedback needs to influence scheduling.

---

# 22. Revision Selection Algorithm

For date `T`:

## Step 1 — Scheduled items

Select all items where:

```text
T - capture_date
```

matches one of:

```text
1, 3, 7, 14, 30, 60, 120
```

These items have highest priority.

---

## Step 2 — Supplemental items

If the number of scheduled items is below:

```text
target_min_items
```

select additional older items.

Supplemental candidates should:

* be at least `minimum_age_days` old;
* not already be scheduled today;
* preferably not have appeared in yesterday's revision.

Supplemental selection should be deterministic for a given date.

One possible approach is to rank candidates using a hash of:

```text
revision_date + item_id
```

This ensures:

* rerunning the generator on the same day produces stable output;
* different days naturally select different older items;
* no persistent random-selection state is required.

---

## Step 3 — Size behavior

The configured range:

```text
8–15 items
```

is a target, not a strict limit.

Rules:

### Fewer than 8 scheduled items

Add supplemental items until approximately 8 items are reached.

### Between 8 and 15 scheduled items

Use scheduled items only.

### More than 15 scheduled items

Include all scheduled items.

Do not silently discard a scheduled review solely to enforce the target maximum.

Given the expected scale of the personal learning workflow, occasional larger revision days are acceptable.

---

# 23. Revision Content

Revision items should reuse canonical content directly.

Example source:

```markdown
<!-- english-item-id: 2026-07-22-get-a-read-on -->

### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact before we roll this out.
- I want to get a read on how customers are reacting.
```

Generated revision:

```markdown
### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact before we roll this out.
- I want to get a read on how customers are reacting.
```

The generator should not include:

* hidden IDs;
* original capture context;
* detailed reasoning;
* internal metadata.

---

# 24. Revision File Metadata

`today.md` should include machine-readable frontmatter.

Example:

```markdown
---
title: Today's English Revision
revisionDate: 2026-07-23
generated: true
---
```

`yesterday.md` should preserve its original revision date.

Example:

```markdown
---
title: Yesterday's English Revision
revisionDate: 2026-07-22
generated: true
---
```

The visible H1 may still use:

```markdown
# Today's Revision
```

and:

```markdown
# Yesterday's Revision
```

---

# 25. Idempotent Revision Generation

Generating revision multiple times on the same date must be safe.

Suppose:

```text
today.md revisionDate = 2026-07-23
```

and the generator runs again on:

```text
2026-07-23
```

Then:

* do not rotate `today.md` into `yesterday.md`;
* regenerate `today.md` in place.

This allows the user to:

* add new canonical material;
* fix an existing item;
* regenerate revision

without destroying the real previous day's revision.

---

## 25.1 Rotation behavior

If:

```text
today.md revisionDate < current date
```

then:

```text
today.md → yesterday.md
```

before generating the new `today.md`.

If several days were missed, `yesterday.md` still receives only the previous generated revision.

The system does not attempt to create all missing historical revision files.

---

# 26. Yesterday Exclusion for Supplemental Review

When selecting supplemental items, the generator should preferably exclude items already present in `yesterday.md`.

This reduces unnecessary immediate repetition.

This exclusion does not apply to genuinely scheduled items.

A scheduled item should always appear even if it was also selected as supplemental yesterday.

---

# 27. Parser Design

Recommended internal representation:

```ts
interface EnglishLearningItem {
  id: string
  expression: string
  meaning: string
  examples: string[]
  note?: string

  sourceFile: string
  capturedDate: string
}
```

Daily note parsing should produce:

```ts
interface DailyEnglishNote {
  date: string
  path: string
  items: EnglishLearningItem[]
}
```

Revision generation should operate only on parsed canonical items.

---

# 28. Validation

A validation script should be available:

```bash
npx tsx scripts/english/validate.ts
```

or an equivalent command appropriate to the repository.

Validation should check:

* every daily item has an ID;
* IDs are globally unique;
* every item has an expression;
* every item has a meaning;
* every item has one to three examples;
* daily filenames are valid dates;
* item IDs are structurally valid;
* revision files are parseable.

Validation warnings may include:

* duplicate canonical expressions;
* unusually long meanings;
* unusually long notes.

Semantic warnings should not automatically modify content.

---

# 29. Failure Handling

## Daily persistence failure

If writing or validation fails:

* preserve the inbox;
* report the error;
* do not partially clear captured content.

---

## Revision generation failure

If generation fails before a new `today.md` is successfully written:

* preserve the existing revision files where possible;
* avoid losing both `today.md` and `yesterday.md`.

The implementation should write temporary output first and then replace the destination file.

---

## Weekly persistence failure

If weekly persistence fails:

* preserve existing daily files;
* do not partially apply proposed canonical edits;
* report which operation failed.

---

# 30. File Mutation Boundaries

Normal daily workflow may write:

```text
content/english/inbox/current.md
content/english/daily/**
```

Weekly workflow may write:

```text
content/english/weekly/**
content/english/daily/**
```

Revision workflow may write:

```text
content/english/revision/today.md
content/english/revision/yesterday.md
```

Implementation work may modify:

```text
.codex/**
scripts/english/**
```

Normal learning workflows should not modify:

```text
quartz.config.ts
quartz.layout.ts
package.json
other content/**
```

unless explicitly required and requested.

---

# 31. Git and Quartz Sync

Content persistence and repository synchronization remain separate operations.

The English skills should not automatically run:

```bash
npx quartz sync
```

unless the user explicitly asks for synchronization.

This separation allows:

```text
process
↓
review changes
↓
persist
↓
optionally perform additional learning work
↓
sync once
```

This avoids unnecessary commits and pushes.

---

# 32. Recommended Skill Contracts

## `process-english`

Must:

* read the current inbox;
* reason interactively;
* distinguish transcript uncertainty;
* produce concise final items;
* require confirmation;
* preserve raw input until successful persistence;
* avoid automatic sync.

Must not:

* immediately write canonical notes;
* persist long reasoning by default;
* silently correct uncertain transcripts.

---

## `weekly-english-review`

Must:

* read all relevant daily notes;
* perform semantic synthesis;
* support an extended interactive session;
* identify relationships and useful distinctions;
* propose canonical changes where appropriate;
* require confirmation before persistence;
* avoid duplicating full daily notes.

Must not:

* behave as a simple concatenation script;
* automatically rewrite daily knowledge.

---

## `generate-english-revision`

Must:

* use deterministic scheduling;
* reuse canonical content;
* maintain `today.md` and `yesterday.md`;
* behave idempotently;
* require no confirmation.

Must not:

* regenerate explanations with an LLM;
* create permanent revision archives;
* maintain artificial mastery scores.

---

# 33. Suggested Commands

The implementation may eventually expose convenient commands such as:

```bash
npm run english:validate
```

```bash
npm run english:revision
```

The conversational workflows remain agent-driven:

```text
Process today's English.
```

```text
Let's do this week's English review.
```

```text
Generate today's English revision.
```

The exact command names are implementation details.

---

# 34. Implementation Order

Recommended implementation sequence:

## Phase 1 — Content structure

Create:

```text
content/english/inbox
content/english/daily
content/english/weekly
content/english/revision
```

Add initial Markdown templates.

---

## Phase 2 — Canonical parser and validator

Implement:

```text
parser.ts
validate.ts
```

Confirm that canonical daily items can be reliably parsed.

---

## Phase 3 — Revision generator

Implement:

```text
generate-revision.ts
```

This is the most deterministic part and should be completed before the LLM skills depend on it.

---

## Phase 4 — Daily processing skill

Implement:

```text
process-english/SKILL.md
```

Test:

* bold targets;
* expression-only inputs;
* transcript correction;
* multiple processing sessions;
* confirmation behavior.

---

## Phase 5 — Weekly review skill

Implement:

```text
weekly-english-review/SKILL.md
```

Test weekly synthesis and proposed canonical edits.

---

## Phase 6 — Revision skill wrapper

Implement:

```text
generate-english-revision/SKILL.md
```

The skill should invoke the deterministic generator rather than reimplement review logic in a prompt.

---

## Phase 7 — Real usage

Use the system for several weeks before adding complexity.

Potential future changes should be based on observed friction rather than anticipated requirements.

---

# 35. Explicit V1 Decisions

The following decisions are considered finalized for Version 1.

### Storage

* Daily Markdown files are the canonical knowledge source.
* No database is used.
* Stable IDs are stored as invisible HTML comments.

### Daily learning

* Raw capture remains flexible.
* Discussion may be detailed.
* Persisted items remain concise.
* Each item contains one to three examples.
* Existing canonical notes may be improved with confirmation.

### Weekly learning

* Weekly review is interactive.
* Weekly notes are synthesis, not duplication.
* Canonical improvements may be proposed during weekly review.
* Persistence requires confirmation.

### Revision

* Review intervals are `1 / 3 / 7 / 14 / 30 / 60 / 120` days.
* No Hard / Good / Easy feedback exists.
* No review state database exists.
* Revision uses canonical content directly.
* Revision uses direct display rather than quiz UI.
* Only `today.md` and `yesterday.md` are maintained.
* Generation is deterministic and idempotent.

### Operations

* Codex normally runs from the Quartz repository root.
* Learning workflows do not automatically run `npx quartz sync`.

---

# 36. Design Principle for Future Changes

Future features should only be introduced when they solve an observed problem.

Examples:

```text
Problem:
Too many scheduled items are accumulating.

Possible future solution:
Introduce backlog-aware scheduling.
```

```text
Problem:
The user consistently forgets specific expressions.

Possible future solution:
Add lightweight review feedback.
```

```text
Problem:
Voice practice would benefit from direct note access.

Possible future solution:
Add a separate export or integration layer.
```

The project should avoid adding complexity merely because it is technically possible.

The core experience should remain:

```text
capture quickly
→ understand deeply
→ save concisely
→ review lightly
→ synthesize periodically
```
