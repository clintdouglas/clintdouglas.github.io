# Clint Douglas — Academic CV

Source for **https://clintdouglas.github.io** — the academic CV of Professor Clint Douglas, Nursing Chair, QUT School of Nursing and Metro North Hospital and Health Service.

The site is a single page built by GitHub Pages (Jekyll) from Markdown. No build tools are needed to update it.

## Updating the CV

All content lives in **`index.md`**. Edit it on GitHub (pencil icon) or locally, commit, and the site rebuilds in about a minute.

- Sections are `##` headings; sub-sections are `###`. Each heading carries an id in braces (`{#articles}`) that the top navigation and in-page links use — keep those when renaming a heading.
- **Publications, presentations and funding** are numbered lists (`1.`), newest first. Numbering in the file does not matter; the page renumbers automatically and, for lists of six or more entries, inserts year dividers from the `(2026)` year in each entry.
- **Education, awards, positions and internships** are bullet lists whose items start with a bold year, e.g. `- **2019–current** Professor and Nursing Chair, …`.
- Update `updated:` in `_config.yml` when you revise the CV; it appears in the footer.
- Profile links (email, QUT profile, ORCID, Google Scholar, GitHub) and the research-theme chips are in the hero section of `_layouts/default.html`; the portrait is `assets/img/clint-douglas.jpg` (strip EXIF metadata before replacing it; a 600×600 or larger image looks sharper on high-resolution screens and in link previews).

## Citation metrics (Google Scholar)

The line at the top of *Publications* (h-index, i10-index, citations) comes from `assets/data/scholar.json`. The workflow in `.github/workflows/scholar.yml` refreshes that file every Monday through [SerpAPI](https://serpapi.com)'s Google Scholar Author API and commits it when the numbers change; the page reads the latest committed file on every visit.

- One-time setup: add a repository secret named **`SERPAPI_KEY`** (Settings → Secrets and variables → Actions) containing your SerpAPI key.
- Refresh on demand: Actions tab → *Update Google Scholar metrics* → *Run workflow*.
- If a run fails (no key, quota exhausted, API change), the previous numbers stay on the site; the failure shows in the Actions tab.
- Scholar author id and schedule live in `scholar.yml`; the parsing is in `scripts/update-scholar.js`.
- GitHub pauses scheduled workflows in a public repository after 60 days without a commit. The metrics job refreshes a `checked` date about every 45 days to keep the repository active; if the Actions tab ever shows a workflow as disabled, press *Enable workflow*.

## New publications from ORCID

`.github/workflows/publications.yml` runs every Monday night. It reads the public ORCID record (0000-0003-4131-5044), finds journal articles and book chapters with a DOI that are not yet in `index.md`, drafts each from its Crossref record in the CV's reference style, inserts them at the top of the matching list on a `new-publications` branch and opens a **pull request** for review. Nothing reaches the live site until the pull request is merged.

- Review the PR: check authors/title against the paper, move or delete entries that don't belong, then merge.
- Don't want an item on the CV? Add its DOI to `scripts/publications-ignore.json` and close the PR; it won't be proposed again.
- Needs the repository setting *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests*; without it the workflow opens an issue instead.
- Preprints, conference talks and ORCID items without a DOI are ignored on purpose.
- Dry run locally: `node scripts/check-orcid.js` (prints what would be proposed, changes nothing).

## Files

| Path | Purpose |
| --- | --- |
| `index.md` | The CV content |
| `_layouts/default.html` | Page shell: head, top navigation, hero (portrait, links, themes), footer |
| `assets/css/style.css` | Styles, dark mode, print layout |
| `assets/js/cv.js` | Badges, year dividers, filter box, citation metrics, nav highlighting |
| `assets/data/scholar.json` | Google Scholar metrics (written by the weekly Action) |
| `.github/workflows/scholar.yml`, `scripts/update-scholar.js` | The weekly metrics refresh |
| `.github/workflows/publications.yml`, `scripts/check-orcid.js`, `scripts/publications-ignore.json` | The weekly ORCID check that proposes new publications |
| `_config.yml` | Site title, URL, "last updated" |
| `scripts/serve.js` | Optional local preview (`node scripts/serve.js`, needs [pandoc](https://pandoc.org)) |

## PDF

Use **Save as PDF** in the hero, the printer icon in the top bar, or the browser's print dialog; the print stylesheet produces a clean document without navigation.
