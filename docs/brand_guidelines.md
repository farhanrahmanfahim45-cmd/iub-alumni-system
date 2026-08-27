# Brand Guidelines

**IUB International Business Alumni Information Management System**
**Status:** Incomplete — pending official department/university input

---

## Note on scope

No official IUB brand guidelines document was provided — only the university seal (`IUB_Logo.png`). Per instruction, this document does **not** invent brand rules that IUB hasn't specified. What follows is:

1. Values that can be **directly measured from the provided logo file** (marked ✅ Derived from asset), and
2. A checklist of what's still needed, with a placeholder marking who should provide it (marked ⬜ Pending official input).

The UI/UX Recommendation (`docs/ui_ux_recommendation.md`) currently uses the ✅ colors below as a working palette for prototyping. Treat that as provisional — it should be reconciled with this document once IUB/the department supplies real guidelines, not treated as the brand system itself.

---

## Primary Colors

✅ Derived from asset — extracted directly from `IUB_Logo.png`:

| Swatch | Hex | Approx. RGB | Where it appears in the logo |
|---|---|---|---|
| 🟧 | `#F7941D` | 247, 148, 29 | Orange geometric mark (right side of the flame device) |
| 🟦 | `#2E3192` | 46, 49, 146 | Navy/blue geometric mark (left side of the flame device) |
| 🟪 | `#812990` | 129, 41, 144 | Purple flame element |
| ⬛ | `#000000` | 0, 0, 0 | Circular text ring ("TEACHETH MAN THAT WHICH HE KNEW NOT...") |

⬜ Pending official input: which of these (if any) is the designated "primary" brand color for digital products, and whether an official hex/Pantone spec exists that supersedes what's measured here. Logos are sometimes reproduced with slightly different values than the official brand palette — **confirm with IUB's communications or marketing office before this is used outside of the prototype.**

---

## Secondary Colors

✅ Derived from asset:

| Swatch | Hex | Approx. RGB | Where it appears in the logo |
|---|---|---|---|
| ⬜ (gray) | `#636466` | 99, 100, 102 | "IUB" wordmark beneath the flame device |

⬜ Pending official input: a full secondary/support palette (tints, neutrals, semantic colors for success/warning/error, dark-mode equivalents) is not defined anywhere in the source material. This should not be improvised for anything beyond internal prototyping — request it from IUB, or confirm that the department is comfortable with the design team proposing one for approval.

---

## Typography

⬜ Pending official input — nothing in the provided material specifies official typefaces. The logo's ring text and "IUB" wordmark appear to be custom-set/outlined artwork rather than a live font, so a typeface cannot be reliably identified from the asset alone.

Needed before this section can be completed:
- Official university typeface(s) for print/digital, if any exist (many universities have a licensed serif for formal communications and a separate sans-serif for digital products).
- Any existing style guide from IUB's Registrar, Communications, or IT department that names approved fonts for web systems.

**Do not treat the typefaces used in the UI/UX Recommendation doc (Inter / IBM Plex Sans) as official** — they were chosen only as a reasonable, license-free placeholder for prototyping.

---

## Logo Usage

✅ Derived from asset (observable facts about the file itself):
- The provided file (`IUB_Logo.png`) is the full circular seal: flame device + "IUB" wordmark + circular motto text + "INDEPENDENT UNIVERSITY, BANGLADESH" ribbon banner.
- It is supplied as a single flattened raster image (PNG), not as separate layers, not as a vector (SVG/EPS/AI) file, and with no simplified/wordmark-only or single-color variant included.

⬜ Pending official input — none of the following can be determined from a single PNG and must come from IUB:
- Minimum clear space / exclusion zone around the seal.
- Minimum reproduction size (px/mm) below which it becomes illegible.
- Approved simplified variants (e.g., a "IUB" wordmark-only lockup, or a single-color version for dark backgrounds or watermarking).
- Placement rules (e.g., is the full circular seal appropriate in a small app header, or is it reserved for formal/ceremonial use, with a simpler mark intended for product UI?).
- Any restriction on recoloring, cropping, rotating, or combining the seal with other marks (e.g., a "Department of International Business" sub-brand lockup).
- A vector source file, if this system needs the mark at multiple resolutions (favicon, app icon, print).

**Interim recommendation for the prototype only:** use the seal as supplied, unmodified, at a size where the motto text stays legible (roughly ≥64px height), placed with generous padding, and avoid placing any UI color or pattern directly behind it. Replace this guidance once official usage rules exist.

---

## General Visual Identity

⬜ Pending official input — a visual identity is more than a logo and two colors; none of the following exists in the source material and should not be invented for anything beyond prototyping:
- Brand voice/tone guidance for written communication.
- Photography or illustration style, if any.
- Iconography style (the PRD and UI/UX doc propose one for the prototype, but it isn't an IUB standard).
- Any existing departmental collateral (letterhead, presentation template, website) that a digital product should visually align with, for consistency across university-facing materials.

---

## Recommended Next Step

Before this system moves past the faculty-demonstration prototype stage (PRD Section 1), request the following from IUB's Communications/Marketing office or the Department of International Business:

1. An official brand or style guide, if one exists at the university or department level.
2. Confirmation (or correction) of the primary color values measured above.
3. Approved typefaces for digital products.
4. A vector version of the seal, plus any simplified/alternate lockups and usage rules.

Once received, this document should be rewritten with those specifics, and the UI/UX Recommendation and any built interfaces should be reconciled against it.
