# UI/UX Recommendation

**IUB International Business Alumni Information Management System**
**Companion to:** Product Requirements Document v1.0 / API Specification v0.1

---

## 1. Purpose

This document translates the PRD's UI/UX requirement — *"Clean → Professional → University-oriented → Responsive"* with priority **Clarity → Searchability → Data readability → Minimal complexity"* (Section 30) — into concrete visual and interaction guidance, using the four reference dashboards supplied as calibration points. The goal is a system that feels institutional and trustworthy (it is handling personal alumni data) while making dense tabular and analytical information genuinely easy to scan.

---

## 2. What to borrow from each reference, and what to leave behind

| Reference | Take | Leave |
|---|---|---|
| Customer list (light CRM table) | Left-nav + top-nav combo, avatar-first rows, color-coded status pills, inline row actions, quick "All / Company / Customers" segmented tabs | The playful multicolor avatar initials (too casual for an academic record system) |
| German bakery dashboard (dark sidebar) | Compact icon-only sidebar for the admin shell, year/month/day range switcher, side-by-side chart + ranked table pairing | The dark sidebar's low information density and unlabeled icons — ours needs labels for accessibility and a first-time faculty user |
| Sypher fleet/finance dashboard | **This is the strongest model for Dashboards 1 & 2.** Three-metric KPI strip with inline sparkline/progress bar under each number, dual-line revenue chart with hover tooltip, horizontal segmented progress bars for category breakdowns, clean data table with status tabs (All/Unpaid/Paid) | The freight/logistics iconography and dense 6-widget-per-screen layout — we should use fewer, larger widgets given our lower daily usage frequency |
| Order/record detail (dark POS-style) | Right-hand "Insights" rail pattern — reuse this exact idea for a "History" or "Related Submissions" rail next to an alumni profile | Full dark theme and POS-specific controls (not relevant to an academic record) |
| IUB seal | Primary palette anchor: navy, purple, warm orange, on white | Using the seal decoratively anywhere but the header/login — it's a formal mark, not a pattern |

**Overall direction:** closest to the Sypher-style dashboard (light, airy, data-forward, restrained accent color) combined with the CRM table's row conventions, re-skinned in IUB's palette. This is a data-management tool for faculty/admins and a lightweight self-service form for alumni — not a marketing site — so the design should stay quiet and let the numbers and records be the "hero."

---

## 3. Brand Foundations

### 3.1 Color palette (derived from the IUB seal)

| Token | Hex | Use |
|---|---|---|
| `--iub-navy` | `#1E2F6E` | Primary actions, active nav item, links, headers |
| `--iub-purple` | `#6A2C8F` | Secondary accent — used sparingly for highlights, chart series 2, focus rings on alumni-facing screens |
| `--iub-orange` | `#F2A73B` | Warm accent — used only for attention states: pending badges, warning banners, hover highlight on KPI cards |
| `--ink-900` | `#1A1D24` | Primary text |
| `--ink-500` | `#5B6370` | Secondary text, labels, table headers |
| `--surface-0` | `#FFFFFF` | Cards, table rows, modal backgrounds |
| `--surface-50` | `#F6F7FB` | App background, table zebra stripe |
| `--border` | `#E4E7EE` | Hairlines, table dividers, card borders |

Status colors (used consistently everywhere a state appears — directory, submissions, employment):

| State | Color | Token |
|---|---|---|
| Active / Approved / Employed | Green `#1E8E5A` | `--status-positive` |
| Pending / Under Review | Amber `#F2A73B` (IUB orange) | `--status-pending` |
| Rejected / Inactive | Red `#D64545` | `--status-negative` |
| Correction Required | Purple `#6A2C8F` | `--status-attention` |
| Seeking Employment / Further Studies | Slate `#5B6370` | `--status-neutral` |

Reusing the IUB orange as the "pending" color (rather than introducing a new yellow) keeps the palette to five hues total and ties the state system back to the brand.

### 3.2 Typography

- **Display / headings:** Inter (or IBM Plex Sans as an alternative with more institutional character), Semibold, used for page titles, KPI numbers, and section headers only.
- **Body / UI:** Inter Regular/Medium — same family as display to keep the interface calm; weight does the differentiating, not a second typeface.
- **Tabular data:** Inter with `font-variant-numeric: tabular-nums` for all numeric columns (CGPA, years, balances-equivalents) so figures align in tables and KPI cards — visible in the reference dashboards' aligned digit columns.
- **Scale:** 28/22/18/16/14/12px, with 14px as the table/body default and 12px reserved for captions, timestamps, and helper text.

### 3.3 Shape, elevation, density

- 8px corner radius on cards and inputs (matches the softer CRM/Sypher references, not the razor-sharp POS style).
- Flat design with a single-level shadow (`0 1px 2px rgba(16,24,40,0.06)`) on cards; no heavy drop shadows.
- Row height 48px in dense admin tables (directory, submissions queue) to maximize rows-per-screen for faculty scanning 500+ records; 56px in less dense alumni-facing lists.

---

## 4. Information Architecture & Navigation

Two distinct shells, matching PRD Section 6:

**Admin/Faculty shell** (desktop-first, per Section 30):
- Top bar: IUB mark + product name (left), global search (center — searches name/Student ID/Alumni ID/email/company per Section 11), notifications + role-tagged avatar menu (right), mirroring the customer-list reference's top bar.
- Primary nav as a horizontal tab bar directly under the top bar: **Directory · Submissions · Analytics · Data Quality · Admin** (faculty see a reduced set: Directory, Analytics only — enforce visibility by role, not just permission, so faculty never see admin-only tabs at all).
- No collapsed icon-only sidebar: given the earlier feedback that unlabeled icons hurt clarity, a labeled horizontal tab bar is more legible for infrequent faculty users than the bakery dashboard's icon rail.

**Alumni shell** (mobile-friendly, single-column):
- Simple bottom or top tab bar with 4 destinations only, matching PRD Section 32's alumni scope: **My Profile · Update Info · Submission Status · Log Out**.
- No search, no filters, no dense tables — alumni only ever see their own record.

---

## 5. Alumni Portal Screens

### 5.1 My Profile
- Single scrollable page, grouped into cards matching the PRD's own grouping (Section 8): **Personal & Contact**, **Academic**, **Current Employment**, **Employment History**.
- Employment History renders as a vertical timeline (not a dense table) on mobile — a table only reads well at desktop widths, and alumni access is expected to be mostly mobile.
- Each editable field shows a small pencil icon that routes into the submission flow rather than editing inline — this visually reinforces the PRD's core rule that alumni changes are *proposals*, not direct edits (Section 9).

### 5.2 Update Information (Submission)
- A focused, single-purpose form per submission type (contact, academic, employment, etc.) rather than one giant form — reduces cognitive load and maps cleanly to the `submission_type` field in the API.
- Before submit, show a **"Current → Proposed"** comparison strip for every changed field (reusing the same visual pattern the admin will later see in the Verification Center) so alumni see exactly what they're requesting before sending it.
- Primary button: "Submit for Review" (never "Save" — per the PRD, this never writes directly to official data).

### 5.3 Submission Status
- A simple vertical list of past/pending submissions, each as a card with a status pill (color system in 3.1), submission type, submitted date, and — if `Correction Required` or `Rejected` — the admin's comment shown inline in a highlighted note, so alumni immediately understand what to fix without opening another screen.

---

## 6. Admin/Faculty Portal Screens

### 6.1 Alumni Directory
Directly modeled on the customer-list reference, adapted:
- Left filter rail (collapsible) with the PRD Section 11 filters: Degree, Major, Minor, Graduation Year, Employment Status, Industry, Country — each as a compact dropdown or chip group, with an "All Filters (n)" summary chip when more than 2 are active.
- Table columns: Student ID · Name (with small avatar/initials) · Degree · Major · Graduation Year · Company · Status — matching the PRD's directory table (Section 11) with an avatar column borrowed from the CRM reference to make long lists more scannable.
- Row status pill shows employment status, not account status, since that's the more useful glanceable fact for faculty (color system in 3.1).
- Row hover reveals a "View Profile" affordance (whole row is clickable, per PRD "clicking a record opens the full profile").
- Sensitive columns (personal email, phone) are **never** shown in this table (Section 25) — only inside the profile, and only if the viewer's role permits.

### 6.2 Alumni Profile (Admin/Faculty view)
- Two-column layout: main content (Personal, Academic, Employment, Employment History as a real table with sortable Period column) on the left; a right-hand **"Activity"** rail on the right, directly inspired by the order-detail reference's Insights panel — showing this alumnus's submission history and audit trail entries in one place, so an admin doesn't have to leave the profile to see "why does this record say XYZ Ltd.?"
- Admin-only inline "Edit" pencil per section, distinct visually (different icon or color) from the alumni-facing submission-proposal pencil, to make clear this is a direct write (Section 24/27 audit implications).

### 6.3 Verification Center (Submissions Queue)
- Tabbed table by status: **Pending · Correction Required · Approved · Rejected**, mirroring the "All / Unpaid / Paid" tab pattern from the Sypher invoices table — a proven pattern for exactly this kind of queue.
- Clicking a row opens a side panel (not a full navigation) showing the **Current vs. Proposed** comparison exactly as described in PRD Section 10, with large, unambiguous **Approve / Reject / Request Correction** buttons at the bottom of the panel — kept in one place so the admin never has to scroll to act.
- Approve = navy primary button; Reject = red outline button; Request Correction = orange outline button — the button colors alone should communicate intent even before reading the label.

### 6.4 Analytics — Dashboard 1 (Academic) & Dashboard 2 (Career)
This is where the Sypher reference should be followed most closely:
- **KPI strip** at the top: 3–5 large-number cards (Total Alumni, IB Majors, IB Minors, Average CGPA, Internship Completion for Dashboard 1; Employed/Seeking/Further Studies/Self-Employed for Dashboard 2), each with a small inline sparkline or completion bar underneath the number — never bare numbers with nothing else, which read as static and lifeless.
- **Primary chart**, large, top-left or top-center: Alumni by Graduation Year (line or bar) for Dashboard 1, Employment by Industry for Dashboard 2 — with the filter bar (Graduation Year, Degree, Major, Minor, etc., per Section 16–17) pinned directly above the chart, not buried in a sidebar, since PRD explicitly requires all visualizations to update dynamically with filters and that relationship needs to be visually obvious.
- **Secondary widgets** below/beside the primary chart, each a distinct card: Degree Distribution and Major/Minor Distribution as horizontal bar lists (not pie charts — the customer/CGPA distributions have many categories, and horizontal bars stay legible with 5+ segments, unlike a crowded pie); reserve a donut/pie chart only for genuinely binary-ish breakdowns like Internship Completion (Yes/No) or Payment-type-style splits, where the bakery dashboard's pie chart pattern actually works well.
- **Top Employers** and **Career Progression** render as ranked tables (name + count), same visual language as the directory table, so the whole product feels like one system rather than a bolted-on BI tool.
- Keep each dashboard to one screen, no vertical scrolling required at 1440px width, in line with "Minimal complexity."

### 6.5 Data Quality Panel
- Four large stat tiles (Incomplete Profiles, Pending Verification, Potential Duplicates, Missing Employment Info) exactly as enumerated in PRD Section 29, each clickable — clicking "Potential Duplicates" should route straight into a filtered list, turning the dashboard into a worklist rather than a static report.

---

## 7. Interaction & State Details

- **Empty states:** every list/table needs a designed empty state (e.g., "No pending submissions — you're all caught up") rather than a blank white area, per PRD's clarity goal and general usability best practice.
- **Loading:** skeleton rows/cards matching final layout dimensions, not spinners, to avoid layout shift on a data-heavy product.
- **Errors:** inline, field-level messages for validation errors (matching the API's `field`-tagged error objects) rather than generic toast-only errors, so a rejected submission or failed edit points at exactly what's wrong.
- **Confirmation:** destructive/high-consequence actions (Approve, Reject, Deactivate Alumni) get a lightweight confirm step — a single confirmation button in an inline panel is enough; avoid heavy modal stacking.

---

## 8. Responsiveness

Per PRD Section 30 ("Desktop-first for administration, Mobile-friendly for alumni"):

| Breakpoint | Admin/Faculty portal | Alumni portal |
|---|---|---|
| ≥1280px | Full multi-column dashboards, side-by-side filter rail + table | Centered single column, generous whitespace |
| 768–1279px | Filter rail collapses to a "Filters" button that opens a drawer; KPI strip wraps to 2-up | Same single-column layout, unchanged |
| <768px | Directory table becomes stacked cards (one alumni per card, same fields as table columns); dashboards stack charts vertically, one per row | Primary target width — all alumni screens are designed mobile-first at this size |

---

## 9. Accessibility & Motion

- Maintain WCAG AA contrast for all text and status pills against their background (verify the orange/purple accents at small sizes — use a darker shade of each for text-on-tint, lighter for tint-on-white backgrounds).
- Every icon-only control (row actions, filter icons) needs a visible text label or accessible `aria-label`; the customer-list reference's pencil/kebab icons should always ship with tooltips.
- Visible keyboard focus rings using `--iub-purple` at 2px, distinct from the navy hover state, so keyboard and mouse interactions are visually distinguishable.
- Respect `prefers-reduced-motion`: chart transitions and KPI sparkline animations should be instant, not animated, for users with this preference set.
- Motion elsewhere should be limited to short (150–200ms) ease-out transitions on hover/focus and panel open/close — no page-load animation sequences; this is a records system, not a marketing site.

---

## 10. Summary Component Inventory

| Component | Primary reference | Used in |
|---|---|---|
| Segmented tab bar | Customer list "All/Company/Customers" | Directory type filter, Submissions status tabs |
| Status pill | Customer list status column | Directory, Submissions, Profile employment status |
| KPI card w/ sparkline | Sypher dashboard | Dashboard 1 & 2 KPI strips, Data Quality tiles |
| Dual-series line chart | Sypher "Revenue and costs" | Alumni-by-year, career progression over time |
| Horizontal ranked bar list | Sypher "Costs by category" | Degree/Major/Minor distribution, Top Employers |
| Donut/pie chart | Bakery dashboard "Zahlungsart" | Internship completion only |
| Data table w/ avatar + row actions | Customer list | Alumni Directory |
| Right-hand detail rail | Order/record "Insights" panel | Alumni Profile activity/audit rail |
| Current→Proposed comparison panel | (new, PRD Section 10 driven) | Submission review, alumni pre-submit confirmation |

---

## 11. Next Steps

1. Build a small token file (colors, type scale, spacing) from Section 3 so both the alumni and admin shells share one source of truth.
2. Prototype the Verification Center panel first — it's the most novel screen (no direct precedent in the references) and the one the PRD treats as the product's core lifecycle demonstration (Section 37).
3. Validate the Directory table and Dashboard 1 against the real ~500-record dummy dataset early, since density and truncation behavior (long company names, missing fields) only show up with realistic data volume.
