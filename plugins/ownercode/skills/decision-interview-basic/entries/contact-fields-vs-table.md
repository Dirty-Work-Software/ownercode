---
id: contact-fields-vs-table
tags: [contacts]
applies_to: [crm, field-service, booking, orders, membership, property, projects, cases]
triggers: [person-or-company-primary]
default: fixed-labeled-fields
review: approved
---

# How do you store a customer's phone, email, and address?

## The question
A customer gives you a mobile number today.
Next month they give you a second number — maybe a home phone, maybe the number for the tenant living at the job site.

Where does that second number go, and how does your staff know which one to call first?
The same question applies to email addresses and to street addresses: do you keep one of each, a few labeled slots, or an open list you can keep adding to as the customer gives you more ways to reach them?
Picture a job-site number for the tenant living at a rental property, kept alongside the landlord's own number on the same customer.
Or picture a swim school: the member is a child, and the school needs a parent's mobile and a second parent's number for pick-up.

This question decides HOW MANY phone numbers, emails and addresses a customer can have. It does not decide what one address looks like inside, such as one line of text or separate street, town and postcode boxes.

## What this decides
On screen, it decides whether staff see one box per contact method or a list they can keep adding to. In the stored data, it decides whether a phone number or address lives directly on the customer row, or in its own linked list underneath it.

## The options

### single-field-each: one phone, one email, one address
Each customer row has exactly one phone field, one email field, and one address field, and nothing more.
Whatever the customer gave you first is what stays on file, and a second one simply overwrites it if someone types over the old value.
**Good:** the fastest possible screen to build and to fill in — one box per contact method, nothing to pick between, and never two versions of the same field to keep straight.
**Bad:** the moment a customer gives you a second number, it has nowhere real to go — someone overwrites the good number with the new one, or crams both into one box as text that click-to-call and search can no longer read cleanly.
**Costs you later:** When a customer gives you a second phone number, you have nowhere to put it except crammed into the same field as text, which breaks click-to-call and makes search unreliable.
A developer has to add fields or a new table and move existing data into it by hand once this becomes a real problem.
Search and mail-merge tools also only ever see the one value that happens to be sitting in the field right now.

### fixed-labeled-fields: a few named slots
Several named fields sit right on the customer row — for example mobile phone, home phone, and email — each with its own clear label.
Staff pick the slot that matches what the customer just gave them.
**Good:** covers the one or two numbers almost every real customer actually has, each with a clear label, right on the record — no extra screen, no lookup, nothing to set up before the first customer goes in.
**Bad:** a customer with a third number, or a contact point nobody planned a label for, has nowhere obvious to put it, and staff fall back on typing it into a notes field where it is easy to miss later.
**Costs you later:** If a customer gives you a number that is not "mobile" or "home," you are stuck with nowhere obvious to put it.
Staff end up writing it into a notes field instead, where it is easy to miss the next time someone needs to call.
Adding a new label later means a developer adds a field to every existing record and updates every screen that lists phone numbers, even though only a handful of customers ever need the extra one.
The unused slots also sit blank on most customers, which clutters the entry screen for no benefit.

### child-table-with-primary: an open list per customer
A separate list of contact methods sits underneath each customer, one row per phone number, email, or address, all linked back to that customer.
One of them is marked "primary" — the one the software uses by default when nothing more specific is asked for.
A customer can end up with as many phone numbers, emails, and addresses as they actually have, with no upper limit built into the shape.
**Good:** nothing about a customer's contact list is ever a forced fit — a property manager's tenant, owner and site contact each get their own row and their own label, and one more contact later is just another row, not a redesign.
**Bad:** every screen that just wants "the phone number" now has to go find it in a separate list and work out which one counts, for customers who, most of the time, only ever had one anyway.
**Costs you later:** More setup work up front, since every screen that shows "the customer's phone number" has to look it up from the linked list instead of reading it straight off the customer row.
That extra lookup step touches nearly every screen in the software, from the job list to the invoice.
Someone also has to write the "which one is primary, and what happens if none is marked" logic once, carefully, so it never shows a blank by mistake.
This shape pays off once a customer regularly has three or more contact points, not before.

## How real software handles this
**Salesforce** uses fixed, named fields on the Contact record, not a linked list: five separate phone fields (Phone, Mobile, Home Phone, Asst. Phone, Other Phone), one Email field, and two complete address sets (Mailing Address and Other Address). Source: [Contact Fields, Salesforce Help](https://help.salesforce.com/s/articleView?id=sf.contacts_fields.htm&language=en_US&type=5), checked 2026-09-22.

**HubSpot** also uses fixed fields: its default contact properties include exactly two phone fields, Phone number and Mobile phone number, plus separate Street address, City, State/Region, Postal code and Country/Region fields. There is no built-in linked list for extra numbers or addresses. Source: [HubSpot's default contact properties, HubSpot Knowledge Base](https://knowledge.hubspot.com/properties/hubspots-default-contact-properties), checked 2026-09-22.

**Airtable** uses single-value field types: an Email field holds one address per row, and a Phone number field holds one number and formats it as a US/Canada number. Neither field type takes a second value — a second number needs a second field. Source: [Supported field types in Airtable, Airtable Support](https://support.airtable.com/docs/supported-field-types-in-airtable-overview), checked 2026-09-22.

**QuickBooks Online** is the outlier: a business can add up to 30 shipping addresses to one customer record, on top of a separate billing address — much closer to an open list than a couple of named slots. Source: [Add a customer's shipping address to invoices, QuickBooks Help](https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/add-customers-shipping-address-invoices-quickbooks/L5GskUDMP_US_en_US), checked 2026-09-22.

Three of the four lean toward fixed, named fields rather than a growable list, the same shape as the default recommended below, just with more named slots ready from day one than a first build needs to start with. QuickBooks shows the open-list shape is real too, once a business's addresses genuinely vary that much.

## Default
`fixed-labeled-fields` — Most service-business customers have one or two phone numbers and one email, not an open-ended list of contact points.
A few named fields right on the customer row cover a mobile number, a second number, and an email without the extra setup of a linked list.
Every screen can then read them directly, which keeps the software simple to build and simple for staff to use on a job site with patchy signal.
Picture an electrician's own customer list: almost everyone has a cell number and maybe a landline, and that is the whole list.

## If you pick differently
A business where one customer commonly has several contacts — a commercial property manager with a tenant, an owner, and a site contact all under one account — should pick child-table-with-primary, since the number of contact points genuinely varies from customer to customer and needs room to grow.

A business certain it will only ever record one phone number, such as a solo operator doing quick walk-in quotes with no follow-up marketing, can pick single-field-each to keep the first build as small as possible.

## Notes for the agent
- Any answer: the fields go on `contacts` (or on `contact_methods` for `child-table-with-primary`), as TEXT, with no NOT NULL; `required-fields` decides what is required. Write which field holds the main phone, the main email and the main address under `## Build details` in `docs/data-model.md`, so later entries can find them.
- `single-field-each`: add `phone` and `email` on `contacts`, plus one set of the address fields that `address-shape-and-validation` picks. Build no second phone field and no child table.
- `fixed-labeled-fields`: add `mobile_phone`, `secondary_phone` and `email` on `contacts`, plus one set of the address fields that `address-shape-and-validation` picks. Click-to-call and texts use `mobile_phone` first, then `secondary_phone`.
- `child-table-with-primary`: create `contact_methods` (`id` INTEGER primary key, `contact_id` INTEGER NOT NULL, `kind` TEXT with a CHECK for `phone`, `email` or `address`, `label` TEXT, `value` TEXT, `is_primary` INTEGER 0 or 1, `created_at`, `updated_at`), with an index on `contact_id` and a partial unique index on (`contact_id`, `kind`) where `is_primary` = 1. An `address` row stores the address fields from `address-shape-and-validation` as extra nullable columns on the same row. Write one shared helper that returns the primary row of each `kind`, and falls back to the oldest row when none is marked, so no screen shows a blank by mistake.
