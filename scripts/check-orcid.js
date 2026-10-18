#!/usr/bin/env node
/* Finds publications in the ORCID record that are not yet on the CV page and
   drafts them as APA-style entries. Run by .github/workflows/publications.yml.

   Environment:
     ORCID_ID   ORCID iD to read (public API, no key needed)
     MODE       "dry" (default) only prints the proposals;
                "write" also inserts them into index.md
     OUT_DIR    where to write new-publications.json and pr-body.md (default: scripts/.out)

   Only journal articles and book chapters that carry a DOI are proposed.
   DOIs or titles listed in scripts/publications-ignore.json are skipped.
*/
const fs = require('fs');
const path = require('path');

const ORCID = process.env.ORCID_ID || '0000-0003-4131-5044';
const MODE = process.env.MODE || 'dry';
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, '.out');
const ROOT = path.resolve(__dirname, '..');
const INDEX = process.env.INDEX_MD || path.join(ROOT, 'index.md');   // INDEX_MD: alternative file, for testing
const IGNORE = path.join(__dirname, 'publications-ignore.json');
const UA = 'clintdouglas.github.io publication-check (mailto:c2.douglas@qut.edu.au)';

// ORCID work type -> which list in index.md receives the entry
const TARGETS = {
  'journal-article': { heading: '### Original research articles {#articles}', label: 'Original research articles' },
  'book-chapter': { heading: '### Book chapters {#chapters}', label: 'Book chapters' },
};

const normDoi = d => String(d || '').trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:/, '');
const normText = s => String(s || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function getJson(url, headers) {
  const res = await fetch(url, { headers: Object.assign({ 'User-Agent': UA, Accept: 'application/json' }, headers || {}) });
  if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
  return res.json();
}

function initials(given) {
  if (!given) return '';
  return given.split(/[\s-]+/).filter(Boolean).map(p => p[0].toUpperCase() + '.').join(' ');
}

function apaAuthors(list) {
  const names = (list || []).map(a => {
    if (a.family) return a.family + (a.given ? ', ' + initials(a.given) : '');
    return a.name || '';
  }).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + ' & ' + names[1];
  return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
}

function tidyTitle(t) {
  return String(t || '').replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim().replace(/\.$/, '');
}

function draftEntry(cr, doi, type) {
  const year = (cr.issued && cr.issued['date-parts'] && cr.issued['date-parts'][0] && cr.issued['date-parts'][0][0]) ||
    (cr['published-online'] && cr['published-online']['date-parts'][0][0]) || 'n.d.';
  const title = tidyTitle(cr.title && cr.title[0]);
  const journal = tidyTitle(cr['container-title'] && cr['container-title'][0]);
  const pages = cr.page || cr['article-number'] || '';
  let cite = apaAuthors(cr.author) + ' (' + year + '). ' + title + '.';
  if (type === 'book-chapter') {
    const editors = apaAuthors(cr.editor);
    cite += ' In ' + (editors ? editors + ' (Eds.), ' : '') + '*' + journal + '*' + (pages ? ' (pp. ' + pages + ')' : '') + '.' + (cr.publisher ? ' ' + cr.publisher + '.' : '');
  } else {
    cite += ' *' + journal + '*';
    if (cr.volume) cite += ', *' + cr.volume + '*' + (cr.issue ? '(' + cr.issue + ')' : '');
    if (pages) cite += ', ' + pages.replace(/-/g, '–');
    cite += '.';
  }
  cite += ' <https://doi.org/' + doi + '>';
  return { cite, year, title, journal };
}

(async () => {
  const md = fs.readFileSync(INDEX, 'utf8');
  const pageDois = new Set([...md.matchAll(/doi\.org\/(10\.[^>\s)]+)/g)].map(m => normDoi(m[1])));
  const pageText = normText(md);
  let ignore = { dois: [], titles: [] };
  try { ignore = JSON.parse(fs.readFileSync(IGNORE, 'utf8')); } catch (e) { /* optional */ }
  const ignoreDois = new Set((ignore.dois || []).map(normDoi));
  const ignoreTitles = (ignore.titles || []).map(normText);

  const data = await getJson('https://pub.orcid.org/v3.0/' + ORCID + '/works');
  const works = (data.group || []).map(g => {
    const s = g['work-summary'][0];
    const ids = (s['external-ids'] && s['external-ids']['external-id']) || [];
    const doi = ids.find(i => i['external-id-type'] === 'doi');
    return {
      title: s.title && s.title.title && s.title.title.value,
      year: s['publication-date'] && s['publication-date'].year && s['publication-date'].year.value,
      type: s.type,
      doi: doi ? normDoi(doi['external-id-value']) : null,
      putCode: s['put-code'],
    };
  });

  const candidates = works.filter(w => TARGETS[w.type] && w.doi && !pageDois.has(w.doi) && !ignoreDois.has(w.doi))
    .filter(w => {
      const t = normText(w.title);
      if (t.length > 25 && pageText.includes(t.slice(0, 60))) return false;      // same paper, different/missing DOI on the page
      return !ignoreTitles.some(x => x && t.startsWith(x.slice(0, 60)));
    });

  console.log('ORCID works: ' + works.length + '; on page: ' + pageDois.size + ' DOIs; new candidates: ' + candidates.length);

  const proposals = [];
  for (const w of candidates) {
    try {
      const cr = (await getJson('https://api.crossref.org/works/' + encodeURIComponent(w.doi))).message;
      const d = draftEntry(cr, w.doi, w.type);
      proposals.push({ doi: w.doi, type: w.type, list: TARGETS[w.type].label, year: d.year, title: d.title, journal: d.journal, cite: d.cite, orcid: 'https://orcid.org/' + ORCID + '/work/' + w.putCode });
    } catch (e) {
      proposals.push({ doi: w.doi, type: w.type, list: TARGETS[w.type].label, year: w.year, title: w.title, cite: null, error: e.message, orcid: 'https://orcid.org/' + ORCID + '/work/' + w.putCode });
    }
  }
  proposals.sort((a, b) => String(b.year).localeCompare(String(a.year)));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'new-publications.json'), JSON.stringify(proposals, null, 2) + '\n');

  const body = [];
  body.push('ORCID lists ' + proposals.length + ' publication' + (proposals.length === 1 ? '' : 's') + ' with a DOI that ' + (proposals.length === 1 ? 'is' : 'are') + ' not on the CV page yet. Each has been drafted from its Crossref record and inserted at the top of the matching list in `index.md`.');
  body.push('');
  body.push('Before merging, for each entry:');
  body.push('- [ ] check author order, initials and the title against the published paper');
  body.push('- [ ] add the journal ranking, e.g. `Scimago Q1`, at the end of the line');
  body.push('- [ ] move it to another list (or delete it) if it is not an original research article / book chapter');
  body.push('');
  for (const p of proposals) {
    body.push('### ' + (p.title || p.doi));
    body.push('- List: **' + p.list + '**  ·  DOI: https://doi.org/' + p.doi + '  ·  [ORCID record](' + p.orcid + ')');
    body.push(p.cite ? '- Drafted entry: `' + p.cite + '`' : '- Could not fetch the Crossref record (' + p.error + '); add it by hand.');
    body.push('');
  }
  body.push('Not wanted on the CV? Add its DOI to `scripts/publications-ignore.json` and close this pull request; it will not be proposed again.');
  fs.writeFileSync(path.join(OUT_DIR, 'pr-body.md'), body.join('\n') + '\n');

  if (MODE === 'write' && proposals.some(p => p.cite)) {
    let out = md;
    for (const p of proposals.filter(x => x.cite).reverse()) {
      const heading = TARGETS[p.type].heading;
      const at = out.indexOf(heading);
      if (at === -1) { console.warn('heading not found for ' + p.doi + ': ' + heading); continue; }
      const listStart = out.indexOf('\n1. ', at);
      if (listStart === -1) { console.warn('list not found after ' + heading); continue; }
      out = out.slice(0, listStart + 1) + '1. ' + p.cite + '\n' + out.slice(listStart + 1);
    }
    if (out !== md) fs.writeFileSync(INDEX, out);
  }

  proposals.forEach(p => console.log(' - [' + p.list + '] ' + (p.cite || p.title + ' (' + p.error + ')')));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'count=' + proposals.length + '\n');
})().catch(e => { console.error('check-orcid: ' + e.message); process.exit(1); });
