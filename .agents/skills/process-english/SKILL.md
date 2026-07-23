---
name: process-english
description: Process the complete Quartz English inbox through interactive explanation, transcript correction, normalization, and user confirmation, then save concise canonical daily Markdown. Use for requests such as "process today's English", "process my English inbox", "let's go through today's expressions", or later edits to existing canonical English items. Do not use for weekly synthesis or deterministic revision generation.
---

# Process English

Work from the Quartz repository root. Treat
`content/english/daily/*.md` as canonical knowledge and
`content/english/inbox/current.md` as temporary input.

## Workflow

1. Read `.codex/english-learning/config.yaml`, the complete inbox, and
   relevant daily notes.
2. If the inbox has no captured entries, report that and stop.
3. Identify candidates:
   - prefer bold Markdown as the target;
   - otherwise inspect the full sentence;
   - accept expression-only bullets;
   - associate indented context with its top-level bullet.
4. Discuss every candidate before editing files:
   - identify the likely natural expression;
   - explain its contextual meaning;
   - call out likely transcript corrections;
   - distinguish important alternatives;
   - normalize it to a reusable canonical form.
5. State uncertainty:
   - high confidence: explain an obvious normalization;
   - medium confidence: give the likely interpretation and reason;
   - low confidence: resolve it with the user before proposing final content.
6. Check all canonical daily notes for identical or semantically equivalent
   items. Propose reuse, correction, or merging instead of silently adding a
   duplicate.
7. Present one complete proposal for the entire inbox. Do not modify files
   yet.

## Canonical proposal

Default meanings to concise Simplified Chinese unless the user requests
another language. Use one to three natural examples. Make each example a
complete, slightly longer sentence with enough context to clarify how the
expression is used. Prefer software, workplace, meeting, or everyday contexts
when useful.

```markdown
### get a read on

**Meaning:** 对某件事情形成一个大致了解或判断。

**Examples**

- Let's get a read on the impact before we roll this out.
- I want to get a read on how the team feels.
```

Add a single-line `**Note:**` only when it adds important usage information.
If an original sentence is natural and valuable, reuse it as an example. If
its context matters but the wording is unsuitable, summarize the learning
point in the note. Do not preserve messy transcript history by default.

## Confirmation boundary

Do not write canonical content until the user clearly approves the complete
proposal. "Looks good", "save it", "persist it", "confirm", and equivalent
language count as approval. A question, requested explanation, correction, or
partial discussion does not.

Process the inbox as one batch. If any item remains unfinished, leave both the
inbox and canonical files unchanged so the conversation can resume later.

## Persist after confirmation

1. Use the explicit target date when supplied; otherwise use the current date
   in `America/Toronto`.
2. Create or append to `content/english/daily/YYYY-MM-DD.md`.
3. For a new daily file, use frontmatter without a Markdown H1:

   ```markdown
   ---
   title: English — 2026-07-22
   date: 2026-07-22
   tags:
     - english
     - learning
   ---
   ```

4. Allocate each new stable ID:

   ```bash
   npm run english:next-id -- --date YYYY-MM-DD --expression "expression"
   ```

5. Store the ID immediately before its item:

   ```markdown
   <!-- english-item-id: YYYY-MM-DD-expression-slug -->
   ```

6. Preserve an existing ID when editing its heading, meaning, examples, or
   note.
7. Apply the complete confirmed daily change, but do not clear the inbox yet.
8. Run `npm run english:validate`.
9. If validation fails, restore the daily file to its prior content, keep the
   inbox unchanged, and report the error.
10. After validation succeeds, reset the inbox to:

    ```markdown
    ---
    title: Current English Inbox
    ---
    ```

Never run `npx quartz sync` unless the user separately requests it.

## Editing existing canonical items

Show the current item and the proposed replacement. Wait for confirmation,
apply the edit without changing its ID, then validate. Never silently rewrite
canonical knowledge.
