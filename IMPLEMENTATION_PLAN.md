# English Learning Workflow — Implementation Plan

## 1. Goal

Implement the Version 1 workflow defined by `REQUIREMENTS.MD` and `DESIGN.MD`:

- capture raw English with low friction;
- use Codex for language interpretation and discussion;
- persist concise daily and weekly Markdown only after user confirmation;
- generate deterministic daily revision pages;
- keep daily Markdown files as the canonical source of truth;
- publish approved learning content through the existing Quartz site;
- avoid a database, review scores, adaptive scheduling, and automatic Git sync.

This plan is based on the repository state on 2026-07-22.

## 2. Repository Findings That Affect the Design

1. This repository uses Quartz 5 and `quartz.config.yaml`, not the older
   `quartz.config.ts` and `quartz.layout.ts` files mentioned in the design's
   mutation-boundary examples.
2. The official current Codex repository skill location is
   `.agents/skills/<skill-name>/SKILL.md`. The proposed `.codex/skills`
   location should not be used.
3. The repository already has Node 22+, TypeScript, `tsx`, the Node test
   runner, Prettier, and the `yaml` package. No new runtime dependency is
   needed.
4. `scripts/**/*.ts` is not included in the current root `tsconfig.json`.
   English scripts need their own TypeScript configuration and must be added
   to the repository's check command.
5. The Article Title plugin is enabled. It renders frontmatter `title` as an
   H1. Adding the sample Markdown H1 would render a duplicate page title.
6. `origin` is the public `Matthewow/notes` GitHub repository. The `v5`
   branch deploys `content/**` to public GitHub Pages. The user has accepted
   manual selection of inbox content as the privacy boundary.
7. There is no existing `content/english`, `.agents/skills`, or
   `scripts/english` implementation to migrate.

## 3. Confirmed Implementation Decisions

Task `ENG-001` was completed on 2026-07-22. The following decisions are
accepted for Version 1.

### D1 — Privacy and publication boundary

**Decision:** Manual selection is the privacy boundary. The user will paste
only the selected work-related text that they intend to store in this
repository. The implementation will not make the inbox local-only, add a
special Git-ignore rule, or block publication.

The skills should still avoid expanding selected text with invented company,
customer, project, credential, or internal URL details.

### D2 — Default language for meanings

**Issue:** The examples use Simplified Chinese meanings, but neither source
document explicitly sets the language.

**Decision:** Default `**Meaning:**` text to Simplified Chinese. Allow the
user to request English or bilingual meanings for a specific item.

### D3 — Page title format

**Issue:** Frontmatter `title` plus a Markdown H1 produces two visible H1
headings with the current Quartz configuration.

**Decision:** Keep frontmatter `title` and omit the Markdown H1 from daily,
weekly, and revision files. The item headings remain H3 as designed. This
gives one visible H1 in Quartz.

### D4 — Partial inbox processing

**Issue:** The inbox is intentionally unstructured, but "clear successfully
processed content" could mean either an all-or-nothing batch or selected
items.

**Decision:** Process the current inbox as one complete batch. If any item is
unfinished, leave the conversation and inbox in place and resume later. Write
the daily note and clear the inbox only after all current items are understood
and the user confirms the complete proposal.

### D5 — Supplemental exclusion of yesterday's items

**Issue:** Revision output must not contain hidden item IDs, but reliable
identity matching against `yesterday.md` would require IDs or separate state.

**Decision:** Use normalized expression text for a best-effort exclusion. Do
not add state or expose IDs in revision files. Scheduled items still take
priority and may repeat.

### D6 — Empty revision day

**Issue:** Output behavior is not defined when no scheduled or supplemental
items exist.

**Decision:** Generate a valid dated `today.md` containing
`No items are scheduled for review today.` This keeps the stable Quartz URL
working and makes successful generation clear.

### D7 — Multi-file atomicity

**Issue:** A portable filesystem cannot guarantee a fully atomic transaction
across a weekly note and several daily notes. A crash can occur between file
renames. A strict guarantee would require a journal or database, which is
against the intended V1 simplicity.

**Decision:** Accept transaction-like best effort:

1. build all candidate files in memory;
2. validate the complete candidate data set before writing;
3. write temporary files in the destination directories;
4. keep backups of existing content;
5. rename files and roll back on an ordinary write error.

This protects against expected failures. It does not claim power-loss-safe
atomicity across multiple files.

### D8 — Retaining useful original context

**Issue:** The requirements allow useful original context to be retained, but
the canonical parser contract has no `Context` field.

**Decision:** Do not add another V1 field. If the original sentence is
natural and useful, preserve it as one of the item's one to three examples. If
context is essential but the raw sentence is unsuitable, summarize the
learning value in the optional single-line `**Note:**`. Do not persist a messy
transcript only for historical completeness.

## 4. Locked V1 Rules

These rules are already clear in the source documents and do not need another
decision:

- `content/english/daily/YYYY-MM-DD.md` is the canonical knowledge source.
- Dates default to the current date in `America/Toronto`.
- Date arithmetic uses ISO calendar dates, not elapsed 24-hour periods, so
  daylight-saving changes do not affect scheduling.
- ISO weeks run Monday through Sunday.
- Stable item IDs never change after creation.
- Review intervals are `1, 3, 7, 14, 30, 60, 120` days.
- All genuinely scheduled items are included, even when the result exceeds
  the target maximum.
- Supplemental selection is deterministic for a revision date.
- Revision generation reuses canonical wording and examples. It does not ask
  an LLM to rewrite them.
- Same-day revision regeneration does not rotate files.
- Only the latest two generated revision views are kept.
- Daily and weekly canonical persistence requires clear user confirmation.
- Revision generation does not require confirmation.
- English workflows never run `npx quartz sync` unless the user separately
  requests it.

## 5. Target File Layout

The final layout should be:

```text
quartz/
├── .agents/
│   └── skills/
│       ├── process-english/
│       │   └── SKILL.md
│       ├── weekly-english-review/
│       │   └── SKILL.md
│       └── generate-english-revision/
│           └── SKILL.md
├── .codex/
│   └── english-learning/
│       └── config.yaml
├── content/
│   └── english/
│       ├── index.md
│       ├── inbox/
│       │   └── current.md
│       ├── daily/
│       │   └── YYYY-MM-DD.md
│       ├── weekly/
│       │   └── YYYY-Www.md
│       └── revision/
│           ├── today.md
│           └── yesterday.md
├── scripts/
│   └── english/
│       ├── generate-revision.ts
│       ├── next-id.ts
│       ├── validate.ts
│       ├── tsconfig.json
│       ├── lib/
│       │   ├── config.ts
│       │   ├── date.ts
│       │   ├── diagnostics.ts
│       │   ├── files.ts
│       │   ├── ids.ts
│       │   ├── parser.ts
│       │   ├── render.ts
│       │   ├── review.ts
│       │   └── types.ts
│       └── test/
│           ├── config.test.ts
│           ├── ids.test.ts
│           ├── parser.test.ts
│           ├── review.test.ts
│           ├── generator.test.ts
│           └── fixtures/
├── IMPLEMENTATION_PLAN.md
├── package.json
└── quartz.config.yaml
```

## 6. Executable Tasks

### ENG-001 — Confirm the open requirements

**Depends on:** Nothing

**Work:**

1. Keep the accepted D1, D4, D5, and D6 decisions and resolve D2, D3, D7,
   and D8.
2. Record the accepted choices in this file under `Decision Record`.
3. Update any affected examples in `REQUIREMENTS.MD` and `DESIGN.MD` so the
   implementation documents do not disagree.

**Acceptance criteria:**

- Every decision has an explicit value.
- The public/private boundary is unambiguous.
- No implementation task depends on an unresolved behavior.

### ENG-002 — Add privacy-safe content scaffolding

**Depends on:** ENG-001

**Files:**

- `content/english/index.md`
- `content/english/inbox/current.md`
- `content/english/revision/today.md`
- `content/english/revision/yesterday.md`

**Work:**

1. Create the English landing page with links to today's revision,
   yesterday's revision, daily notes, and weekly notes.
2. Create the inbox with the standard empty heading.
3. Create valid initial revision pages. Use the D6 empty-state format.
4. Do not add sample workplace content to the scaffold.
5. Keep frontmatter compatible with the enabled Quartz plugins.

**Acceptance criteria:**

- The English landing page and both revision URLs render.
- Each rendered page has one H1, not a duplicated title.
- The scaffold contains no real or sample workplace transcript.

### ENG-003 — Add configuration, core types, and date utilities

**Depends on:** ENG-001

**Files:**

- `.codex/english-learning/config.yaml`
- `scripts/english/lib/config.ts`
- `scripts/english/lib/date.ts`
- `scripts/english/lib/types.ts`
- `scripts/english/lib/diagnostics.ts`
- `scripts/english/tsconfig.json`
- `scripts/english/test/config.test.ts`

**Work:**

1. Add the Version 1 configuration from the design.
2. Parse YAML with the already installed `yaml` package.
3. Validate the configuration at runtime:
   - supported config version;
   - valid IANA timezone;
   - non-empty relative paths;
   - positive, unique, ascending review intervals;
   - `target_min_items <= target_max_items`;
   - non-negative supplemental minimum age.
4. Reject configured paths that escape the repository root.
5. Implement strict `YYYY-MM-DD` parsing and real calendar-date validation.
6. Implement Toronto "today" calculation.
7. Implement ISO date addition, day difference, and ISO week boundaries using
   UTC calendar math.
8. Define typed errors, warnings, and CLI exit behavior.

**Acceptance criteria:**

- Invalid dates such as `2026-02-30` are rejected.
- DST transitions do not produce an off-by-one review date.
- Invalid or unsafe configuration fails before any write.
- Unit tests cover valid config, each invalid field, and date boundaries.

### ENG-004 — Implement stable item ID generation

**Depends on:** ENG-003

**Files:**

- `scripts/english/lib/ids.ts`
- `scripts/english/next-id.ts`
- `scripts/english/test/ids.test.ts`

**Work:**

1. Define one slug algorithm:
   - Unicode normalize;
   - lowercase;
   - remove apostrophes;
   - replace other non-ASCII alphanumeric runs with `-`;
   - trim repeated or edge hyphens;
   - use `item` if no usable characters remain.
2. Generate `YYYY-MM-DD-{slug}`.
3. Check IDs globally, not only in the target daily file.
4. Resolve collisions with `-2`, `-3`, and so on.
5. Expose `next-id.ts --date YYYY-MM-DD --expression "..."`.
6. Never recalculate the ID of an existing item during an edit.

**Acceptance criteria:**

- Repeated expressions on one date get stable numeric suffixes.
- Existing IDs in another file also prevent a collision.
- Apostrophes, punctuation, extra spaces, and empty slugs have tests.
- The CLI prints one ID on success and performs no file writes.

### ENG-005 — Implement the canonical Markdown parser

**Depends on:** ENG-003, ENG-004

**Files:**

- `scripts/english/lib/parser.ts`
- `scripts/english/test/parser.test.ts`
- parser fixtures

**Work:**

1. Parse only date-named daily files as canonical notes.
2. Parse YAML frontmatter without treating it as learning content.
3. Implement the item boundary contract:
   - an `english-item-id` HTML comment starts an item;
   - blank lines between the ID and H3 are allowed;
   - the next ID comment or end of file ends the item;
   - `---` separators are optional.
4. Parse one H3 expression, one single-line meaning, one to three Markdown
   list examples, and an optional single-line note.
5. Preserve the source file and captured date in the parsed item.
6. Return structured diagnostics with file and line numbers.
7. Parse revision frontmatter and visible items separately because revision
   items intentionally have no IDs.

**V1 format limits:**

- Meanings and notes are single-line fields.
- Examples are single Markdown bullet lines.
- H4 or deeper headings inside an item are not supported.
- Unknown content inside a canonical item is an error, not silently ignored.

**Acceptance criteria:**

- Whitespace variations described in the design parse successfully.
- Missing fields, duplicate fields, malformed item boundaries, and too many
  examples produce precise diagnostics.
- Text outside an item does not become canonical learning data.
- Revision parsing does not require or invent item IDs.

### ENG-006 — Implement repository-wide validation

**Depends on:** ENG-005

**Files:**

- `scripts/english/validate.ts`
- validation tests and fixtures

**Work:**

1. Validate every date-named daily file.
2. Report errors for:
   - invalid daily filenames;
   - missing or malformed IDs;
   - globally duplicate IDs;
   - missing expressions or meanings;
   - zero or more than three examples;
   - malformed frontmatter;
   - malformed revision files.
3. Report warnings for:
   - normalized duplicate expressions;
   - unusually long meanings or notes;
   - an item ID date prefix different from its source filename.
4. Use exit code `0` for success with or without warnings and `1` for errors.
5. Make output concise and actionable.

**Acceptance criteria:**

- Cross-file duplicate IDs fail validation.
- Warnings do not modify Markdown or fail the command.
- Validation is read-only.
- `npx tsx scripts/english/validate.ts` works from the repository root.

### ENG-007 — Implement deterministic review selection

**Depends on:** ENG-003, ENG-005

**Files:**

- `scripts/english/lib/review.ts`
- `scripts/english/test/review.test.ts`

**Work:**

1. Select every item whose capture age matches a configured interval.
2. Never select future-dated items.
3. If scheduled count is below the target minimum, build supplemental
   candidates that:
   - meet the minimum age;
   - are not already scheduled;
   - preferably did not appear yesterday.
4. Apply D5 matching for yesterday.
5. Rank supplemental candidates with a stable hash of
   `revisionDate + itemId`.
6. Add supplements only until `target_min_items` is reached or candidates are
   exhausted.
7. Sort scheduled items by capture date and item ID. Append supplemental
   items in deterministic hash order.
8. Include all scheduled items even when their count is above the target
   maximum. Treat the maximum as a warning threshold, not a cap.

**Acceptance criteria:**

- The schedule example in `DESIGN.MD` passes exactly.
- Repeated runs for the same date return the same IDs and order.
- Different dates rotate supplemental candidates.
- Yesterday exclusion never removes a genuinely scheduled item.
- Fewer than eight available items produces a smaller valid result.
- More than fifteen scheduled items retains every scheduled item.

### ENG-008 — Implement revision rendering and safe rotation

**Depends on:** ENG-006, ENG-007

**Files:**

- `scripts/english/lib/render.ts`
- `scripts/english/lib/files.ts`
- `scripts/english/generate-revision.ts`
- `scripts/english/test/generator.test.ts`

**Work:**

1. Add CLI options:
   - `--date YYYY-MM-DD` for deterministic runs and tests;
   - `--dry-run` to print the candidate without writing;
   - no argument to use today's Toronto date.
2. Validate all canonical notes before generating output.
3. Copy the expression, meaning, and examples directly from the canonical
   item. Omit optional notes from the default minimal revision view. Do not
   use LLM-generated revision text.
4. Exclude hidden IDs and internal metadata from visible revision items.
5. Render frontmatter with `title`, `revisionDate`, and `generated: true`.
6. Apply D3 to avoid a duplicate H1.
7. Apply D6 when selection is empty.
8. Implement idempotency:
   - same `revisionDate`: replace `today.md` only;
   - older `revisionDate`: convert the previous `today.md` to
     `yesterday.md`, preserving its date and changing its title;
   - future or malformed `revisionDate`: abort without mutation.
9. Prepare and validate all output before replacement.
10. Write temporary files in the target directory, rename them into place,
    and restore backups on an ordinary failure.
11. Print the revision date, scheduled count, supplemental count, and whether
    rotation occurred.
12. Print a warning, without dropping items, when the scheduled count exceeds
    `target_max_items`.

**Acceptance criteria:**

- The first generation, same-day rerun, next-day rotation, and multi-day gap
  scenarios pass.
- A same-day rerun never overwrites the real previous revision.
- A failed generation preserves the existing `today.md` and `yesterday.md`.
- `yesterday.md` keeps the previous generated date.
- No output contains an `english-item-id`.
- `--dry-run` changes no files.

### ENG-009 — Add package commands and CI type coverage

**Depends on:** ENG-006, ENG-008

**Files:**

- `package.json`
- `scripts/english/tsconfig.json`

**Work:**

1. Add:
   - `english:validate`;
   - `english:revision`;
   - `english:next-id`;
   - `english:test`;
   - `english:typecheck`.
2. Use these command definitions:

   ```json
   {
     "english:validate": "tsx scripts/english/validate.ts",
     "english:revision": "tsx scripts/english/generate-revision.ts",
     "english:next-id": "tsx scripts/english/next-id.ts",
     "english:test": "tsx --test scripts/english/test/*.test.ts",
     "english:typecheck": "tsc -p scripts/english/tsconfig.json --noEmit"
   }
   ```

3. Extend the existing `check` script with `npm run english:typecheck`.
4. Keep the existing repository-wide `test` behavior.
5. Do not add dependencies unless implementation proves an existing package
   insufficient.

**Acceptance criteria:**

- `npm run english:typecheck` passes.
- `npm run english:test` passes.
- `npm run english:validate` passes on the scaffold.
- `npm run english:next-id -- --date 2026-07-22 --expression "get a read on"`
  prints a valid ID without writing a file.
- `npm run check` covers English scripts.
- `package-lock.json` remains unchanged unless a dependency is explicitly
  approved.

### ENG-010 — Implement the `process-english` skill

**Depends on:** ENG-002, ENG-004, ENG-006, ENG-009

**Files:**

- `.agents/skills/process-english/SKILL.md`

**Work:**

1. Add valid `name` and trigger-focused `description` frontmatter.
2. Define the five stages: parse, understand, discuss, propose, persist.
3. Make the no-write-before-confirmation boundary explicit.
4. Handle:
   - bold targets;
   - full sentences without a target;
   - expression-only entries;
   - attached context;
   - high, medium, and low transcript confidence.
5. Apply D2 to meanings and generate one to three useful examples.
6. Apply D8 when original context has lasting learning value.
7. Check existing canonical notes for duplicates before proposing a new item.
8. After confirmation:
   - allocate IDs with `next-id.ts`;
   - create or append to the correct daily file;
   - preserve existing IDs during edits;
   - run validation;
   - clear the inbox only after the complete batch is confirmed, written,
     and validated according to D4.
9. If validation or persistence fails, keep the inbox and undo only changes
   made by this workflow.
10. Never run Git sync.
11. Include compact canonical templates, confirmation examples, and
    non-confirmation examples in the skill.

**Acceptance criteria:**

- Analysis and proposals do not modify files.
- "Looks good", "Save it", and equivalent clear approval persist the final
  proposal without asking for ritual approval again.
- A request for explanation or a changed example does not count as approval.
- Multiple sessions append safely to one date file.
- An obvious duplicate is proposed as a merge, not silently added.
- A failed validation leaves raw input available.
- Manual scenarios in section 7 pass.

### ENG-011 — Implement the `weekly-english-review` skill

**Depends on:** ENG-006, ENG-009, ENG-010

**Files:**

- `.agents/skills/weekly-english-review/SKILL.md`

**Work:**

1. Add valid skill metadata and weekly-review triggers.
2. Default to the current Toronto ISO week and accept an explicit week.
3. Read only date files inside the target Monday-to-Sunday range.
4. Guide the session in stages:
   - overview;
   - important clusters;
   - useful distinctions;
   - active-vocabulary candidates;
   - possible canonical corrections.
5. Keep daily-note edits and the weekly synthesis as separately reviewable
   proposals.
6. Require confirmation for the weekly note and separately require
   confirmation for material daily-note edits.
7. Preserve stable IDs through all edits.
8. Apply D7 when writing multiple files.
9. Validate the complete result and roll back ordinary write failures.
10. Never concatenate every daily item into the weekly note and never run
    Git sync.

**Acceptance criteria:**

- A weekly review can run with a partial week.
- Missing days are not treated as errors.
- An empty week produces a no-content report and no weekly file unless the
  user explicitly asks to persist one.
- The weekly note adds synthesis instead of copying full daily entries.
- Unconfirmed daily edits are never applied.
- Manual scenarios in section 7 pass.

### ENG-012 — Implement the `generate-english-revision` skill

**Depends on:** ENG-008, ENG-009

**Files:**

- `.agents/skills/generate-english-revision/SKILL.md`

**Work:**

1. Add valid skill metadata and revision-generation triggers.
2. Invoke `npm run english:revision --` rather than implementing scheduling
   in prompt instructions.
3. Report date, item counts, and rotation status.
4. Surface validation errors without trying to repair canonical semantics
   automatically.
5. Do not ask for confirmation and do not run Git sync.

**Acceptance criteria:**

- The skill delegates all selection and rotation to deterministic code.
- Repeated invocation on one date is idempotent.
- The skill does not rewrite meanings or examples.

### ENG-013 — Run automated and Quartz integration verification

**Depends on:** ENG-002 through ENG-012

**Work:**

1. Run:

   ```bash
   npm run english:typecheck
   npm run english:test
   npm run english:validate
   npm run check
   npm test
   npx quartz build
   ```

2. Inspect generated English pages.
3. Confirm item ID comments are not present in revision output.
4. Confirm direct links work on desktop-sized and mobile-sized layouts.
5. Confirm no unrelated Quartz content or framework files changed.

**Acceptance criteria:**

- All commands pass.
- Daily, weekly, today, and yesterday pages are readable in the Quartz build.
- There are no duplicate visible page titles.
- The final diff stays within the approved files.

### ENG-014 — Complete a real workflow pilot

**Depends on:** ENG-013

**Work:**

1. Capture at least four forms of input:
   - bold target;
   - sentence without a target;
   - expression only;
   - uncertain transcript.
2. Complete a confirmed daily persistence session.
3. Run a second session on the same date.
4. Generate revision on at least two simulated dates with `--date`.
5. Complete one weekly review using fixture or real approved content.
6. Record observed friction without adding new features immediately.

**Acceptance criteria:**

- The success criteria in `REQUIREMENTS.MD` can be completed end to end.
- Any remaining issue is documented with reproduction steps.
- Version 1 is not expanded with adaptive scoring, a database, a quiz UI, or
  automatic sync during the pilot.

## 7. Manual Skill Scenario Matrix

Prompt-driven semantic behavior cannot be fully proven by unit tests. Run
these manual scenarios before declaring the skills complete.

| ID  | Scenario                                   | Expected result                                                       |
| --- | ------------------------------------------ | --------------------------------------------------------------------- |
| P1  | Bold expression in a natural sentence      | Bold text is the default target                                       |
| P2  | Full sentence with no bold text            | Skill identifies and explains the likely useful expression            |
| P3  | Expression-only bullet                     | Skill accepts it without requiring a sentence                         |
| P4  | High-confidence transcript error           | Skill explains the normalization and proposes the natural form        |
| P5  | Medium-confidence transcript               | Skill presents the likely interpretation and relevant uncertainty     |
| P6  | Low-confidence transcript                  | Skill pauses canonical finalization for discussion                    |
| P7  | User asks for more explanation             | No canonical file is written                                          |
| P8  | User clearly approves final proposal       | Skill persists without asking for duplicate approval                  |
| P9  | One item remains unfinished                | No batch is persisted or cleared; the session can resume later        |
| P10 | Duplicate expression already exists        | Skill proposes reuse, edit, or merge                                  |
| P11 | Validation fails after a proposed write    | Inbox remains available and partial canonical changes are rolled back |
| W1  | Current week has several daily files       | Review covers Monday through Sunday files that exist                  |
| W2  | Current week has no daily files            | No weekly note is created by default                                  |
| W3  | Review finds a bad daily example           | Change is proposed and waits for separate confirmation                |
| W4  | Weekly synthesis repeats all daily content | Skill trims it to relationships, priorities, and distinctions         |
| R1  | Revision generated twice on one date       | Today is regenerated; yesterday is unchanged                          |
| R2  | Revision generated after missed days       | Previous generated view becomes yesterday; no archives are created    |

## 8. Known Limits Accepted for Version 1

1. Supplemental yesterday exclusion can be imperfect after a canonical
   expression heading is edited because revision files do not carry IDs.
2. Meaning quality, transcript correction, duplicate semantics, and weekly
   synthesis need human review. Deterministic validation cannot prove them.
3. Multi-file persistence is protected with validation, temporary files, and
   rollback, but is not a database-grade transaction across a machine crash.
4. Scheduled load is not capped. A high-volume capture day can cause a later
   revision to contain more than fifteen items.
5. The workflow does not know whether a revision was actually completed.
6. Processing an old inbox defaults to today's Toronto date unless the user
   supplies the intended capture date.
7. All selected inbox and canonical text can be public. Manual content
   selection remains the privacy control.

## 9. Definition of Done

Version 1 is complete when:

- ENG-001 through ENG-014 are accepted;
- all automated checks and manual scenarios pass;
- the three skills are discoverable from the repository root;
- inbox content follows the accepted manual-selection privacy policy;
- canonical notes are only written after confirmation;
- revision generation is deterministic, idempotent, and safe to rerun;
- approved English content renders through Quartz on desktop and mobile;
- no database, adaptive scheduling, quiz UI, voice integration, revision
  archive, or automatic sync has been added.

## 10. Decision Record

Fill this section during ENG-001.

| Decision                    | Accepted value                                      | Date       |
| --------------------------- | --------------------------------------------------- | ---------- |
| D1 Privacy and publication  | Manual selection; normal tracked/public workflow    | 2026-07-22 |
| D2 Meaning language         | Simplified Chinese by default                       | 2026-07-22 |
| D3 Page title format        | Frontmatter title; omit Markdown H1                 | 2026-07-22 |
| D4 Partial inbox processing | Complete-batch processing                           | 2026-07-22 |
| D5 Yesterday matching       | Normalized expression; best effort                  | 2026-07-22 |
| D6 Empty revision day       | Generate a dated empty-state page                   | 2026-07-22 |
| D7 Multi-file atomicity     | Validated temporary files with best-effort rollback | 2026-07-22 |
| D8 Original context         | Reuse as example or summarize in optional note      | 2026-07-22 |

## 11. Implementation Status — 2026-07-22

- ENG-001: Complete.
- ENG-002 through ENG-013: Implemented and verified.
- ENG-014: Pending the first real inbox and weekly-review pilot.

Verification completed:

- `npm run english:typecheck` passed.
- `npm run english:test` passed 31 tests.
- `npm test` passed all 140 repository tests.
- `npm run english:validate` passed with zero errors and warnings.
- Stable-ID and revision CLIs passed smoke tests.
- All three installed skills passed `quick_validate.py`.
- The Quartz production build completed and rendered the English landing,
  inbox, today, and yesterday pages with one visible H1 each.

`npm run check` completed both TypeScript stages, but its repository-wide
Prettier stage still reports the pre-existing files `content/index.md`,
`REQUIREMENTS.MD`, and `DESIGN.MD`. All files created or modified by the
English implementation pass a targeted Prettier check.
