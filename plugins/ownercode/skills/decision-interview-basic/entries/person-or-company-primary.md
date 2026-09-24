---
id: person-or-company-primary
tags: [contacts]
applies_to: [crm, field-service, booking, orders, membership, property, projects, cases]
triggers: []
default: one-table-type-flag
review: approved
---

# Is the customer a person, a company, or both?

## The question
When someone becomes a customer, a client, a member or a tenant, is that record a person, a business, or could it be either one? A landlord calling in a repair for a rental unit is a different shape of customer than a homeowner calling about their own kitchen sink.

For example, picture a property manager who calls this time, when last time it was the landlord himself. Is that a new customer, or the same one with a different person on the phone today?

Or picture a gym or a yoga studio. Almost every member is one person paying for themselves, but now and then a local firm pays for ten of its staff to come. Is that firm a customer too, or only the ten people?

## What this decides
The answer decides whether the customer list is one table or two, and whether a screen showing "the customer" ever needs to show a company name and a person's name side by side.

## The options

### person-only: every customer is a person
There is no separate idea of "company" anywhere in the system. Every record is just a person's name, like "Jane Smith," even when that person is calling on behalf of a business.
**Good:** the simplest possible customer list to build and to read — one name field, no second record type to decide between.
**Bad:** as soon as a business account has two people who might call in — an office manager this month, the owner next month — there is nowhere to put the second name without picking one to overwrite.
**Costs you later:** when a business sends a different employee to meet you, you either make a second, disconnected record for them and split the history in two, or overwrite the old contact's name and lose track of who you used to deal with. Adding a company idea later means a developer moves every existing record into the new shape by hand.

### company-only: every customer is a company
Every customer record is a company name, even a homeowner who is really just "Jane Smith" living at one address. The person's own name becomes just a detail on the company record, not the record itself.
**Good:** every record has the same shape, so reports and invoices never need to handle two different kinds of customer.
**Bad:** every invoice and screen says "Company" even for an ordinary homeowner, which looks wrong and unprofessional to the customer.
**Costs you later:** when a homeowner's spouse also calls in, there is nowhere to add a second name without the same rebuild this option was meant to avoid — a developer has to add a real person idea after the fact and move every existing homeowner record into it.

### one-table-type-flag: one list, marked person or company
One customer list holds both people and companies, with a field on each row that says which one it is. A company row can have a second person's row linked to it as "works at this company," which is how the second contact gets handled.
**Good:** one list to search, filter and report on, and it handles the ordinary homeowner and the occasional business account without asking either one to pretend to be the other.
**Bad:** every screen that shows a customer name has to handle two different shapes side by side — a person's "Jane Smith" next to a company's "Smith & Sons Plumbing." The software also needs a few extra checks so a company's own row never gets confused with the people who work there.
**Costs you later:** if the business later becomes mostly commercial, with several contacts routinely calling in for the same company, splitting the single list into two means moving every company row's data across to a new table by hand.

### two-linked-tables: a separate company list and person list
A company list and a person list sit side by side, connected: a person's row can point to the company they work for, left blank for an ordinary homeowner. Every company gets its own row even if it currently has only one contact.
**Good:** company-level facts — a billing address, a master contract, a shared account number — live in exactly one place instead of being copied onto every person who works there.
**Bad:** two lists to search and report on instead of one, so a "find a customer" search has to check both places and combine what it finds. There is more setup work before you can enter your very first customer, since both lists need to exist and connect correctly from day one.
**Costs you later:** for a business that is mostly homeowners, this extra structure sits unused on almost every record, and collapsing two lists back into one — the direction most owner-operator businesses eventually want — means moving every company's data onto the one person record it was really describing.

## How real software handles this
**Salesforce** keeps two separate objects — Account for the company, Contact for the person — with every contact tied to one account as its main relationship; the platform also lets a contact carry additional, indirect associations to other accounts, for the case where one real person genuinely works with more than one company. Source: [Establish Account and Contact Relationships, Salesforce Trailhead](https://trailhead.salesforce.com/content/learn/modules/accounts_contacts_lightning_experience/understand-account-and-contact-relationships-lightning), checked 2026-09-22.

**HubSpot** also keeps Contacts and Companies as separate record types. A contact can be linked to more than one company at once, and one of those links is always marked primary — "the first company you associate with a record is the primary company by default" — with only the primary company getting that contact's logged calls and emails attached automatically. Source: [Associate records, HubSpot Knowledge Base](https://knowledge.hubspot.com/records/associate-records), checked 2026-09-22.

**Pipedrive** calls the two lists Persons and Organizations. A person "can be linked to an organization," and an organization "can be linked to multiple people," so one company record naturally holds several contacts. Source: [Contacts: people and organizations, Pipedrive Knowledge Base](https://support.pipedrive.com/en/article/contacts-people-and-organizations), checked 2026-09-22.

All three of these products actually run the two-linked-tables shape, or a many-to-many version of it, as their real design — none of them ships a single flagged list the way `one-table-type-flag` does. That gap is worth stating plainly rather than smoothing over: the default recommended below is a deliberately smaller build than what any of these three products ship, chosen for a first version, not because it is what big CRMs do.

## Default
`one-table-type-flag` — Most owner-operator service businesses deal mainly with individual homeowners and only occasionally with a business account that has more than one contact. One list with a person-or-company flag handles both shapes without forcing every homeowner through a "company" record they don't need. The occasional office manager or property contact can still link back to the company they work for, so you never lose that relationship. Picture a plumber whose regular commercial account is a small property management office: two different staff there call in jobs over the years, and both should land on the same company history.

## If you pick differently
A business that is almost entirely commercial — a handful of managed properties or offices with several contacts each — should pick two-linked-tables, since it keeps company-level details like a billing address or a master contract cleanly apart from the people at each one.

A business that will truly never bill a company, like a solo house cleaner working only with homeowners, can pick person-only to keep the first build as plain as possible. So can a gym or a studio whose members all pay for themselves.

## Notes for the agent
- Any answer: the table is always `contacts`, and every other table links to it with `contact_id`, whichever option is picked. The name, phone, email, address and merge fields from the later contact entries all go on `contacts`. Write the chosen option and its one-sentence reason under `## Build details` in `docs/data-model.md`.
- `person-only`: `contacts` has no `kind` field and no company link; every row is a person. Build no `companies` table.
- `company-only`: every `contacts` row is a company, and `name` holds the company name. Add an optional `person_name` TEXT field for the person you deal with there; build no `kind` field and no `companies` table.
- `one-table-type-flag`: add `kind` TEXT NOT NULL with a CHECK for `person` or `company`, and `works_at_contact_id` INTEGER, which points at another `contacts` row and stays blank for company rows and unlinked people. Index `works_at_contact_id` for the "everyone at this company" list, and reject in code a `works_at_contact_id` that points at itself or at a `person` row.
- `two-linked-tables`: create `companies` (`id` INTEGER primary key, `name` TEXT, the company's billing address fields, `created_at`, `updated_at`) and keep `contacts` for people only, with an optional `company_id` INTEGER that points at `companies`; index `company_id`. The "find a customer" search queries both tables and shows one merged result list.
