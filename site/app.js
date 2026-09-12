/* driftwatch — the field book, the reliability diagram, and the overprint. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------------------------------------------------------------
     The field book.

     Every sequence below is real output. `pretty` is rendered the way
     src/report/pretty.ts renders it, `--json` follows the version 1
     contract, and the clean run is driftwatch over its own repository.
     A line is an array of [class, text] segments.
  --------------------------------------------------------------- */

  var E = '';

  var SEQ = {
    demo: {
      cmd: 'driftwatch',
      out: [
        [['file', 'AGENTS.md']],
        [['err', '  ✗ 3'], [E, '  src/util/date.ts  path does not exist'], ['dim', '  → src/helpers/date.ts?']],
        [['err', '  ✗ 5'], [E, '  src/cli.ts        path does not exist']],
        [],
        [[E, '1 file · 2 problems (2 errors) · 59ms']],
        [['dim', '1 fixable with --fix']]
      ]
    },
    dry: {
      cmd: 'driftwatch --fix --dry-run',
      out: [
        [['file', 'AGENTS.md']],
        [['err', '  ✗ 3'], [E, '  src/util/date.ts  path does not exist'], ['dim', '  → src/helpers/date.ts?']],
        [['err', '  ✗ 5'], [E, '  src/cli.ts        path does not exist']],
        [],
        [['dim', 'would fix']],
        [['file', 'AGENTS.md']],
        [[E, '    3  src/util/date.ts'], ['dim', '  →  '], [E, 'src/helpers/date.ts']],
        [],
        [[E, '1 file · 2 problems (2 errors) · 61ms']],
        [['dim', '1 fix would apply in 1 file']]
      ]
    },
    fix: {
      cmd: 'driftwatch --fix',
      out: [
        [['file', 'AGENTS.md']],
        [['err', '  ✗ 5'], [E, '  src/cli.ts  path does not exist']],
        [],
        [['dim', 'fixed']],
        [['file', 'AGENTS.md']],
        [['ok', '  ✓ 3'], [E, '  src/util/date.ts'], ['dim', '  →  '], [E, 'src/helpers/date.ts']],
        [],
        [[E, '1 file · 1 problem (1 error) · 64ms']],
        [['dim', '1 fix applied in 1 file']]
      ]
    },
    json: {
      cmd: 'driftwatch --json',
      out: [
        [[E, '{']],
        [['key', '  "version"'], [E, ': '], ['num', '1'], [E, ',']],
        [['key', '  "root"'], [E, ': '], ['str', '"/home/you/your-repo"'], [E, ',']],
        [['key', '  "durationMs"'], [E, ': '], ['num', '59'], [E, ',']],
        [['key', '  "summary"'], [E, ': { '], ['key', '"sources"'], [E, ': '], ['num', '1'], [E, ', '], ['key', '"claims"'], [E, ': '], ['num', '27'], [E, ', '], ['key', '"errors"'], [E, ': '], ['num', '2'], [E, ', '], ['key', '"fixable"'], [E, ': '], ['num', '1'], [E, ' },']],
        [['key', '  "findings"'], [E, ': [']],
        [[E, '    {']],
        [['key', '      "check"'], [E, ': '], ['str', '"path/missing"'], [E, ',']],
        [['key', '      "severity"'], [E, ': '], ['str', '"error"'], [E, ',']],
        [['key', '      "file"'], [E, ': '], ['str', '"AGENTS.md"'], [E, ', '], ['key', '"line"'], [E, ': '], ['num', '3'], [E, ', '], ['key', '"column"'], [E, ': '], ['num', '16'], [E, ',']],
        [['key', '      "text"'], [E, ': '], ['str', '"src/util/date.ts"'], [E, ',']],
        [['key', '      "message"'], [E, ': '], ['str', '"path does not exist"'], [E, ',']],
        [['key', '      "suggestion"'], [E, ': { '], ['key', '"value"'], [E, ': '], ['str', '"src/helpers/date.ts"'], [E, ', '], ['key', '"confidence"'], [E, ': '], ['num', '0.86'], [E, ', '], ['key', '"fixable"'], [E, ': '], ['num', 'true'], [E, ' }']],
        [[E, '    }']],
        [[E, '  ]']],
        [[E, '}']]
      ]
    },
    gh: {
      cmd: 'driftwatch --format github',
      out: [
        [['err', '::error '], [E, 'file=AGENTS.md,line=3,col=16,endColumn=32,title=path/missing::path does not exist → src/helpers/date.ts?']],
        [['err', '::error '], [E, 'file=AGENTS.md,line=5,col=16,endColumn=26,title=path/missing::path does not exist']],
        [],
        [['dim', 'One native annotation per finding, and nothing else — the job log is']],
        [['dim', 'the transport, so any line that is not a workflow command is noise.']]
      ]
    },
    clean: {
      cmd: 'driftwatch',
      out: [
        [['ok', '✓'], [E, ' 4 files · no drift · 192ms']],
        [],
        [['dim', 'A clean run over driftwatch’s own repository. `summary.claims` in']],
        [['dim', '--json is the number that says how much was looked at, which is what']],
        [['dim', 'matters in CI, where nobody reads the output of a green run.']]
      ]
    }
  };

  /* What the copy button puts on your clipboard, run. Same output as `demo` —
     it is the same command — but it opens with the line you just copied, so
     the two halves of the page answer each other. */
  SEQ.npx = { cmd: 'npx @abr4xas/driftwatch', out: SEQ.demo.out };

  var screen = document.getElementById('screen');
  var keys = document.querySelectorAll('[data-run]');
  var timers = [];
  var playing = false;

  var raf = 0;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  /* Typing is driven off rAF and a real clock, not a chain of setTimeouts: a
     background tab throttles timers to once a second and would otherwise leave
     a visitor staring at a half-typed prompt. A hidden tab skips the animation
     outright and renders the finished run. */
  function typeOut(text, onChar, done) {
    var start = 0;
    var shown = -1;
    var CPS = 26;
    raf = requestAnimationFrame(function step(now) {
      if (!start) start = now;
      var n = Math.min(text.length, Math.floor((now - start) / 1000 * CPS));
      if (n !== shown) { shown = n; onChar(text.slice(0, n)); }
      if (n >= text.length) { raf = 0; at(200, done); return; }
      raf = requestAnimationFrame(step);
    });
  }

  function span(cls, text) {
    var s = document.createElement('span');
    if (cls) s.className = cls;
    s.textContent = text;
    return s;
  }

  function lineEl(segs) {
    var d = document.createElement('div');
    if (!segs || !segs.length) { d.textContent = ' '; return d; }
    segs.forEach(function (seg) { d.appendChild(span(seg[0], seg[1])); });
    return d;
  }

  function promptEl(typed, caret) {
    var d = document.createElement('div');
    d.appendChild(span('p', '$ '));
    d.appendChild(span('cmd', typed));
    if (caret) d.appendChild(span('caret', ''));
    return d;
  }

  function play(name) {
    var seq = SEQ[name];
    if (!seq) return;
    clearTimers();
    playing = true;
    screen.textContent = '';

    keys.forEach(function (b) { b.classList.toggle('on', b.dataset.run === name); });

    var head = promptEl('', !reduced);
    screen.appendChild(head);

    function dumpOutput() {
      head.replaceWith(promptEl(seq.cmd, false));
      var blank = document.createElement('div');
      blank.textContent = ' ';
      screen.appendChild(blank);
      seq.out.forEach(function (segs, i) {
        if (reduced || document.hidden) { screen.appendChild(lineEl(segs)); return; }
        at(28 * i, function () { screen.appendChild(lineEl(segs)); });
      });
      at(28 * seq.out.length + 40, function () { playing = false; });
    }

    if (reduced || document.hidden) { dumpOutput(); return; }

    typeOut(seq.cmd, function (partial) {
      head.replaceWith(head = promptEl(partial, true));
    }, dumpOutput);
  }

  keys.forEach(function (b) {
    b.addEventListener('click', function () { play(b.dataset.run); });
  });

  /* Autoplay the default run once the field book is on screen. */
  if (screen) {
    var started = false;
    var kick = function () {
      if (started) return;
      started = true;
      play('demo');
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { kick(); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(screen);
    } else {
      kick();
    }
  }

  /* ---------------------------------------------------------------
     The reliability diagram.

     One cell per repository in test/corpus/snapshots. The cells are not a
     picture of the measurement — each one carries the repository's real
     findings, read out of the committed snapshots at build time: the claim
     the document made, and the replacement driftwatch would suggest where
     there is exactly one. Pointing at a cell shows you the sentence that
     turned out to be false.

     It is a grid, so it is navigable as one: tab in once, then arrow around.
  --------------------------------------------------------------- */

  var cells = document.getElementById('cells');
  var readout = document.getElementById('readout');

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  if (cells && typeof CORPUS !== 'undefined') {
    /* The unit is the context file, not the repository. driftwatch reads 236
       of them across these 66 repos, and 19 say something that is no longer
       true. A grid of 66 equal squares threw that away and reported a repo
       with one document as the peer of a repo with twenty-two. Every mark
       below is one file; the runs are the repos. */
    var buttons = [];
    var active = 0;
    var marked = 0;

    var idle =
      '<p class="ro-idle"><b>236 context files</b> across 66 repositories. ' +
      'The <b class="lit">19</b> lit ones say something the repository contradicts — ' +
      'point at a run to read what.</p>';

    function esc(s) {
      return String(s).replace(/[&<>]/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch];
      });
    }

    function render(r) {
      var head = '<p class="ro-head"><b>' + esc(r.n) + '</b>' +
        '<span>' + plural(r.s, 'context file', 'context files') +
        (r.v ? ' · validation' : '') + '</span>' +
        (r.f.length
          ? '<span class="hit">' + plural(r.f.length, 'finding', 'findings') + '</span>'
          : '<span>no drift</span>') +
        '</p>';

      if (!r.f.length) return head;

      var rows = r.f.map(function (x) {
        return '<li>' +
          '<span class="ro-loc">' + esc(x.f) + ':' + x.l + '</span>' +
          '<span class="ro-claim"><s>' + esc(x.t) + '</s></span>' +
          (x.s ? '<span class="ro-fix">' + esc(x.s) + '</span>'
               : '<span class="ro-check">' + esc(x.c) + '</span>') +
          '</li>';
      }).join('');

      return head + '<ul class="ro-list">' + rows + '</ul>';
    }

    var resetTimer = null;

    function show(r) {
      if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
      readout.innerHTML = render(r);
      if (r.f.length) readout.dataset.hit = '1'; else delete readout.dataset.hit;
    }

    function reset() {
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        readout.innerHTML = idle;
        delete readout.dataset.hit;
      }, 900);
    }

    /* One tab stop for the whole field, the arrows move inside it. A
       sixty-six-stop tab sequence is not navigation, it is a wall. */
    function focusRun(i) {
      if (i < 0 || i >= buttons.length) return;
      buttons[active].tabIndex = -1;
      active = i;
      buttons[active].tabIndex = 0;
      buttons[active].focus();
    }

    var order = 0;

    CORPUS.forEach(function (r, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'run';
      b.setAttribute('aria-label',
        r.n + ', ' + plural(r.s, 'context file', 'context files') + ', ' +
        (r.f.length ? plural(r.f.length, 'finding', 'findings') : 'no drift'));
      b.tabIndex = i === 0 ? 0 : -1;
      if (r.f.length) b.dataset.hit = '1';

      /* One mark per context file. A file is lit when a finding names it, so a
         document with three bad claims lights once: the mark is the file, and
         the count belongs in the readout. */
      var bad = {};
      r.f.forEach(function (x) { bad[x.f] = true; });
      var names = Object.keys(bad);

      for (var k = 0; k < r.s; k++) {
        var m = document.createElement('i');
        m.className = 'mk';
        if (k < names.length) { m.dataset.lit = '1'; marked += 1; }
        m.style.setProperty('--i', order++);
        b.appendChild(m);
      }

      b.addEventListener('mouseenter', function () { show(r); });
      b.addEventListener('focus', function () { show(r); });
      b.addEventListener('mouseleave', reset);
      b.addEventListener('blur', reset);
      b.addEventListener('keydown', function (e) {
        var moved = true;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') focusRun(i + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') focusRun(i - 1);
        else if (e.key === 'Home') focusRun(0);
        else if (e.key === 'End') focusRun(buttons.length - 1);
        else moved = false;
        if (moved) e.preventDefault();
      });

      buttons.push(b);
      cells.appendChild(b);
    });

    readout.innerHTML = idle;
    cells.style.setProperty('--marks', order);

    /* The survey runs once, when it comes into view: the marks land in
       reading order and the failures ignite behind the sweep. It is the
       page's one authored moment, and it never replays.

       Visible is the default and the animation is the addition, never the
       other way round. Hiding the field first and waiting for an observer to
       reveal it means an observer that never fires — a throttled tab, a
       browser without one — leaves 236 marks at opacity zero and the section
       empty. `backwards` fill does the hiding, for exactly as long as each
       mark's own delay, and every run ends visible. */
    function runSurvey() {
      if (cells.dataset.armed) return;
      cells.dataset.armed = '1';
    }

    if (!reduced) {
      if (onScreen(cells)) {
        runSurvey();
      } else if ('IntersectionObserver' in window) {
        var fo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            runSurvey();
            fo.disconnect();
          });
        }, { threshold: 0.2 });
        fo.observe(cells);
        /* Failsafe. Missing the sweep costs a flourish; never running it
           would have cost the section. */
        setTimeout(runSurvey, 8000);
      } else {
        runSurvey();
      }
    }
  }

  function onScreen(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  }

  var COMBO = /Mac|iP(hone|ad|od)/.test(navigator.platform || '') ? '\u2318C' : 'Ctrl+C';

  function flash(btn, word, ms) {
    if (!btn.dataset.idle) btn.dataset.idle = btn.textContent;
    btn.textContent = word;
    btn.dataset.done = '1';
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      btn.textContent = btn.dataset.idle;
      delete btn.dataset.done;
    }, ms || 1600);
  }

  /* The clipboard write can be refused — no user activation, a permission
     policy, an insecure context. Saying "copied" anyway would be a lie about
     the one thing this button exists to do, so the failure path selects the
     command instead and names the shortcut that finishes the job. */
  function offerSelection(btn) {
    var code = btn.parentNode.querySelector('code');
    if (!code) return;
    var range = document.createRange();
    range.selectNodeContents(code);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    flash(btn, COMBO, 2600);
  }

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ok = function () {
        flash(btn, 'copied');
        /* If the field book is in front of you, run what you just copied.
           Only then: scrolling somebody back up to watch an animation is a
           flourish taking the page away from them. */
        if (onScreen(screen)) play('npx');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.dataset.copy).then(ok, function () { offerSelection(btn); });
      } else {
        offerSelection(btn);
      }
    });
  });

  var spec = document.querySelector('.spec-body');
  if (spec) {
    var strikes = Array.prototype.slice.call(spec.querySelectorAll('.spec-row s'));
    var draw = function () {
      strikes.forEach(function (s, i) {
        setTimeout(function () { s.style.setProperty('--strike', '1'); }, reduced ? 0 : 150 * i);
      });
    };
    if (!('IntersectionObserver' in window) || reduced) {
      draw();
    } else {
      strikes.forEach(function (s) { s.style.setProperty('--strike', '0'); });
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          draw();
          so.disconnect();
        });
      }, { threshold: 0.4 });
      so.observe(spec);
    }
  }
})();
