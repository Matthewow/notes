# English Learning Workflow for Quartz — Requirements

## 1. Overview

This project adds an AI-assisted English learning workflow on top of the existing Quartz notes repository.

The system is intended for daily, long-term language learning based primarily on real expressions encountered in:

* workplace conversations and meetings;
* meeting transcripts, which may contain transcription errors;
* daily life;
* online content;
* other real-world English usage.

The workflow should help the user:

1. capture unfamiliar expressions with minimal friction;
2. understand and discuss them with an AI agent;
3. persist only concise, high-value learning notes;
4. perform a deeper weekly review;
5. generate lightweight daily revision material;
6. access all persisted learning content through Quartz on desktop and mobile.

The system should remain Markdown-first, Git-friendly, portable, and simple enough to maintain without introducing a database in the first version.

---

# 2. Core Design Principles

## 2.1 Markdown is the primary storage format

All canonical learning content must remain human-readable Markdown stored inside the Quartz repository.

The first version must not require:

* SQLite;
* an external database;
* a hosted backend;
* a dedicated web application.

Supporting scripts and lightweight machine-readable state files are allowed when useful.

---

## 2.2 Understanding may be verbose; persisted knowledge should be concise

The interaction between the user and the agent may include detailed reasoning, such as:

* interpretation of context;
* transcript correction;
* alternative meanings;
* usage distinctions;
* grammar explanations;
* comparisons with similar expressions.

These explanations are primarily part of the learning session.

They should not automatically be persisted into the canonical learning note.

The system should follow this principle:

> Analysis can be verbose. Persisted knowledge should be minimal.

---

## 2.3 Revision content should be even more concise

Revision material is intended to reactivate previously learned expressions quickly.

It should not normally repeat:

* detailed reasoning;
* transcript analysis;
* historical discussion;
* long usage explanations.

The default revision unit should contain only:

* the expression;
* a concise meaning;
* one to three useful examples.

---

## 2.4 The user must remain in control of canonical knowledge

Any workflow that creates or materially changes canonical learning content must require user confirmation before persistence.

This applies to:

* new daily learning notes;
* weekly review notes;
* proposed edits to existing daily notes.

Revision files are generated views and do not require confirmation before generation.

---

# 3. Repository Scope

Codex should normally be started from the Quartz repository root.

Example:

```bash
cd /Users/wz/Developer/quartz
codex
```

The repository root is the working directory because the agent may need access to:

* English learning content;
* Codex skills;
* supporting scripts;
* Quartz configuration;
* build commands;
* sync commands.

The primary content ownership boundary is:

```text
content/english/**
```

Normal learning workflows should not modify unrelated Quartz content or framework files.

Supporting implementation may also use directories such as:

```text
.codex/**
scripts/**
```

Changes outside the English learning subsystem should only occur when required for implementation or Quartz integration.

---

# 4. Proposed Directory Structure

```text
quartz/
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
│   └── english-learning/
│       └── config.yaml
│
├── .agents/
│   └── skills/
│       ├── start-english/
│       ├── process-english/
│       ├── weekly-english-review/
│       └── generate-english-revision/
│
└── scripts/
    └── ...
```

Repository skills use the current `.agents/skills` Codex convention.

---

# 5. Data Lifecycle

The intended lifecycle is:

```text
Raw Capture
    ↓
Temporary Inbox
    ↓
Daily Processing Session
    ↓
User Discussion and Refinement
    ↓
User Confirmation
    ↓
Daily Canonical Note
    ↓
    ├── Weekly Review
    │       ↓
    │   Discussion and Refinement
    │       ↓
    │   User Confirmation
    │       ↓
    │   Weekly Note
    │
    └── Daily Revision Generator
            ↓
        yesterday.md
        today.md
```

Weekly review may also identify improvements to older daily notes.

Those changes must be proposed first and only applied after confirmation.

---

# 6. Raw Capture Requirements

## 6.1 Temporary inbox

The default temporary capture location should be:

```text
content/english/inbox/current.md
```

The user may add content throughout the day.

The input format should remain intentionally flexible.

Example:

```markdown
- A: We should probably **double click on** this issue.
- L: I don't want us to **paint ourselves into a corner** here.
- L: **get a read on**
- S: [a longer transcript to scan]
```

The optional labels have these meanings:

* `A:` — the user understands the expression but wants it in active
  vocabulary;
* `L:` — the user wants to learn the meaning or usage;
* `S:` — scan a transcript and extract useful expressions.

The same labels may be used as grouped headings such as `## A`, `## L`, and
`## S`. An unlabeled entry defaults to `L`.

---

## 6.2 Supported input styles

The agent should support:

### Explicit target using Markdown bold

```markdown
- We need to **get a read on** the impact first.
```

The bold section should normally be treated as the learning target.

### Complete sentence without explicit target

```markdown
- I don't want us to paint ourselves into a corner here.
```

The agent may identify the likely useful expression.

### Expression only

```markdown
- paint yourself into a corner
```

### Potentially inaccurate transcript

```markdown
- we should double click this issue
```

The agent should consider whether the transcription may be inaccurate or unnatural.

### Longer transcript scan

An `S:` entry may contain a long transcript. The agent should extract useful,
natural expressions that the user is likely not comfortable producing.

There is no fixed minimum or maximum extraction count. Selection should depend
on expression quality, practical value, and estimated familiarity. The
familiarity estimate should use the user's retained canonical notes and
feedback from the current conversation as evidence. It remains a heuristic
that can be adjusted after more usage.

---

# 7. Daily Processing Skill

Suggested logical skill name:

```text
process-english
```

## 7.1 Purpose

The daily processing skill converts messy captured input into concise canonical learning items.

It should support an interactive learning session before anything is persisted.

---

## 7.2 Responsibilities

For each learning item, the skill should:

1. identify the intended expression;
2. interpret the expression in context;
3. detect likely transcript errors where relevant;
4. explain the meaning to the user;
5. discuss ambiguity when necessary;
6. normalize the expression into a useful canonical form;
7. generate one to three natural examples;
8. prepare a concise proposed canonical note;
9. wait for user confirmation before persistence.

For `A:` items, the explanation should stay short because the user already
understands the meaning. If the source context is too short, at least one
example should be longer and contain enough realistic context to make the
expression easier to understand and reuse.

---

## 7.3 Transcript handling

The agent should not assume transcripts are always correct.

Conceptually, transcript interpretation may have three confidence levels:

### High confidence

The intended phrase is clear.

The agent may normalize obvious transcription issues while explaining what it changed.

### Medium confidence

The agent should present the most likely interpretation and explain why.

### Low confidence

The agent should preserve the uncertainty and discuss the expression with the user before finalization.

Confidence metadata does not need to be persisted in the final Markdown.

---

# 8. Canonical Daily Note Format

Daily notes should be stored by capture date.

Example:

```text
content/english/daily/2026-07-22.md
```

Each file represents expressions captured and finalized on that date.

The default item schema should be intentionally compact.

```markdown
### paint yourself into a corner

**Meaning:** 把自己限制到以后很难调整选择的境地。

**Examples**
- We shouldn't paint ourselves into a corner by committing to this design too early.
- Hardcoding this behavior could paint us into a corner later.
- I don't want to paint myself into a corner before I understand all the options.
```

---

## 8.1 Example count

Each item should contain between one and three examples.

The agent should choose the number based on actual learning value.

Guideline:

* one example for narrow or straightforward usage;
* two or three examples when different contexts or usage patterns are useful;
* never generate additional examples only to reach a fixed count.

Examples should preferably be relevant to the user's likely real-world usage, especially:

* software engineering;
* workplace communication;
* meetings;
* everyday life.

---

## 8.2 Optional notes

A short note may be added when it provides meaningful additional value.

Example:

```markdown
**Note:** Usually used when a decision may unnecessarily limit future flexibility.
```

Notes should not be added by default.

---

## 8.3 Original context

Original context should not automatically be persisted.

It may be retained when:

* the original sentence is especially natural or useful;
* the real-world context materially improves understanding;
* the user explicitly wants to preserve it.

Messy meeting transcript text should normally remain temporary once its meaning has been resolved.

---

# 9. Canonical Expression Normalization

The learning item title should normally use a reusable canonical form rather than blindly preserving the exact inflection encountered.

For example:

```text
paint ourselves into a corner
```

may be stored as:

```text
paint yourself into a corner
```

or another natural dictionary-like form.

Examples may then demonstrate different pronouns or grammatical variations.

Normalization should improve reusability without making the expression unnatural.

---

# 10. Daily Note Edit Policy

Daily notes are stable canonical records, but they are not strictly immutable.

The agent may proactively suggest improvements such as:

* correcting an inaccurate meaning;
* replacing an unnatural canonical form;
* improving examples;
* adding a valuable usage note.

Repeated expressions are valid independent learning occurrences. They should
not be treated as data errors or automatically merged, even when they occur in
the same daily or revision page.

The agent must not silently rewrite existing canonical notes.

Required workflow:

```text
Agent identifies improvement
    ↓
Agent proposes change
    ↓
User reviews
    ↓
User confirms
    ↓
Agent applies change
```

---

# 11. Weekly Review Skill

Suggested logical skill name:

```text
weekly-english-review
```

## 11.1 Purpose

The weekly review is not merely an automated summary.

It is intended to be a longer, systematic learning session performed during the weekend.

The skill should help the user review the week's material at a deeper level.

---

## 11.2 Input

The skill should normally read all daily notes belonging to the target week.

Example:

```text
content/english/daily/2026-07-20.md
content/english/daily/2026-07-21.md
...
```

---

## 11.3 Responsibilities

The weekly review may:

* review all expressions learned during the week;
* identify related expressions;
* notice repeated expressions as a useful learning pattern;
* compare similar expressions;
* identify recurring themes or usage patterns;
* identify expressions worth actively using;
* identify expressions that deserve additional review;
* propose improvements to existing daily notes;
* generate a concise weekly synthesis.

The process should be interactive.

Required workflow:

```text
Read weekly material
    ↓
Generate analysis and observations
    ↓
Discuss with user
    ↓
Refine conclusions
    ↓
Propose weekly note
    ↓
User confirms
    ↓
Persist weekly note
```

---

# 12. Weekly Note Format

Weekly notes should use ISO week naming.

Example:

```text
content/english/weekly/2026-W30.md
```

The weekly note should summarize and organize rather than duplicate all daily content.

A possible structure is:

```markdown
# English Weekly Review — 2026 W30

## Expressions

- get a read on
- paint yourself into a corner
- double-click on something
- blast radius

## Worth Actively Using

- get a read on
- paint yourself into a corner

## Related Expressions

### get a read on / get a sense of / gauge

Short comparison...

## Review Again

- ...
```

The exact sections may vary depending on the week's material.

The weekly note should remain reasonably concise.

---

# 13. Revision Generation Skill

Suggested logical skill name:

```text
generate-english-revision
```

## 13.1 Purpose

Generate lightweight daily revision material from previously learned expressions.

Revision is intended for fast review on mobile or desktop through Quartz.

---

## 13.2 Output files

The skill should maintain exactly two primary generated revision files:

```text
content/english/revision/today.md
content/english/revision/yesterday.md
```

When generating a new revision:

1. copy or move the current `today.md` content into `yesterday.md`;
2. generate the new revision;
3. write it to `today.md`.

This allows the user to recover one missed revision day without accumulating permanent revision archives.

---

## 13.3 Revision format

The first version should use direct display.

No quiz UI or hidden-answer interaction is required.

Example:

```markdown
# Today's Revision

### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**
- Let's get a read on the impact before we roll this out.
- I want to get a read on how the team feels about the change.

---

### paint yourself into a corner

**Meaning:** 把自己限制到以后很难调整选择的境地。

**Examples**
- We shouldn't paint ourselves into a corner too early.
```

The revision view should remain significantly shorter than the original learning discussion.

---

# 14. Review Scheduling

The first version should use a simple deterministic review schedule.

Suggested review intervals after the original capture date:

```text
Day 1
Day 3
Day 7
Day 14
Day 30
Day 60
Day 120
```

The system should not require the user to record:

* Hard;
* Good;
* Easy.

The first version should avoid complex adaptive spaced-repetition algorithms.

---

## 14.1 Additional review selection

The generator may include a small number of older expressions outside the strict schedule to improve long-term recall.

Selection may prioritize:

* expressions not seen recently;
* useful workplace expressions;
* older items;
* items that appear especially important.

The algorithm should remain simple and understandable.

The revision should not become excessively long.

A reasonable default target is approximately 8–15 expressions per day, but the implementation may adjust this based on the amount of available material.

---

# 15. Revision State

Review scheduling metadata should not clutter the visible canonical learning notes.

If machine-readable state is required, it should preferably be maintained separately.

Possible examples include:

```text
content/english/.state/
```

or:

```text
scripts/data/
```

The exact format is an implementation decision.

The first version should keep state minimal.

Because no Hard / Good / Easy feedback exists, the scheduler does not need complex per-item mastery tracking.

---

# 16. Missed Revision Behavior

The existence of `yesterday.md` is intended primarily as a convenience.

A missed revision should not automatically trigger complex rescheduling.

The system does not need to determine whether the user actually completed a revision session.

For the first version:

* `today.md` represents the latest generated revision;
* `yesterday.md` represents the previous generated revision;
* review scheduling continues according to the simple schedule.

---

# 17. Information Density Requirements

Different workflow stages should intentionally have different levels of detail.

| Layer            | Purpose                    | Expected Detail      |
| ---------------- | -------------------------- | -------------------- |
| Inbox            | Raw capture                | Unstructured         |
| Agent discussion | Initial understanding      | Potentially detailed |
| Daily note       | Canonical knowledge        | Compact              |
| Weekly note      | Synthesis and organization | Moderate             |
| Revision         | Fast recall                | Minimal              |

The system should actively avoid unnecessary verbosity in persisted notes.

The agent should not add sections merely because they are easy to generate.

Every persisted piece of information should have a clear learning purpose.

---

# 18. Confirmation Requirements

## Confirmation required

User confirmation is required before:

* creating the finalized daily note;
* materially editing an existing daily note;
* persisting the final weekly review;
* applying weekly-review suggestions to canonical notes.

## Confirmation not required

Confirmation is not required before:

* analyzing the inbox;
* discussing expressions;
* generating a proposed note;
* generating `today.md`;
* rotating `today.md` to `yesterday.md`.

---

# 19. Quartz Integration

All user-facing learning notes should remain valid Quartz-compatible Markdown.

The system should support viewing:

* daily learning notes;
* weekly review notes;
* today's revision;
* yesterday's revision

through the existing Quartz deployment.

The implementation should avoid unnecessary dependencies on Quartz internals.

The learning content should remain usable as plain Markdown even without Quartz.

---

# 20. Sync Workflow

Persistence and Git/Quartz synchronization should be logically separate operations.

The learning skills are responsible primarily for content generation and modification.

After confirmed persistence, the user or agent may run the existing Quartz synchronization workflow, such as:

```bash
npx quartz sync
```

The exact Git push and deployment behavior should follow the existing Quartz repository setup.

The learning system should not introduce a second independent synchronization mechanism.

---

# 21. Voice Mode

Voice-based learning is considered a complementary workflow rather than a core dependency.

Potential future usage includes:

* discussing weekly expressions;
* practicing speaking;
* active recall;
* generating scenarios where the user should naturally use learned expressions.

The first implementation does not need direct integration between:

* ChatGPT Voice;
* the local Quartz repository;
* Codex skills.

The Markdown workflow should remain fully functional without Voice integration.

---

# 22. Out of Scope for Version 1

The following are explicitly out of scope for the first version:

* a dedicated database;
* a web backend;
* a standalone mobile application;
* Hard / Good / Easy ratings;
* FSRS or SM-2;
* automatic mastery scoring;
* quiz UI;
* hidden-answer review UI;
* automatic voice integration;
* automatic modification of canonical notes without confirmation;
* storing every piece of agent reasoning;
* permanent archives of every generated daily revision.

These may be reconsidered after real-world usage.

---

# 23. Required Skills

The workflow should provide four logical skills.

## Skill 1: `process-english`

Purpose:

> Process raw daily English captures through an interactive understanding and confirmation workflow, then persist concise canonical learning items.

Primary input:

```text
content/english/inbox/current.md
```

Primary output:

```text
content/english/daily/YYYY-MM-DD.md
```

---

## Skill 2: `weekly-english-review`

Purpose:

> Conduct an interactive weekly synthesis session using the week's daily notes and persist a confirmed weekly review.

Primary input:

```text
content/english/daily/*.md
```

Primary output:

```text
content/english/weekly/YYYY-Www.md
```

May additionally propose confirmed edits to existing daily notes.

---

## Skill 3: `generate-english-revision`

Purpose:

> Generate concise daily review material using a simple spaced-review schedule.

Primary inputs:

```text
content/english/daily/*.md
```

Primary outputs:

```text
content/english/revision/today.md
content/english/revision/yesterday.md
```

---

## Skill 4: `start-english`

Purpose:

> Show a numbered entry menu so the user can start a common English workflow
> by replying with one number.

The menu should include:

1. process the learning inbox;
2. generate today's revision;
3. start the current weekly review.

Direct requests for any of the three workflows should continue to work.

---

# 24. Success Criteria

The first version is successful if the user can consistently perform the following workflow:

### Daily

1. add raw expressions to `inbox/current.md`;
2. ask Codex to process today's English;
3. discuss unclear items;
4. confirm the final compact content;
5. persist a dated daily note;
6. sync it through Quartz.

### Weekly

1. ask Codex to start the weekly English review;
2. systematically review the week's expressions;
3. discuss patterns and related usage;
4. optionally improve canonical daily notes;
5. confirm and persist the weekly summary.

### Revision

1. ask Codex to generate today's revision;
2. open a stable Quartz page for `today.md`;
3. optionally open `yesterday.md` when the previous day's revision was missed;
4. review concise expressions, meanings, and examples without unnecessary explanation.

The resulting system should feel lightweight enough to use every day while remaining structured enough to support long-term learning.
