/* Skiron site behaviour. Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  // Paste the Web3Forms access key here and into the hidden access_key input in index.html.
  // The key is an alias for the destination address and is safe to publish.
  var WEB3FORMS_KEY = 'REPLACE_WITH_WEB3FORMS_KEY';

  // Email parts are joined here so the address is not written out in the page source.
  var MAIL_USER = 'thomas.walsh';
  var MAIL_HOST = 'law.northwestern.edu';

  var doc = document;
  var root = doc.documentElement;
  var motionOK = root.classList.contains('motion');

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function observeOnce(els, opts, cb) {
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { cb(el); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); }
      });
    }, opts);
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------ header hairline */
  var header = $('.site-header');
  if (header) {
    var ticking = false;
    var setHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(setHeader); }
    }, { passive: true });
    setHeader();
  }

  /* ------------------------------------------------------------ small-screen menu */
  var toggle = $('.nav-toggle');
  var nav = $('#site-nav');
  if (toggle && nav) {
    var narrow = window.matchMedia('(max-width: 759.98px)');
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { setOpen(false); }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    doc.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });
    var onResize = function () { if (!narrow.matches) { setOpen(false); } };
    if (narrow.addEventListener) { narrow.addEventListener('change', onResize); } else { narrow.addListener(onResize); }
  }

  /* ------------------------------------------------------------ mark the section in view */
  if (nav && 'IntersectionObserver' in window) {
    var links = {};
    $$('a[href*="#"]', nav).forEach(function (a) {
      var id = a.getAttribute('href').split('#')[1];
      if (id && id !== 'contact') { links[id] = a; }
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = links[e.target.id];
        if (!a) { return; }
        if (e.isIntersecting) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(links).forEach(function (id) {
      var sec = doc.getElementById(id);
      if (sec) { spy.observe(sec); }
    });
  }

  /* ------------------------------------------------------------ hero rotor */
  // The rotor eases up to one turn every 30 seconds, and the server lights come on as it gets going.
  // Scrolling, hovering or tapping puts a gust through it that fades back to the steady pace.
  //
  // The turn is a Web Animations animation. While the speed is changing (the ease-up and any gust) the
  // script sets its currentTime every frame. Changing playbackRate every frame stalls the clock in Chrome,
  // so at steady speed the animation is handed back to native playback and the script goes idle.
  var rotor = $('#rotor');
  if (rotor && motionOK && rotor.animate) {
    var art = rotor.closest('.hero-art') || rotor.parentNode;
    var spin = rotor.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      { duration: 30000, iterations: Infinity }
    );
    spin.pause();
    spin.currentTime = 0;

    var angleMs = 0;       // position of the animation in ms; 30000 ms is one full turn
    var ramp = 0;          // 0 to 1 over about four seconds
    var gust = 0;          // extra speed, decays back to zero
    var last = 0;
    var raf = 0;
    var inView = true;
    var native = false;    // true while the browser is playing the animation by itself
    var resume = false;    // was playing natively when it went off screen
    var smooth = function (t) { return t * t * (3 - 2 * t); };
    var live = function () { return inView && !doc.hidden; };

    var freeze = function () {
      if (!native) { return; }
      angleMs = spin.currentTime;
      spin.pause();
      spin.currentTime = angleMs;
      native = false;
    };
    var handBack = function () {
      spin.currentTime = angleMs;
      spin.playbackRate = 1;
      spin.play();
      native = true;
      last = 0;
    };
    var frame = function (now) {
      raf = 0;
      if (!live()) { return; }
      var dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (ramp < 1) { ramp = Math.min(1, ramp + dt / 4000); }
      gust *= Math.exp(-dt / 900);
      if (gust < 0.01) { gust = 0; }
      angleMs += dt * smooth(ramp) * (1 + gust);
      spin.currentTime = angleMs;
      if (ramp < 1 || gust > 0) { raf = requestAnimationFrame(frame); } else { handBack(); }
    };
    var kick = function () {
      if (!live()) { return; }
      freeze();
      if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    };
    var addGust = function (g) { gust = Math.min(6, Math.max(gust, g)); kick(); };

    var sync = function () {
      if (live()) {
        if (resume) { resume = false; handBack(); } else if (ramp < 1 || gust > 0) { kick(); }
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (native) { resume = true; freeze(); }
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        sync();
      }).observe(art);
    }
    doc.addEventListener('visibilitychange', sync);
    sync();

    art.addEventListener('pointerenter', function () { addGust(2.2); });
    art.addEventListener('pointerdown', function () { addGust(5); });

    var lastY = window.scrollY;
    var lastT = performance.now();
    window.addEventListener('scroll', function () {
      var now = performance.now();
      var v = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT);
      lastY = window.scrollY;
      lastT = now;
      if (inView && v > 0.15) { addGust(Math.min(4.5, v * 0.9)); }
    }, { passive: true });

    // Server lights come on, top unit first.
    $$('.led', art).forEach(function (el, i) {
      var unit = Math.floor(i / 3);
      var k = i % 3;
      el.animate([{ opacity: 0.12 }, { opacity: 1 }], {
        duration: 420, delay: 500 + unit * 210 + k * 70, easing: 'ease-out', fill: 'backwards'
      });
    });
  }

  /* ------------------------------------------------------------ diagram and icons play once when seen */
  if (motionOK) {
    observeOnce($$('.diagram'), { threshold: 0.35 }, function (el) { el.classList.add('is-in'); });
    observeOnce($$('.feature'), { threshold: 0.6 }, function (el) {
      el.classList.add('play');
      setTimeout(function () { el.classList.remove('play'); }, 2000);
    });
  }

  /* ------------------------------------------------------------ email address, assembled here */
  var address = MAIL_USER + '@' + MAIL_HOST;
  $$('.js-mail').forEach(function (a) {
    a.href = 'mailto:' + address;
    a.textContent = address;
    a.hidden = false;
  });

  /* ------------------------------------------------------------ contact form */
  var form = $('#contact-form');
  if (form) {
    var status = $('#form-status');
    var button = $('button[type="submit"]', form);
    var sendLabel = button.textContent;
    var keyField = form.elements.access_key;
    var key = WEB3FORMS_KEY !== 'REPLACE_WITH_WEB3FORMS_KEY' ? WEB3FORMS_KEY : (keyField ? keyField.value : '');
    var connected = key && key !== 'REPLACE_WITH_WEB3FORMS_KEY';
    var checked = ['name', 'email', 'message'];
    var messages = {
      name: { valueMissing: 'Please enter your name.' },
      email: { valueMissing: 'Please enter your email address.', typeMismatch: 'That email address does not look right.' },
      message: { valueMissing: 'Please write a message.' }
    };

    // mail: 'end' puts the address at the end of the sentence, 'after' follows a finished sentence.
    var say = function (text, ok, mail) {
      status.textContent = text;
      status.classList.toggle('is-ok', !!ok);
      if (mail) {
        if (mail === 'after') { status.appendChild(doc.createTextNode(' ')); }
        var a = doc.createElement('a');
        a.href = 'mailto:' + address;
        a.textContent = address;
        status.appendChild(a);
        if (mail === 'end') { status.appendChild(doc.createTextNode('.')); }
      }
    };
    var errorFor = function (name) { return $('#' + name + '-error'); };
    var showError = function (field, text) {
      var out = errorFor(field.name);
      out.textContent = text;
      field.setAttribute('aria-invalid', 'true');
    };
    var clearError = function (field) {
      errorFor(field.name).textContent = '';
      field.removeAttribute('aria-invalid');
    };
    var problem = function (field) {
      var v = field.validity;
      if (v.valid) { return ''; }
      var set = messages[field.name] || {};
      for (var k in set) { if (v[k]) { return set[k]; } }
      return field.validationMessage;
    };

    checked.forEach(function (n) {
      var field = form.elements[n];
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true' && field.validity.valid) { clearError(field); }
      });
    });

    if (!connected) {
      say('The form isn’t connected yet. Please email Thomas directly at ', false, true);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      checked.forEach(function (n) {
        var field = form.elements[n];
        var text = problem(field);
        if (text) { showError(field, text); if (!firstBad) { firstBad = field; } } else { clearError(field); }
      });
      if (firstBad) { firstBad.focus(); return; }
      if (!connected) {
        say('The form isn’t connected yet. Please email Thomas directly at ', false, true);
        return;
      }
      if (form.elements.botcheck && form.elements.botcheck.checked) { return; }

      button.disabled = true;
      button.textContent = 'Sending…';
      say('', false);

      var body = {
        access_key: key,
        subject: form.elements.subject.value,
        from_name: form.elements.from_name.value,
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        organization: form.elements.organization.value.trim(),
        message: form.elements.message.value.trim(),
        botcheck: ''
      };

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            form.reset();
            say('Thanks, your message is on its way. Thomas will reply from his own email.', true);
            button.textContent = sendLabel;
            setTimeout(function () { button.disabled = false; }, 30000);
          } else {
            throw new Error('not accepted');
          }
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = sendLabel;
          say('Something went wrong sending that. You can email Thomas directly at ', false, 'end');
        });
    });
  }
})();
