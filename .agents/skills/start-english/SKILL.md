---
name: start-english
description: Show a numbered menu for the Quartz English learning workflows, report their current status, and route a one-number choice to the correct skill. Use when the user sends "English", asks to start English learning or show the English menu, or replies 1, 2, or 3 to a menu shown earlier. Do not use when the user directly requests one specific English workflow.
---

# Start English

Work from the Quartz repository root.

## Show the menu

When the user has not already supplied a clear choice:

1. Read `.codex/english-learning/config.yaml`.
2. Determine today's date and ISO week in the configured timezone.
3. Inspect:
   - the inbox after frontmatter;
   - `content/english/revision/today.md` and its `revisionDate`;
   - `content/english/weekly/YYYY-Www.md` for the current ISO week.
4. Show this compact menu with real status values:

   ```text
   English — YYYY-MM-DD

   1. Process learning inbox — ready / empty
   2. Generate today's revision — up to date / last generated YYYY-MM-DD
   3. Weekly review — YYYY-Www ready / not created

   Reply 1, 2, or 3.
   ```

Do not process or write anything before the user chooses. Do not ask for
information that the status inspection can determine.

## Route the choice

If the invocation already includes one unambiguous menu number, skip the menu
and route immediately.

- `1`: Read and follow `.agents/skills/process-english/SKILL.md`.
- `2`: Read and follow
  `.agents/skills/generate-english-revision/SKILL.md`.
- `3`: Read and follow
  `.agents/skills/weekly-english-review/SKILL.md` for the current ISO week.

Use the selected skill's confirmation rules. In particular, option 2 runs
without a second confirmation, while options 1 and 3 retain their interactive
confirmation boundaries.

Direct requests such as "process my English inbox," "generate today's English
revision," or "review this week's English" should continue to use their
specific skills without showing this menu.
