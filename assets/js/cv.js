/* Progressive enhancements for the CV page. The page reads fine without JS;
   this groups each section into a two-column block, adds ranking badges,
   author highlighting, year dividers, a publications filter, citation
   metrics, nav highlighting and a back-to-top button. */
(function () {
  'use strict';

  var cv = document.querySelector('.cv');
  if (!cv) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Group each h2 and what follows it into <section class="sec"> ----
     The anchor id moves from the (sticky) heading to the section so that
     #links and the scroll-spy target a non-sticky box. */
  var nodes = Array.prototype.slice.call(cv.childNodes);
  var current = null;
  nodes.forEach(function (node) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      current = document.createElement('section');
      current.className = 'sec';
      if (node.id) {
        current.id = node.id;
        node.id = node.id + '-heading';
        current.setAttribute('aria-labelledby', node.id);
      }
      var head = document.createElement('div');
      head.className = 'sec-head';
      var body = document.createElement('div');
      body.className = 'sec-body';
      cv.insertBefore(current, node);
      head.appendChild(node);
      current.appendChild(head);
      current.appendChild(body);
      return;
    }
    if (current) current.querySelector('.sec-body').appendChild(node);
  });

  /* ---- 2. Lists: keep list semantics in WebKit, mark year-led lists, number items ---- */
  cv.querySelectorAll('ul, ol').forEach(function (list) { list.setAttribute('role', 'list'); });

  cv.querySelectorAll('ul').forEach(function (ul) {
    var items = ul.querySelectorAll(':scope > li');
    var dated = 0;
    items.forEach(function (li) {
      var host = li.firstElementChild && li.firstElementChild.tagName === 'P' ? li.firstElementChild : li;
      var first = host.firstElementChild;
      if (first && first.tagName === 'STRONG' && host.firstChild === first && /\d{4}/.test(first.textContent)) dated++;
    });
    if (items.length && dated === items.length) ul.classList.add('dated');
  });

  var lists = cv.querySelectorAll('ol');
  lists.forEach(function (ol) {
    var n = 0;
    ol.querySelectorAll(':scope > li').forEach(function (li) { li.dataset.n = ++n; });
  });

  /* ---- 3. Ranking badges + author highlight inside numbered lists ----
     Only the first "Douglas, C." in an entry is the author of this CV; a
     later one is a co-author with the same initial (e.g. Carol Douglas). */
  lists.forEach(function (ol) {
    ol.querySelectorAll(':scope > li').forEach(function (li) {
      var selfMarked = false;
      walkText(li, function (node) {
        var text = node.nodeValue;
        if (!/Scimago [QD]\d|Douglas,? C\./.test(text)) return;
        var frag = document.createDocumentFragment();
        var re = /(Scimago ([QD]\d))|(\bDouglas,? C\.)/g;
        var last = 0, m;
        while ((m = re.exec(text))) {
          if (m[3] && selfMarked) continue;
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          if (m[1]) {
            var rank = m[2];
            var b = document.createElement('span');
            b.className = 'badge ' + rank.toLowerCase();
            var hiddenPrefix = document.createElement('span');
            hiddenPrefix.className = 'visually-hidden';
            hiddenPrefix.textContent = 'Scimago ';
            b.appendChild(hiddenPrefix);
            b.appendChild(document.createTextNode(rank));
            b.title = rank === 'D1' ? 'Scimago journal rank: top decile' : 'Scimago journal rank: quartile ' + rank.slice(1);
            frag.appendChild(b);
          } else {
            var s = document.createElement('span');
            s.className = 'me';
            s.textContent = m[3];
            frag.appendChild(s);
            selfMarked = true;
          }
          last = re.lastIndex;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    });
  });

  function walkText(root, fn) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var found = [];
    while (walker.nextNode()) found.push(walker.currentNode);
    found.forEach(fn);
  }

  /* ---- 4. Year dividers in reverse-chronological numbered lists ---- */
  lists.forEach(function (ol) {
    var items = Array.prototype.slice.call(ol.querySelectorAll(':scope > li'));
    if (items.length < 6) return;
    var prev = null;
    items.forEach(function (li) {
      var m = li.textContent.slice(0, 260).match(/\((\d{4})\)/);
      if (!m) return;
      var year = m[1];
      li.dataset.year = year;
      if (year !== prev) {
        var marker = document.createElement('li');
        marker.className = 'year-marker';
        marker.setAttribute('aria-hidden', 'true');
        marker.dataset.year = year;
        marker.textContent = year;
        ol.insertBefore(marker, li);
        prev = year;
      }
    });
  });

  /* ---- 5. Publications filter ---- */
  var pubSection = document.getElementById('publications');
  var pubBody = pubSection && pubSection.classList.contains('sec') ? pubSection.querySelector('.sec-body') : null;
  if (pubBody) {
    var wrap = document.createElement('div');
    wrap.className = 'filter';
    var label = document.createElement('label');
    label.setAttribute('for', 'pub-filter');
    label.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="visually-hidden">Filter publications</span>';
    var input = document.createElement('input');
    input.type = 'search';
    input.id = 'pub-filter';
    input.placeholder = 'Filter publications by author, title, journal or year';
    input.autocomplete = 'off';
    var out = document.createElement('output');
    out.setAttribute('for', 'pub-filter');
    out.setAttribute('aria-live', 'polite');
    wrap.appendChild(label); wrap.appendChild(input); wrap.appendChild(out);
    pubBody.insertBefore(wrap, pubBody.firstChild);

    var norm = function (s) { return s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); };
    var pubItems = Array.prototype.slice.call(pubBody.querySelectorAll('ol > li'));
    var texts = pubItems.map(function (li) { return li.classList.contains('year-marker') ? '' : norm(li.textContent); });
    var groups = Array.prototype.slice.call(pubBody.querySelectorAll('ol')).map(function (ol) {
      var h = ol.previousElementSibling;
      while (h && h.tagName !== 'H3') h = h.previousElementSibling;
      return { ol: ol, heading: h };
    });
    var total = texts.filter(Boolean).length;

    var applyFilter = function () {
      var q = norm(input.value.trim());
      var shown = 0;
      pubItems.forEach(function (li, i) {
        if (li.classList.contains('year-marker')) { li.classList.toggle('is-hidden', !!q); return; }
        var hit = !q || texts[i].indexOf(q) !== -1;
        li.classList.toggle('is-hidden', !hit);
        if (hit) shown++;
      });
      groups.forEach(function (g) {
        var any = !q || !!g.ol.querySelector(':scope > li:not(.year-marker):not(.is-hidden)');
        g.ol.classList.toggle('is-hidden', !any);
        if (g.heading) g.heading.classList.toggle('is-hidden', !any);
      });
      out.textContent = q ? shown + ' of ' + total : '';
    };
    input.addEventListener('input', applyFilter);
    window.addEventListener('beforeprint', function () {
      if (input.value) { input.value = ''; applyFilter(); }
    });
  }

  /* ---- 5b. Google Scholar metrics line (data refreshed weekly by a GitHub Action) ---- */
  if (pubBody && window.fetch) {
    var sources = [cv.getAttribute('data-scholar-raw'), cv.getAttribute('data-scholar-json')].filter(Boolean);
    var tryNext = function (i) {
      if (i >= sources.length) return;
      fetch(sources[i], { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(renderMetrics)
        .catch(function () { tryNext(i + 1); });
    };
    tryNext(0);
  }

  function renderMetrics(d) {
    if (!d || !Number.isFinite(d.h_index)) return;
    var fmt = function (n) { return Number(n).toLocaleString('en-AU'); };
    var p = document.createElement('p');
    p.className = 'metrics';
    var parts = [];
    if (d.profile) parts.push('<a class="metrics-source" href="' + d.profile + '" rel="me">' + (d.source || 'Google Scholar') + '</a>');
    parts.push('<span class="metric"><b>' + fmt(d.h_index) + '</b> h-index</span>');
    if (Number.isFinite(d.i10_index)) parts.push('<span class="metric"><b>' + fmt(d.i10_index) + '</b> i10-index</span>');
    if (Number.isFinite(d.citations)) parts.push('<span class="metric"><b>' + fmt(d.citations) + '</b> citations</span>');
    if (d.updated) {
      var dt = new Date(d.updated + 'T00:00:00');
      var label = isNaN(dt) ? d.updated : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      parts.push('<span class="metrics-updated">updated ' + label + '</span>');
    }
    p.innerHTML = parts.join(' ');
    var filter = pubBody.querySelector('.filter');
    pubBody.insertBefore(p, filter || pubBody.firstChild);
  }

  /* ---- 6. Nav highlighting + back-to-top ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var toTop = document.querySelector('[data-to-top]');
  if (toTop) { toTop.hidden = false; toTop.classList.add('is-off'); }
  if (targets.length) {
    var active = null;
    var setActive = function (id) {
      if (id === active) return;
      active = id;
      links.forEach(function (a) {
        var on = id !== null && a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        if (on) {
          var scroller = a.closest('ul');
          if (scroller && scroller.scrollWidth > scroller.clientWidth) {
            var r = a.getBoundingClientRect(), s = scroller.getBoundingClientRect();
            scroller.scrollTo({ left: scroller.scrollLeft + (r.left - s.left) - (s.width - r.width) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
          }
        }
      });
    };
    var ticking = false;
    var update = function () {
      ticking = false;
      var line = window.innerHeight * 0.3;
      var current = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top <= line) current = targets[i];
      }
      var doc = document.documentElement;
      if (current && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) current = targets[targets.length - 1];
      setActive(current ? current.id : null);
      if (toTop) toTop.classList.toggle('is-off', window.scrollY < window.innerHeight * 0.8);
    };
    var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---- 7. Print buttons (hidden until JS is available) ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-print], [data-print-item]'), function (el) {
    el.hidden = false;
    if (el.hasAttribute('data-print')) el.addEventListener('click', function () { window.print(); });
  });

  /* ---- 8. Re-apply a #hash from the URL now that the layout has changed ---- */
  if (location.hash.length > 1) {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = location.hash.slice(1); }
    var target = document.getElementById(id);
    if (target) window.requestAnimationFrame(function () { target.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }
})();
