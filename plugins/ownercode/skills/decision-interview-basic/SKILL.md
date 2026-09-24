---
name: decision-interview-basic
description: Use after the founder has described their business and before writing the data model in docs/plan-v1.md. Asks the two contact-shape questions that are expensive to change later.
---

# Decision interview, basic

Two questions, asked before any table is created.

Both are cheap to answer now and expensive to change once real customer data
exists. Both are questions the founder does not know to ask, because they sound
like technical detail and are actually a decision about their business.

## When to run this

After Phase 1 of the start prompt, when you know what the business does and
what a record is for them. Before Phase 2, where the plan names the tables.

Do not run it after a migration has already created the contact tables. At that
point these stop being questions and become a job of moving data.

Skip it when the owner is building a website only, with no customer records. There
is no contact table to shape.

## How to ask

Read the two files in `entries/`, in this order:

1. `person-or-company-primary.md`
2. `contact-fields-vs-table.md`

For each one, ask through the question tool (AskUserQuestion), never as loose
prose. If the question tool errors or is missing (Codex has none outside Plan mode),
ask the same question in your reply as a short numbered list with lettered options,
the recommended one first and marked, and wait for the answer. Never ask the owner to
allow or approve a tool.

- Offer every option the entry lists. Do not trim the list to look tidy.
- Put the entry's `default` first, and mark it as the recommendation. If what the
  owner already told you shows their business is not the typical one the default
  was written for, recommend the option that fits them instead, put it first, and
  say why in one line. A gym whose members all pay for themselves is one example:
  "Person only" fits it better than a list of people and companies.
- Use an example from the owner's own trade in the question, not the entry's
  landlord or plumber, when theirs is different.
- Give each option a one-line consequence, taken from its **Costs you later**
  line. That line is the whole reason the question is worth asking.
- If the founder picks the default, that is a real answer, not a skipped
  question. Record it the same way.

Ask them one at a time, in the order above. The second question reads
differently once the first is answered.

## What to do with the answers

Write them into `docs/data-model.md`, creating that file if it does not exist:

```markdown
## Decisions

### <the question>
**Entry:** `<the entry's id, from its file>`
**Answer:** `<option key>`
**Why:** <the founder's words, or the entry's reason if they took the default>
**Decided:** <date>

## Build details
Anything an entry's notes say to write down, one short heading per entry.
```

Do not build anything yet. At this point the project does not exist: there is
no `migrations/` folder and no database. The answers wait in `docs/data-model.md`,
and Phase 3's first migration reads them from there, following each entry's
`## Notes for the agent`.

Some of those notes point at questions this skill does not ask: what one address
looks like, and which fields are required. Write these two lines under
`## Build details` so Phase 3 has an answer for both:

- Address: separate `street`, `city`, `region`, `postal_code` and `country` fields.
- Required: a contact saves when it has a name or a phone number. Other empty
  fields are flagged as still needed, not refused.

Write only the owner's answers and these build details. Never mention a paid
catalog, a paid entry, or anything this kit does not ship in a file you write.
The owner's project must read as complete on its own.

`docs/data-model.md` is the point of this. A future session, or a developer
hired in a year, reads it and knows why the database is shaped this way instead
of guessing and building something that contradicts it.

## Why only two questions

There are about fifty decisions of this kind. This free kit ships the two that
bite earliest, because the wrong answer to either one is felt on the day a
second person at the same company calls in.

The full catalog, the presets and the generated migration are part of Ownercode
paid. This skill is the honest sample: the same format, the same sourcing, the
same two files you would get there.

## Do not

- Do not answer on the founder's behalf because the default looks obvious. The
  default is a recommendation for a typical small business, and the founder is
  the only one who knows whether they are typical.
- Do not edit the files in `entries/`. They are copies of the full catalog's
  entries, and the next kit update replaces them.
- Do not create tables or run a migration from this skill.
