# Phase 1 — Product rules (signed-off baseline)

**Status:** Baseline v1 (implementation artifact — no code).  
**Purpose:** Lock vocabulary and rules before Phase 2 (data model / APIs / admin UI).

This document defines **what the system means** and **what is required vs optional**. Assumptions are marked **(default)** where the client did not specify.

---

## 1. Glossary

| Term | Meaning |
|------|---------|
| **Category** | A grouping for navigation and filtering (e.g. treks, circuits). Every package sits under exactly one category. |
| **Package** | A sellable tour product: has a booking type, pricing configuration, and customer-facing content. |
| **Booking type — Private** | Price and availability are driven by group size, optional tiers, and optional add-ons; travel date is chosen by the customer within rules set by admin. |
| **Booking type — Fixed** | Departure on **admin-defined batches** (date + seat cap); **fixed price** per person (or per booking — see §4.3) as configured by admin. |
| **Tier** | A named price level for **private** packages when multi-tier pricing is enabled (labels are **fully customizable** per package, e.g. Standard / Deluxe / Super Deluxe). |
| **Batch** | A single dated departure for a **fixed** package, with its own seat capacity and optional price override if product rules allow later. |
| **Seat** | One participant place on a **fixed** batch; decremented when a booking is confirmed. |
| **Add-on** | Optional extra line items (e.g. rafting); can be attached per package or reused from a global list **(default: per-package list, optional)**. |

---

## 2. Category — meaning and scope

**Rule:** A **category** is primarily for **navigation and organization** (menus, filters, admin lists). It does **not** by itself define prices or tiers.

- Each **package** belongs to **exactly one** category.
- **Pricing, tiers, batches, and add-ons** are configured **on the package**, not inherited from the category **(default)**.

*Rationale:* The client asked for per-package flexibility (“not all packages need all configurations”); tying pricing to category would fight that unless we add “category templates” later.

---

## 3. Private vs fixed — exclusivity

**Rule:** Each package has **exactly one** booking type: **`Private`** **or** **`Fixed`**. A package cannot be both.

**Immutability (default):** Booking type is **set at package creation** and **must not change** after the first booking exists. Before any booking, admin may change type only if the system allows clearing incompatible data (tiers vs batches) **(default: disallow type change after create to avoid edge cases; admin creates a new package instead)**.

---

## 4. Required vs optional fields (by booking type)

### 4.1 All packages (any booking type)

| Field | Required |
|-------|----------|
| Category | Yes |
| Name | Yes |
| Short description | Yes **(default)** |
| Main image / hero | Yes **(default)** |
| Active (published) | Yes (boolean) |
| Booking type (Private \| Fixed) | Yes |

Optional **(default):** long description, gallery images, duration text, difficulty, tags, SEO fields.

### 4.2 Private packages — additional

| Field | Required |
|-------|----------|
| Pricing mode: **Single** (one price) or **Multi-tier** | Yes |
| If **Single**: one base price (per person **(default)**) | Yes |
| If **Multi-tier**: at least one tier; each tier has **custom label** + price (and optional group-size bands **(default: optional v1 — can be same price for all group sizes)**) | Yes |
| Travel date: collected at booking | Yes (customer) |
| Min / max group size | Yes **(default)** |

Optional: add-ons list; if multi-tier with group bands, define bands per tier **(default v1: optional)**.

### 4.3 Fixed packages — additional

| Field | Required |
|-------|----------|
| At least one **batch** with date + total seats | Yes **(default: package cannot go live without ≥1 future batch with seats > 0)** |
| Price | Yes (per person **(default)**; document if you later add per-batch override) |

Optional: add-ons **(default: yes, optional per package)**.

---

## 5. Pricing rules (private)

| Mode | Behavior |
|------|----------|
| **Single** | No tier selector on customer UI; one configured price (per person **(default)**). |
| **Multi-tier** | Customer selects a tier; each tier has admin-defined **label** (any text) and **price**. **(default v1)** One price per tier for all group sizes unless admin configures group-size bands later. |

**Rule:** Some packages use single price; some use multi-tier — **both must be supported** on the **package** level (admin chooses mode per package).

---

## 6. Fixed batches — seats and sold-out behavior

**Capacity:** Each batch has `seatsTotal` and `seatsRemaining` (or derive remaining from bookings **(default: store remaining, decrement on confirmed booking)**).

**When `seatsRemaining === 0` (default UX):**

- Show the batch in the list as **Sold out** (disabled); **do not** allow booking.
- **No waitlist in v1** **(default)** — can be a future phase.

**Race (two users, one seat):** First **confirmed** booking wins; the other receives a clear error and must refresh **(default)**.

**Admin (default):** Admin can **add batches**, **increase capacity** on a batch, or **cancel** bookings to free seats. Admin **cannot** silently overbook without adjusting capacity **(default)**.

---

## 7. Add-ons

**Rule (default):** Add-ons are **optional** per package. A package may have **zero** add-ons.

**Scope (default):** Add-ons are defined **per package** (name + price). A global catalog reused by many packages can be a later enhancement.

---

## 8. Admin control (summary)

The **admin** controls: categories; package content; booking type; private pricing mode; tier names and prices; fixed batches and seats; which optional fields are used (e.g. add-ons on/off); publish/active flag.

The **customer** site only displays what the catalog defines for each package.

---

## 9. Phase 2 input checklist

Before implementing schema/APIs, confirm with stakeholders:

- [ ] Category is navigation-only (no category-level pricing) — or adjust §2.
- [ ] Booking type immutable after create — or adjust §3.
- [ ] Sold-out UX and no waitlist v1 — or adjust §6.
- [ ] Price is per person for both types — or define per-booking for private groups.

**Document owner / date:** _fill on sign-off_

---

## Revision

| Version | Notes |
|---------|--------|
| v1 | Initial Phase 1 baseline (categories, private/fixed, fields, pricing, batches, add-ons, admin summary). |
