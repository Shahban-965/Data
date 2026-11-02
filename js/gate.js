/* ==========================================================================
   gate.js — NOVA / ATLAS sign-in gate v2
   Local convenience lock (SHA-256; plaintext is never stored).
   The token lives in DATA/auth.json when the portable engine is available,
   so even the lock state travels with the project instead of one PC's RAM.
   ========================================================================== */
(function () {
  'use strict';
  var HASH = 'ee0c6e3f1c167b1730c645bd6509ee4760cf8556a0909302ca51954520b3230c';
  var FILE = 'auth.json';
  var TTL = 12 * 36e5;
  var root = document.documentElement;
  var desktop = window.shakeelDesktop || null;
  /* A static HTTP preview carries no real DATA folder. The convenience lock
     is active only in the portable (file://) build, so previews open directly. */
  var previewOnly = !desktop && location.protocol !== 'file:';

  function readToken() {
    try {
      if (desktop && desktop.read) {
        var raw = desktop.read(FILE);
        return raw && typeof raw === 'string' ? JSON.parse(raw) : null;
      }
      return JSON.parse(localStorage.getItem('shakeel.auth') || 'null');
    } catch (e) { return null; }
  }
  function writeToken(obj) {
    try {
      if (desktop && desktop.write) { desktop.write(FILE, JSON.stringify(obj)); return; }
      localStorage.setItem('shakeel.auth', JSON.stringify(obj));
    } catch (e) { /* ignore */ }
  }
  function clearToken() {
    try {
      if (desktop && desktop.write) { desktop.write(FILE, '{}'); return; }
      localStorage.removeItem('shakeel.auth');
    } catch (e) { /* ignore */ }
  }
  function ok() {
    var a = readToken();
    return !!(a && a.ok && Date.now() - a.t < TTL);
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
      .then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) {
          return ('0' + x.toString(16)).slice(-2);
        }).join('');
      });
  }

  /* ---- LOGIN VISUALS ---- */
  function fx(g) {
    var top = g.querySelector('#gtop');
    var text = 'SHAKEEL AHMED';
    top.innerHTML = '<div class="gname">' + text.split('').map(function (c, i) {
      return '<span style="animation-delay:' + (i * 45 + 120) + 'ms">' + (c === ' ' ? '&nbsp;&nbsp;' : c) + '</span>';
    }).join('') + '</div><div class="grole"><i></i><b>ADMINISTRATOR</b><i></i></div>';

    var M = window.Motion;
    if (M && M.animate) {
      M.animate(top.querySelectorAll('.gname span'),
        { opacity: [0, 1], transform: ['translateY(-24px)', 'translateY(0px)'] },
        { delay: M.stagger(.05, { startDelay: .12 }), duration: .5, ease: [.22, 1, .36, 1] });
      M.animate(g.querySelector('#gcard'),
        { opacity: [0, 1], transform: ['translateY(34px) scale(.97)', 'translateY(0px) scale(1)'] },
        { delay: .18, type: 'spring', stiffness: 210, damping: 22 });
    } else {
      top.querySelectorAll('.gname span').forEach(function (el) { el.style.animation = 'snRise .6s var(--ease) both'; });
    }

    var cv = g.querySelector('#gcv');
    if (!cv) return;
    var host = cv.parentNode;
    var cx = cv.getContext('2d');
    var W = 0, H = 0, P = [], mx = -999, my = -999;
    function size() {
      var r = host.getBoundingClientRect();
      W = cv.width = Math.max(1, Math.round(r.width));
      H = cv.height = Math.max(1, Math.round(r.height));
      var n = Math.min(70, Math.round(W * H / 14000));
      P = [];
      for (var i = 0; i < n; i++) {
        P.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
          r: 1 + Math.random() * 1.6
        });
      }
    }
    size();
    window.addEventListener('resize', size);
    g.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });

    (function loop(t) {
      if (!document.body.contains(g)) return;
      cx.clearRect(0, 0, W, H);
      var glow = cx.createRadialGradient(W * (.25 + .18 * Math.sin(t / 5000)), H * .42, 0, W * .5, H * .5, Math.max(W, H) * .75);
      glow.addColorStop(0, 'rgba(47,97,255,.20)');
      glow.addColorStop(1, 'rgba(16,22,34,0)');
      cx.fillStyle = glow; cx.fillRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110 && d > 0) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
        for (var j = i + 1; j < P.length; j++) {
          var q = P[j], ex = p.x - q.x, ey = p.y - q.y, dd = ex * ex + ey * ey;
          if (dd < 16000) {
            cx.strokeStyle = 'rgba(150,180,255,' + (1 - dd / 16000) * .22 + ')';
            cx.lineWidth = .7;
            cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(q.x, q.y); cx.stroke();
          }
        }
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = 'rgba(220,232,255,.75)'; cx.fill();
      }
      requestAnimationFrame(loop);
    })(0);
  }

  function show() {
    root.classList.add('locked');
    var g = document.createElement('div');
    g.id = 'gate';
    g.innerHTML =
      '<div class="gate-left-art">' +
        '<canvas id="gcv" aria-hidden="true"></canvas>' +
        '<div class="gate-mark"><i>SN</i><span>Shakeel Networking · ATLAS</span></div>' +
        '<div class="gtop" id="gtop" aria-label="Shakeel Ahmed Administrator"></div>' +
        '<div class="gate-foot">Offline · portable · permanent JSON + TXT database</div>' +
      '</div>' +
      '<div class="gate-right">' +
        '<form class="gc" id="gcard" autocomplete="off">' +
          '<div class="lg" id="glg">SN</div>' +
          '<h1>Welcome back</h1>' +
          '<p>Sign in to your IT Lab workspace</p>' +
          '<label for="gpw">Password</label>' +
          '<div class="row"><input class="gcard-in" id="gpw" type="password" aria-describedby="ger" autofocus>' +
          '<button type="button" id="gsh">Show</button></div>' +
          '<div class="er" id="ger" role="alert"></div>' +
          '<button class="go" type="submit">Sign in</button>' +
          '<div class="gate-hint">Your data stays in the DATA folder beside this app.</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(g);
    fx(g);

    var pw = g.querySelector('#gpw'), er = g.querySelector('#ger'), go = g.querySelector('.go');
    g.querySelector('#gsh').onclick = function () {
      pw.type = pw.type === 'password' ? 'text' : 'password';
      this.textContent = pw.type === 'password' ? 'Show' : 'Hide';
    };
    g.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      if (!pw.value) { er.textContent = 'Enter the password.'; return; }
      go.disabled = true; go.textContent = 'Verifying…';
      sha(pw.value).then(function (h) {
        if (h === HASH) { writeToken({ ok: true, t: Date.now() }); location.reload(); }
        else {
          er.textContent = 'Incorrect password.';
          pw.value = ''; go.disabled = false; go.textContent = 'Sign in'; pw.focus();
        }
      }).catch(function () {
        er.textContent = 'Secure hash unavailable in this context.';
        go.disabled = false; go.textContent = 'Sign in';
      });
    };
  }

  window.SN_logout = function () { clearToken(); location.reload(); };

  if (!ok() && !previewOnly) {
    root.classList.add('locked');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
    else show();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var foot = document.querySelector('.sidebar-foot');
    if (foot && (ok() || previewOnly)) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary logout-btn';
      b.textContent = 'Log out';
      b.onclick = window.SN_logout;
      foot.appendChild(b);
    }
  });
})();
