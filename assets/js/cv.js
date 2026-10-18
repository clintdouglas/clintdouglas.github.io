/* Progressive enhancements for the CV page. The page reads fine without JS;
   this groups each section into a two-column block, adds ranking badges,
   author highlighting, year dividers, a publications filter, nav highlighting
   and a back-to-top button. */
(function () {
  'use strict';

  var cv = document.querySelector('.cv');
  if (!cv) return;

  /* ---- 1. Group each h2 and what follows it into <section class="sec"> ---- */
  var nodes = Array.prototype.slice.call(cv.childNodes);
  var current = null;
  nodes.forEach(function (node) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      current = document.createElement('section');
      current.className = 'sec';
      current.setAttribute('aria-labelledby', node.id);
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

  /* ---- 2. Mark year-led lists (Education, Awards, Positions, Internships) ---- */
  cv.querySelectorAll('ul').forEach(function (ul) {
    var items = ul.querySelectorAll(':scope > li');
    var dated = 0;
    items.forEach(function (li) {
      var first = li.firstElementChild;
      if (first && first.tagName === 'STRONG' && li.firstChild === first && /\d{4}/.test(first.textContent)) dated++;
    });
    if (items.length && dated === items.length) ul.classList.add('dated');
  });

  /* ---- 3. Ranking badges + author highlight inside numbered lists ---- */
  var lists = cv.querySelectorAll('ol');
  lists.forEach(function (ol) {
    ol.querySelectorAll(':scope > li').forEach(function (li) {
      walkText(li, function (node) {
        var text = node.nodeValue;
        if (!/Scimago [QD]\d|Douglas,? C\./.test(text)) return;
        var frag = document.createDocumentFragment();
        var re = /(Scimago ([QD]\d))|(\bDouglas,? C\.)/g;
        var last = 0, m;
        while ((m = re.exec(text))) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          if (m[1]) {
            var rank = m[2];
            var b = document.createElement('span');
            b.className = 'badge ' + rank.toLowerCase();
            b.textContent = rank;
            b.title = rank === 'D1' ? 'Scimago journal rank: top decile' : 'Scimago journal rank: quartile ' + rank.slice(1);
            frag.appendChild(b);
          } else {
            var s = document.createElement('span');
            s.className = 'me';
            s.textContent = m[3];
            frag.appendChild(s);
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
  var pubHeading = document.getElementById('publications');
  var pubBody = pubHeading && pubHeading.closest('.sec') ? pubHeading.closest('.sec').querySelector('.sec-body') : null;
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

    var pubItems = Array.prototype.slice.call(pubBody.querySelectorAll('ol > li'));
    var total = pubItems.filter(function (li) { return !li.classList.contains('year-marker'); }).length;

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      pubItems.forEach(function (li) {
        if (li.classList.contains('year-marker')) { li.classList.toggle('is-hidden', !!q); return; }
        var hit = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
        li.classList.toggle('is-hidden', !hit);
        if (hit) shown++;
      });
      out.textContent = q ? shown + ' of ' + total : '';
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

  /* ---- 6. Nav highlighting ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var toTop = document.querySelector('[data-to-top]');
  if (targets.length) {
    var active = null;
    var setActive = function (id) {
      if (id === active) return;
      active = id;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        if (on) {
          var scroller = a.closest('ul');
          if (scroller && scroller.scrollWidth > scroller.clientWidth) {
            var r = a.getBoundingClientRect(), s = scroller.getBoundingClientRect();
            scroller.scrollTo({ left: scroller.scrollLeft + (r.left - s.left) - (s.width - r.width) / 2, behavior: 'smooth' });
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
      if (current) setActive(current.id);
      else if (active) { active = null; links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); }); }
      if (toTop) toTop.hidden = window.scrollY < window.innerHeight * 0.8;
    };
    var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---- 7. Print buttons ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-print]'), function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  /* ---- 8. Re-apply a #hash from the URL now that the layout has changed ---- */
  if (location.hash && location.hash.length > 1) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) window.requestAnimationFrame(function () { target.scrollIntoView({ block: 'start' }); });
  }
})();
