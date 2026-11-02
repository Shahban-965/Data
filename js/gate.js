/* Shakeel Networking — password-only gate (SHA-256 check; plaintext never stored). Frontend-only: not server-grade security. */
(function () {
  var HASH = 'ee0c6e3f1c167b1730c645bd6509ee4760cf8556a0909302ca51954520b3230c', KEY = 'shakeel.auth', TTL = 12 * 36e5, root = document.documentElement;
  function ok() { try { var a = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!(a && a.ok && Date.now() - a.t < TTL); } catch (e) { return false; } }
  function sha(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }

  /* ---- login visuals: Motion (Framer Motion engine) + live canvas network ---- */
  function fx(g) {
    var top = g.querySelector('#gtop'), text = 'SHAKEEL AHMED', role = 'ADMIN';
    top.innerHTML = '<div class="gname">' + text.split('').map(function (c, i) { var pal = ['#67e8f9', '#60a5fa', '#c084fc', '#f0abfc', '#f472b6']; return '<span style="color:' + pal[i % pal.length] + '">' + (c === ' ' ? '&nbsp;&nbsp;' : c) + '</span>'; }).join('') + '</div><div class="grole"><i></i><b>' + role + '</b><i></i></div>';
    var M = window.Motion;
    if (M && M.animate) {
      M.animate(top.querySelectorAll('.gname span'), { opacity: [0, 1], transform: ['translateY(-40px) rotateX(90deg)', 'translateY(0px) rotateX(0deg)'] }, { delay: M.stagger(.05, { startDelay: .15 }), type: 'spring', stiffness: 260, damping: 16 });
      M.animate(top.querySelector('.grole'), { opacity: [0, 1], transform: ['scaleX(.2)', 'scaleX(1)'] }, { delay: .9, duration: .6, ease: [.22, 1, .36, 1] });
      M.animate(g.querySelector('#gcard'), { opacity: [0, 1], transform: ['translateY(60px) scale(.9)', 'translateY(0px) scale(1)'] }, { delay: .35, type: 'spring', stiffness: 170, damping: 18 });
      M.animate(g.querySelector('#glg'), { transform: ['translateY(0px)', 'translateY(-8px)', 'translateY(0px)'] }, { duration: 3.2, repeat: Infinity, ease: 'easeInOut' });
      M.animate(top.querySelectorAll('.gname span'), { transform: ['translateY(0px)', 'translateY(-7px)', 'translateY(0px)'] }, { delay: M.stagger(.08, { startDelay: 1.6 }), duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' });
    }
    var cv = g.querySelector('#gcv'), cx = cv.getContext('2d'), W, H, P = [], mx = -999, my = -999, raf, cols = ['34,211,238', '168,85,247', '236,72,153', '59,130,246'];
    function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; var n = Math.min(90, Math.round(W * H / 16000)); P = []; for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .7, vy: (Math.random() - .5) * .7, r: 1.2 + Math.random() * 2, c: cols[i % 4] }); }
    size(); addEventListener('resize', size);
    g.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
    var t0 = 0;
    (function loop(t) {
      if (!document.body.contains(g)) return;
      cx.clearRect(0, 0, W, H);
      var a = cx.createRadialGradient(W * (.3 + .2 * Math.sin(t / 4000)), H * (.3 + .2 * Math.cos(t / 5000)), 0, W * .5, H * .5, Math.max(W, H) * .7);
      a.addColorStop(0, 'rgba(168,85,247,.22)'); a.addColorStop(.5, 'rgba(34,211,238,.08)'); a.addColorStop(1, 'rgba(5,8,22,0)'); cx.fillStyle = a; cx.fillRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { p.x += dx / d * 1.6; p.y += dy / d * 1.6; }
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fillStyle = 'rgba(' + p.c + ',.9)'; cx.shadowColor = 'rgba(' + p.c + ',1)'; cx.shadowBlur = 10; cx.fill(); cx.shadowBlur = 0;
        for (var j = i + 1; j < P.length; j++) { var q = P[j], ex = p.x - q.x, ey = p.y - q.y, dd = ex * ex + ey * ey; if (dd < 18000) { cx.strokeStyle = 'rgba(' + p.c + ',' + (1 - dd / 18000) * .45 + ')'; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(q.x, q.y); cx.stroke(); } }
      }
      raf = requestAnimationFrame(loop);
    })(0);
  }
  function show() {
    root.classList.add('locked');
    var g = document.createElement('div'); g.id = 'gate';
    g.innerHTML = '<canvas id="gcv" aria-hidden="true"></canvas><div class="gtop" id="gtop" aria-label="Shakeel Ahmed Admin"></div><form class="gc" id="gcard" autocomplete="off"><div class="lg" id="glg">SN</div><h1>Shakeel Networking</h1><p>IT Lab Management System</p><label for="gpw" style="font-size:12px;color:var(--text-muted)">Password</label><div class="row"><input id="gpw" type="password" aria-describedby="ger" autofocus><button type="button" id="gsh">Show</button></div><div class="er" id="ger" role="alert"></div><button class="go">Sign in</button></form>';
    document.body.appendChild(g);
    fx(g);
    var pw = g.querySelector('#gpw'), er = g.querySelector('#ger'), go = g.querySelector('.go');
    g.querySelector('#gsh').onclick = function () { pw.type = pw.type === 'password' ? 'text' : 'password'; this.textContent = pw.type === 'password' ? 'Show' : 'Hide'; };
    g.querySelector('form').onsubmit = function (e) {
      e.preventDefault(); if (!pw.value) { er.textContent = 'Enter the password.'; return; }
      go.disabled = true; go.textContent = 'Verifying…';
      sha(pw.value).then(function (h) {
        if (h === HASH) { try { localStorage.setItem(KEY, JSON.stringify({ ok: true, t: Date.now() })); } catch (x) {} location.reload(); }
        else { er.textContent = 'Incorrect password.'; pw.value = ''; go.disabled = false; go.textContent = 'Sign in'; pw.focus(); }
      });
    };
  }
  window.SN_logout = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
  if (!ok()) { root.classList.add('locked'); document.addEventListener('DOMContentLoaded', show); }
  document.addEventListener('DOMContentLoaded', function () {
    var f = document.querySelector('.sidebar-foot');
    if (f && ok()) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary logout-btn'; b.textContent = 'Log out'; b.onclick = window.SN_logout; f.appendChild(b); }
  });
})();
