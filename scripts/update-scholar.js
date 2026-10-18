#!/usr/bin/env node
/* Fetches Google Scholar author metrics through SerpAPI and writes them to
   assets/data/scholar.json. Run by .github/workflows/scholar.yml.

   Environment:
     SERPAPI_KEY   SerpAPI key (repository secret)
     SCHOLAR_USER  Google Scholar author id (the "user=" value in the profile URL)
*/
const fs = require('fs');
const path = require('path');

const key = process.env.SERPAPI_KEY;
const user = process.env.SCHOLAR_USER;
if (!key) fail('SERPAPI_KEY is not set (add it under Settings → Secrets and variables → Actions).');
if (!user) fail('SCHOLAR_USER is not set.');

const out = path.resolve(__dirname, '..', 'assets', 'data', 'scholar.json');
const url = 'https://serpapi.com/search.json?engine=google_scholar_author&hl=en&author_id=' + encodeURIComponent(user) + '&api_key=' + encodeURIComponent(key);

(async () => {
  const res = await fetch(url, { headers: { 'User-Agent': 'clintdouglas.github.io scholar-metrics' } });
  if (!res.ok) fail('SerpAPI responded ' + res.status + ' ' + res.statusText);
  const data = await res.json();
  if (data.error) fail('SerpAPI error: ' + data.error);

  // Response shape: cited_by.table = [{citations:{all,since_YYYY}}, {h_index:{...}}, {i10_index:{...}}]
  const table = (data.cited_by && data.cited_by.table) || [];
  const metrics = {};
  for (const row of table) {
    for (const [name, vals] of Object.entries(row)) {
      if (!vals || typeof vals !== 'object') continue;
      const sinceKey = Object.keys(vals).find(k => k.startsWith('since_'));
      metrics[name] = { all: Number(vals.all), since: sinceKey ? Number(vals[sinceKey]) : null, since_year: sinceKey ? Number(sinceKey.slice(6)) : null };
    }
  }
  if (!metrics.h_index || !Number.isFinite(metrics.h_index.all)) fail('No h-index in the SerpAPI response: ' + JSON.stringify(data).slice(0, 400));

  const result = {
    source: 'Google Scholar',
    profile: 'https://scholar.google.com/citations?user=' + user,
    updated: new Date().toISOString().slice(0, 10),
    h_index: metrics.h_index.all,
    i10_index: metrics.i10_index ? metrics.i10_index.all : null,
    citations: metrics.citations ? metrics.citations.all : null,
    since_year: metrics.h_index.since_year,
    h_index_since: metrics.h_index.since,
    i10_index_since: metrics.i10_index ? metrics.i10_index.since : null,
    citations_since: metrics.citations ? metrics.citations.since : null,
  };

  // Keep the previous "updated" date when the numbers have not moved, so the commit step sees no diff.
  try {
    const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
    const same = ['h_index', 'i10_index', 'citations', 'since_year', 'h_index_since', 'i10_index_since', 'citations_since'].every(k => prev[k] === result[k]);
    if (same) result.updated = prev.updated;
  } catch (e) { /* no previous file */ }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log('Wrote', path.relative(process.cwd(), out), JSON.stringify(result));
})().catch(e => fail(e.message));

function fail(msg) { console.error('update-scholar: ' + msg); process.exit(1); }
