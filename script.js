/* ============ Clearway Driving School — interactions ============ */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Year ---- */
  var yEl = $('#year'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---- Mobile nav ---- */
  var toggle = $('#navToggle');
  var nav = $('#primary-nav');
  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
  }

  /* ---- Smooth scroll with sticky-header offset ---- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var headerH = ($('.site-header') || {}).offsetHeight || 72;
      var y = target.getBoundingClientRect().top + window.pageYOffset - headerH + 4;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ============ FEATURE A: Block-booking calculator ============ */
  (function () {
    var rates = { manual: 36, automatic: 39 };
    var hoursInput = $('#hours');
    var range = $('#hoursRange');
    if (!hoursInput) return;

    var gbp = function (n) { return '£' + n.toFixed(2); };

    function discountFor(h) {
      if (h >= 30) return 0.15;
      if (h >= 20) return 0.10;
      if (h >= 10) return 0.05;
      return 0;
    }

    function render() {
      var gb = (document.querySelector('input[name="gearbox"]:checked') || {}).value || 'manual';
      var rate = rates[gb];
      var h = Math.max(1, Math.min(60, parseInt(hoursInput.value, 10) || 1));
      var subtotal = rate * h;
      var disc = discountFor(h);
      var discAmt = subtotal * disc;
      var total = subtotal - discAmt;

      $('#outRate').textContent = gbp(rate);
      $('#outHoursLabel').textContent = h + (h === 1 ? ' hour' : ' hours');
      $('#outSubtotal').textContent = gbp(subtotal);

      var discRow = $('#discountRow');
      if (disc > 0) {
        discRow.style.display = '';
        $('#outDiscLabel').textContent = 'Block discount (' + Math.round(disc * 100) + '%)';
        $('#outDiscount').textContent = '−' + gbp(discAmt);
        $('#outSave').textContent = 'You save ' + gbp(discAmt) + ' vs paying per lesson.';
        $('#outSave').style.display = '';
      } else {
        discRow.style.display = 'none';
        $('#outSave').textContent = 'Book 10+ hours to unlock a 5% block discount.';
      }
      $('#outTotal').textContent = gbp(total);
    }

    function sync(v) {
      var h = Math.max(1, Math.min(60, parseInt(v, 10) || 1));
      hoursInput.value = h; range.value = h; render();
    }

    hoursInput.addEventListener('input', function () { range.value = hoursInput.value || 1; render(); });
    hoursInput.addEventListener('change', function () { sync(hoursInput.value); });
    range.addEventListener('input', function () { sync(range.value); });
    $('#hoursPlus').addEventListener('click', function () { sync((parseInt(hoursInput.value, 10) || 0) + 1); });
    $('#hoursMinus').addEventListener('click', function () { sync((parseInt(hoursInput.value, 10) || 0) - 1); });
    $$('input[name="gearbox"]').forEach(function (r) { r.addEventListener('change', render); });
    render();
  })();

  /* ============ FEATURE B: Postcode coverage checker ============ */
  (function () {
    var form = $('#postcodeForm');
    if (!form) return;
    var result = $('#postcode-result');
    // Covered outward codes (Nottingham area)
    var covered = ['NG1','NG2','NG3','NG4','NG5','NG6','NG7','NG8','NG9','NG11','NG14','NG16'];

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = ($('#postcode').value || '').toUpperCase().replace(/\s+/g, '');
      result.classList.remove('ok', 'no');

      if (!raw) {
        result.textContent = 'Please enter a postcode to check.';
        result.classList.add('no');
        return;
      }
      // Outward code = letters + leading digits, before the inward part
      var m = raw.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/);
      var outward = m ? m[1] : raw;
      // Normalise NG1A style won't appear here; strip trailing letter if it makes a known code
      var base = outward.replace(/([A-Z]{1,2}\d{1,2})[A-Z]?$/, '$1');

      if (covered.indexOf(base) !== -1) {
        result.textContent = '✓ Great news — we cover ' + base + '! Book below and we\'ll collect you from your door.';
        result.classList.add('ok');
      } else if (/^NG\d/.test(base)) {
        result.textContent = '✗ Sorry, ' + base + ' is just outside our usual area. Call us on 0115 960 7421 — we sometimes make exceptions.';
        result.classList.add('no');
      } else {
        result.textContent = '✗ That postcode looks outside Nottingham. We currently teach NG1–NG9, NG11, NG14 and NG16 only.';
        result.classList.add('no');
      }
    });
  })();

  /* ============ FEATURE C: Booking form validation ============ */
  (function () {
    var form = $('#bookForm');
    if (!form) return;
    var success = $('#bookSuccess');

    var validators = {
      name: function (v) { return v.trim().length >= 2 || 'Please enter your name.'; },
      phone: function (v) {
        var d = v.replace(/[^\d+]/g, '');
        return d.replace(/\D/g, '').length >= 10 || 'Please enter a valid phone number.';
      },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.'; }
    };

    function showError(field, msg) {
      var input = $('#' + field);
      var box = $('.error[data-for="' + field + '"]');
      if (msg === true) {
        input.removeAttribute('aria-invalid');
        if (box) box.textContent = '';
        return true;
      }
      input.setAttribute('aria-invalid', 'true');
      if (box) box.textContent = msg;
      return false;
    }

    Object.keys(validators).forEach(function (f) {
      var input = $('#' + f);
      input.addEventListener('blur', function () {
        if (input.value.trim()) showError(f, validators[f](input.value));
      });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid')) showError(f, validators[f](input.value));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      Object.keys(validators).forEach(function (f) {
        var res = validators[f]($('#' + f).value);
        if (!showError(f, res)) { ok = false; if (!firstBad) firstBad = $('#' + f); }
      });
      if (!ok) { if (firstBad) firstBad.focus(); return; }

      success.hidden = false;
      $('#successName').textContent = ($('#name').value.trim().split(' ')[0]) || 'there';
      form.querySelector('button[type="submit"]').disabled = true;
      form.querySelector('button[type="submit"]').textContent = 'Request sent ✓';
      success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      success.focus && success.setAttribute('tabindex', '-1');
    });
  })();

  /* ============ FEATURE D: Animated counters ============ */
  (function () {
    var counters = $$('#counters strong[data-target]');
    if (!counters.length) return;

    function animate(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduceMotion) { el.textContent = target.toLocaleString() + suffix; return; }
      var start = null, dur = 1600;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  })();

  /* ============ FEATURE E: FAQ accordion ============ */
  (function () {
    var triggers = $$('.acc-trigger');
    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        if (open) {
          panel.style.maxHeight = '0px';
        } else {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
    // Recalc open panel heights on resize
    window.addEventListener('resize', function () {
      $$('.acc-trigger[aria-expanded="true"]').forEach(function (b) {
        var p = document.getElementById(b.getAttribute('aria-controls'));
        if (p) p.style.maxHeight = p.scrollHeight + 'px';
      });
    });
  })();

  /* ============ Scroll reveal ============ */
  (function () {
    var els = $$('.reveal');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

})();
