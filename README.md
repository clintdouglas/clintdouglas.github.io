# Clint Douglas — Academic CV

Source for **https://clintdouglas.github.io** — the academic CV of Professor Clint Douglas, Nursing Chair, QUT School of Nursing and Metro North Hospital and Health Service.

The site is a single page built by GitHub Pages (Jekyll) from Markdown. No build tools are needed to update it.

## Updating the CV

All content lives in **`index.md`**. Edit it on GitHub (pencil icon) or locally, commit, and the site rebuilds in about a minute.

- Sections are `##` headings; sub-sections are `###`. Each heading carries an id in braces (`{#articles}`) that the sidebar navigation links to — keep those when renaming a heading.
- **Publications, presentations and funding** are numbered lists (`1.`), newest first. Numbering in the file does not matter; the page renumbers automatically and inserts year dividers from the `(2026)` year in each entry.
- Append `Scimago Q1` / `Q2` / `Q3` / `Q4` / `D1` to a reference and it is shown as a ranking badge.
- **Education, awards, positions and internships** are bullet lists whose items start with a bold year, e.g. `- **2019–current** Professor and Nursing Chair, …`.
- Update `updated:` in `_config.yml` when you revise the CV; it appears in the footer.
- Profile links (email, GitHub, ORCID, …) are in the sidebar in `_layouts/default.html`; the portrait is `assets/img/clint-douglas.jpg`.

## Files

| Path | Purpose |
| --- | --- |
| `index.md` | The CV content |
| `_layouts/default.html` | Page shell: head, sidebar, navigation, footer |
| `assets/css/style.css` | Styles, dark mode, print layout |
| `assets/js/cv.js` | Badges, year dividers, filter box, nav highlighting |
| `_config.yml` | Site title, URL, "last updated" |
| `scripts/serve.js` | Optional local preview (`node scripts/serve.js`, needs [pandoc](https://pandoc.org)) |

## PDF

Use **Print / save as PDF** in the sidebar (or the browser's print dialog); the print stylesheet produces a clean document without navigation.
