---
name: generate-english-revision
description: Generate or update Quartz English revision/today.md and revision/yesterday.md by invoking the deterministic spaced-review script. Use for requests such as "generate today's English revision", "update my revision", or generation for an explicit YYYY-MM-DD date. Do not rewrite meanings or examples with an LLM and do not ask for confirmation.
---

# Generate English Revision

Work from the Quartz repository root. Delegate parsing, scheduling,
supplemental selection, rendering, idempotency, and rotation to the
deterministic implementation.

## Run

For today's Toronto date:

```bash
npm run english:revision
```

For an explicit date:

```bash
npm run english:revision -- --date YYYY-MM-DD
```

Use `--dry-run` only when the user asks to preview without writing.

## Report

Report:

- the revision date;
- scheduled item count;
- supplemental item count;
- whether rotation occurred;
- validation or configuration errors.

Do not ask for confirmation. Revision files are generated views. Do not
manually regenerate language, modify canonical daily notes, add review state,
or create revision archives.

If validation fails, surface the precise diagnostics and leave existing
revision files unchanged. Never run `npx quartz sync` unless the user
separately requests it.
