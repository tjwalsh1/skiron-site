/* Skiron site behaviour. Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  // The Web3Forms access key, also set in the hidden access_key input in index.html.
  // The key is an alias for the destination address and is safe to publish.
  var WEB3FORMS_KEY = '395b4aac-2902-45e9-8675-f9e6960a4dae';
  var KEY_PLACEHOLDER = 'REPLACE_WITH_WEB3FORMS_KEY';

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
  // The rotor turns at one constant speed, a full turn every 10 seconds, and the server lights come on as the
  // page loads. It pauses while it is off screen.
  var rotor = $('#rotor');
  if (rotor && motionOK && rotor.animate) {
    var art = rotor.closest('.hero-art') || rotor.parentNode;
    var spin = rotor.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      { duration: 10000, iterations: Infinity, easing: 'linear' }
    );
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[entries.length - 1].isIntersecting) { spin.play(); } else { spin.pause(); }
      }).observe(art);
    }

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

  /* ------------------------------------------------------------ contact form */
  var form = $('#contact-form');
  if (form) {
    var status = $('#form-status');
    var button = $('button[type="submit"]', form);
    var sendLabel = button.textContent;
    var keyField = form.elements.access_key;
    var key = WEB3FORMS_KEY !== KEY_PLACEHOLDER ? WEB3FORMS_KEY : (keyField ? keyField.value : '');
    var connected = key && key !== KEY_PLACEHOLDER;
    var checked = ['name', 'email', 'message'];
    var messages = {
      name: { valueMissing: 'Please enter your name.' },
      email: { valueMissing: 'Please enter your email address.', typeMismatch: 'That email address does not look right.' },
      message: { valueMissing: 'Please write a message.' }
    };

    var say = function (text, ok) {
      status.textContent = text;
      status.classList.toggle('is-ok', !!ok);
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
      say('The form isn’t connected yet. Please check back soon.', false);
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
        say('The form isn’t connected yet. Please check back soon.', false);
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
            say('Thanks, your message is on its way. Skiron will respond to you.', true);
            button.textContent = sendLabel;
            setTimeout(function () { button.disabled = false; }, 30000);
          } else {
            throw new Error('not accepted');
          }
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = sendLabel;
          say('Something went wrong sending that. Please try again in a moment.', false);
        });
    });
  }
})();
