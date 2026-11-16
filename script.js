/* Villa Anna – La Teleferica · script del sito (nessuna libreria) */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastWidth = window.innerWidth;

  /* ---------- Utilità: blocco dello scorrimento e focus dentro le finestre ---------- */
  var blocchi = 0;
  function bloccaPagina(on) {
    blocchi = Math.max(0, blocchi + (on ? 1 : -1));
    root.classList.toggle('bloccata', blocchi > 0);
  }
  function focusabili(box) {
    return Array.prototype.filter.call(
      box.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
  }
  function trappola(box, e) {
    if (e.key !== 'Tab') return;
    var els = focusabili(box);
    if (!els.length) return;
    var primo = els[0], ultimo = els[els.length - 1];
    if (e.shiftKey && (document.activeElement === primo || !box.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && (document.activeElement === ultimo || !box.contains(document.activeElement))) { e.preventDefault(); primo.focus(); }
  }

  /* ---------- Giorno, tramonto e notte: la luce segue la sezione che copre lo schermo ---------- */
  var sezioni = Array.prototype.slice.call(document.querySelectorAll('main [data-mood], footer[data-mood]'));
  var metaTema = document.querySelector('meta[name="theme-color"]');
  var coloriTema = { giorno: '#FBF8F3', tramonto: '#FBE6D3', notte: '#0B1424' };
  var moodAttuale = root.getAttribute('data-mood') || 'giorno';
  var candidato = null;
  var timerMood = null;

  function impostaMood(m) {
    if (m === moodAttuale) return;
    moodAttuale = m;
    root.setAttribute('data-mood', m);
    if (metaTema) metaTema.setAttribute('content', coloriTema[m]);
  }

  // la sezione che copre la parte maggiore dello schermo; se nessuna arriva al 50% resta la luce di prima
  function moodSulloSchermo() {
    var vh = window.innerHeight;
    var meglio = null, quota = 0;
    for (var i = 0; i < sezioni.length; i++) {
      var r = sezioni[i].getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh) continue;
      var vis = (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
      if (vis > quota) { quota = vis; meglio = sezioni[i]; }
    }
    return quota >= 0.5 && meglio ? meglio.getAttribute('data-mood') : null;
  }

  function controllaMood() {
    var m = moodSulloSchermo();
    if (!m || m === moodAttuale) { candidato = null; clearTimeout(timerMood); return; }
    if (m === candidato) return;
    // un po' di tolleranza: la nuova luce deve restare valida per un attimo (niente sfarfallio scorrendo veloce)
    candidato = m;
    clearTimeout(timerMood);
    timerMood = setTimeout(function () {
      if (moodSulloSchermo() === candidato) impostaMood(candidato);
      candidato = null;
    }, 180);
  }

  // primo calcolo subito, senza transizione (anche aprendo il sito a metà pagina o da un link)
  function moodIniziale() {
    root.classList.add('senza-luce');
    var m = moodSulloSchermo();
    if (m) impostaMood(m);
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('senza-luce'); }); });
  }
  moodIniziale();
  // aprendo un link con #sezione il browser scorre dopo: si ricalcola, sempre senza transizione
  if (location.hash) requestAnimationFrame(moodIniziale);
  document.addEventListener('DOMContentLoaded', moodIniziale);
  window.addEventListener('load', function () {
    if (window.scrollY > 0) moodIniziale();
    setTimeout(function () { root.classList.add('pronto'); }, 100);
  });

  /* ---------- Header: più basso e con fondo quando si scorre ---------- */
  function aggiornaHeader() { root.classList.toggle('scorre', window.scrollY > 40); }
  aggiornaHeader();

  var inAttesa = false;
  window.addEventListener('scroll', function () {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(function () {
      inAttesa = false;
      aggiornaHeader();
      controllaMood();
    });
  }, { passive: true });

  // si ricalcola solo se cambia la larghezza: l'apertura della tastiera cambia solo l'altezza
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    window.dispatchEvent(new Event('larghezza'));
    controllaMood();
  });

  /* ---------- Menu del telefono ---------- */
  var menu = document.getElementById('menu');
  var burger = document.querySelector('.header__burger');
  var menuChiudi = menu.querySelector('.menu__chiudi');
  var menuOrigine = null;

  function apriMenu() {
    menuOrigine = document.activeElement;
    menu.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    bloccaPagina(true);
    requestAnimationFrame(function () { menu.classList.add('is-aperto'); });
    menuChiudi.focus();
  }
  function chiudiMenu(riportaFocus) {
    if (menu.hidden) return;
    menu.classList.remove('is-aperto');
    burger.setAttribute('aria-expanded', 'false');
    bloccaPagina(false);
    menu.hidden = true;
    if (riportaFocus !== false && menuOrigine) menuOrigine.focus({ preventScroll: true });
  }
  burger.addEventListener('click', apriMenu);
  menuChiudi.addEventListener('click', function () { chiudiMenu(); });
  menu.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') chiudiMenu();
    trappola(menu, e);
  });
  menu.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () { chiudiMenu(false); });
  });
  window.addEventListener('larghezza', function () { if (window.innerWidth >= 1180) chiudiMenu(false); });

  /* ---------- Effetti allo scorrimento ---------- */
  var telefono = function () { return window.innerWidth < 768; };
  var haIO = 'IntersectionObserver' in window;
  var animare = !reduceMotion && haIO;

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // titoli: divisi in righe che salgono da dietro una maschera
  var titoli = Array.prototype.slice.call(document.querySelectorAll('main .titolo'));
  function dividiRighe(el) {
    var testo = el.getAttribute('data-testo');
    if (testo === null) { testo = el.textContent.trim(); el.setAttribute('data-testo', testo); }
    var parole = testo.split(' ');
    el.innerHTML = parole.map(function (p) { return '<span class="riga__mis">' + esc(p) + '</span>'; }).join(' ');
    var righe = [], top = null;
    Array.prototype.forEach.call(el.querySelectorAll('.riga__mis'), function (s, i) {
      if (top === null || Math.abs(s.offsetTop - top) > 4) { righe.push([]); top = s.offsetTop; }
      righe[righe.length - 1].push(parole[i]);
    });
    el.innerHTML = righe.map(function (r, i) {
      return '<span class="riga" style="--l:' + i + '"><span class="riga__in">' + esc(r.join(' ')) + '</span></span>';
    }).join('');
    el.setAttribute('data-righe', '');
  }
  if (animare) {
    titoli.forEach(dividiRighe);
    window.addEventListener('larghezza', function () { titoli.forEach(dividiRighe); });
  }

  // titoli sulle foto grandi: lettere che si stringono (solo transform)
  if (animare) {
    document.querySelectorAll('[data-lettere]').forEach(function (el) {
      var testo = el.textContent.trim();
      var n = testo.length, c = (n - 1) / 2, k = 0;
      var html = testo.split(' ').map(function (parola) {
        var s = '<span class="parola">' + parola.split('').map(function (ch) {
          var i = k++;
          return '<span class="lettera" style="--a:' + i + ';--d:' + (i - c).toFixed(1) + '">' + esc(ch) + '</span>';
        }).join('') + '</span>';
        k++; // lo spazio
        return s;
      }).join(' ');
      el.innerHTML = '<span class="sr-only">' + esc(testo) + '</span><span aria-hidden="true">' + html + '</span>';
    });
  }

  // comparse: paragrafi, titoli, collage (maschera), griglie (a onde), titoli delle foto grandi
  if (!animare) {
    document.querySelectorAll('[data-reveal], .titolo').forEach(function (el) { el.classList.add('is-visible'); });
    document.querySelectorAll('.rivela, .onda, .grande, .apertura').forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var ioTesto = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        ioTesto.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    document.querySelectorAll('[data-reveal], main .titolo').forEach(function (el) { ioTesto.observe(el); });

    // una dopo l'altra: ritardo crescente tra gli elementi che entrano insieme
    var ioOnde = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.style.setProperty('--o', Math.min(n, 6) * (telefono() ? 0.07 : 0.09) + 's');
        n++;
        el.classList.add('is-in');
        ioOnde.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('.onda').forEach(function (el) { ioOnde.observe(el); });

    // la maschera nasconde la foto anche all'osservatore: si osserva il contenitore
    var gruppiRivela = [];
    document.querySelectorAll('.rivela').forEach(function (el) {
      if (gruppiRivela.indexOf(el.parentNode) < 0) gruppiRivela.push(el.parentNode);
    });
    var ioRivela = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call(e.target.querySelectorAll(':scope > .rivela'), function (el, i) {
          el.style.setProperty('--i', i);
          el.classList.add('is-in');
        });
        ioRivela.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    gruppiRivela.forEach(function (g) { ioRivela.observe(g); });

    var ioTitoli = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        ioTitoli.unobserve(e.target);
      });
    }, { threshold: 0.45 });
    document.querySelectorAll('.grande').forEach(function (el) { ioTitoli.observe(el); });

    // apertura a tutta pagina: sipario dal centro, zoom 1.2 → 1, poi il titolo
    // (la maschera chiusa nasconde la foto anche all'osservatore: si osserva la sezione)
    var ioApertura = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var ap = e.target.querySelector(':scope > .apertura');
        if (ap) ap.classList.add('is-in');
        ioApertura.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -20% 0px' });
    document.querySelectorAll('.apertura').forEach(function (el) { ioApertura.observe(el.parentNode); });
  }

  // legati allo scorrimento: sipario delle foto grandi, zoom 1.15 → 1, parallasse, hero
  var hero = document.querySelector('.hero');
  var heroFoto = hero.querySelector('.hero__foto');
  var heroTesto = hero.querySelector('.hero__testo');
  var grandi = Array.prototype.slice.call(document.querySelectorAll('[data-grande]'));
  var px = Array.prototype.slice.call(document.querySelectorAll('[data-px]'));
  var vicini = new Set();
  if (animare) {
    var ioVicini = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) vicini.add(e.target); else vicini.delete(e.target); });
      richiediEffetti();
    }, { rootMargin: '25% 0px 25% 0px' });
    grandi.concat(px).forEach(function (el) { ioVicini.observe(el); });
  }
  function effetti() {
    var vh = window.innerHeight, tel = telefono();
    var y = window.scrollY;
    if (y < vh * 1.3) {
      heroFoto.style.transform = 'translate3d(0,' + (y * (tel ? 0.25 : 0.4)).toFixed(1) + 'px,0)';
      heroFoto.style.opacity = (1 - Math.min(1, y / vh) * 0.65).toFixed(3);
      heroTesto.style.transform = 'translate3d(0,' + (-y * (tel ? 0.06 : 0.12)).toFixed(1) + 'px,0)';
      heroTesto.style.opacity = Math.max(0, 1 - y / (vh * 0.6)).toFixed(3);
    }
    vicini.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (el.hasAttribute('data-grande')) {
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
        var e = 1 - Math.pow(1 - p, 3); // power3 out
        var t = (tel ? 5 : 9) * (1 - e), x = (tel ? 4 : 7) * (1 - e);
        el.style.clipPath = 'inset(' + t.toFixed(2) + '% ' + x.toFixed(2) + '% ' + t.toFixed(2) + '% ' + x.toFixed(2) + '% round 4px)';
        var img = el.querySelector('.grande__img');
        if (img) img.style.transform = 'scale(' + ((tel ? 1.08 : 1.15) - (tel ? 0.08 : 0.15) * e).toFixed(4) + ')';
      }
      if (el.hasAttribute('data-px')) {
        var k = parseFloat(el.getAttribute('data-px')) * (tel ? 0.5 : 1);
        el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * k).toFixed(1) + 'px,0)';
      }
    });
  }
  var effettiInAttesa = false;
  function richiediEffetti() {
    if (!animare || effettiInAttesa) return;
    effettiInAttesa = true;
    requestAnimationFrame(function () { effettiInAttesa = false; effetti(); });
  }
  if (animare) {
    window.addEventListener('scroll', richiediEffetti, { passive: true });
    window.addEventListener('larghezza', richiediEffetti);
    effetti();
  }

  // hero: zoom lento all'apertura
  (function () {
    var prima = hero.querySelector('.hero__foto img');
    var via = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-pronta'); }); }); };
    if (!prima || prima.complete) via(); else { prima.addEventListener('load', via, { once: true }); prima.addEventListener('error', via, { once: true }); }
  })();

  /* ---------- Galleria: "Mostra altre foto" ---------- */
  var altre = document.getElementById('galleria-altre');
  if (altre) {
    var aggiornaAltre = function () {
      var restano = document.querySelectorAll('#galleria-foto .mosaico__riga[hidden]').length;
      altre.parentNode.hidden = restano === 0;
    };
    altre.addEventListener('click', function () {
      var nascoste = Array.prototype.slice.call(document.querySelectorAll('#galleria-foto .mosaico__riga[hidden]'), 0, 4);
      nascoste.forEach(function (r) { r.hidden = false; });
      if (!animare) nascoste.forEach(function (r) { r.querySelectorAll('.onda').forEach(function (f) { f.classList.add('is-in'); }); });
      var prima = nascoste[0] && nascoste[0].querySelector('.foto');
      if (prima) prima.focus({ preventScroll: true });
      aggiornaAltre();
    });
    aggiornaAltre();
  }

  /* ---------- Hero: dissolvenza lenta tra 5-6 foto ---------- */
  // ogni foto è caricata poco prima di comparire; si saltano quelle che su questo schermo
  // verrebbero ingrandite oltre il 20% dei loro pixel reali (per esempio una foto verticale su un monitor largo)
  var heroBox = document.querySelector('[data-hero]');
  var heroImgs = Array.prototype.slice.call(heroBox.querySelectorAll('img'));
  function heroCarica(img) {
    if (img.getAttribute('data-srcset')) { img.srcset = img.getAttribute('data-srcset'); img.removeAttribute('data-srcset'); }
    if (img.getAttribute('data-src')) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }
  }
  function heroAdatta(img) {
    var w = +img.getAttribute('data-w'), h = +img.getAttribute('data-h');
    if (!w || !h) return true;
    return Math.max(heroBox.clientWidth / w, heroBox.clientHeight / h) <= 1.21;
  }
  function heroDopo(i) {
    for (var k = 1; k <= heroImgs.length; k++) {
      var n = (i + k) % heroImgs.length;
      if (n === 0 || heroAdatta(heroImgs[n])) return n;
    }
    return 0;
  }
  if (!reduceMotion && heroImgs.length > 1) {
    var heroIdx = 0;
    var heroVisibile = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { heroVisibile = en[0].isIntersecting; }).observe(document.querySelector('.hero'));
    }
    window.addEventListener('load', function () { heroCarica(heroImgs[heroDopo(0)]); });
    setInterval(function () {
      if (!heroVisibile || document.hidden) return;
      var next = heroDopo(heroIdx);
      if (next === heroIdx) return;
      heroCarica(heroImgs[next]);
      if (!heroImgs[next].complete || !heroImgs[next].naturalWidth) return; // aspetta che sia caricata
      heroImgs[heroIdx].classList.remove('is-attiva');
      heroImgs[next].classList.add('is-attiva');
      heroIdx = next;
      heroCarica(heroImgs[heroDopo(next)]);
    }, 6500);
  }

  /* ---------- Strisce di foto: scorrono da sole, frecce, trascinamento ---------- */
  var strisce = [];
  document.querySelectorAll('[data-striscia]').forEach(function (box) {
    var vista = box.querySelector('.striscia__vista');
    var lista = box.querySelector('.striscia__lista');
    var originali = Array.prototype.slice.call(lista.children);
    originali.forEach(function (li, i) { li.querySelector('.foto').setAttribute('data-indice', i); });

    var x = 0, periodo = 1;
    var velocita = window.innerWidth < 768 ? 22 : 30; // px al secondo: lenta
    var stato = { hover: false, focus: false, tocco: false, lightbox: false, fuori: false, tween: false };
    var ignoraHover = false, ignoraFocus = false;
    var timerTocco = null;

    function riempi() {
      lista.querySelectorAll('[data-copia]').forEach(function (li) { li.remove(); });
      // una prima copia per misurare il giro, poi altre finché coprono due schermi
      function copia() {
        originali.forEach(function (li) {
          var c = li.cloneNode(true);
          c.setAttribute('data-copia', '');
          c.setAttribute('aria-hidden', 'true');
          c.querySelector('.foto').setAttribute('tabindex', '-1');
          lista.appendChild(c);
        });
      }
      copia();
      var primaCopia = lista.querySelector('[data-copia]');
      periodo = Math.max(1, primaCopia.offsetLeft - originali[0].offsetLeft);
      var copie = 1;
      while (periodo * (copie + 1) < vista.clientWidth * 2 + periodo && copie < 6) { copia(); copie++; }
      disegna();
    }
    function disegna() {
      x = ((x % periodo) + periodo) % periodo;
      lista.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
    }
    function ferma() {
      return reduceMotion || stato.tween || stato.trascina || stato.lightbox || stato.fuori || document.hidden ||
        stato.tocco || (stato.hover && !ignoraHover) || (stato.focus && !ignoraFocus);
    }

    var ultimo = 0;
    function passo(t) {
      var dt = ultimo ? Math.min(0.05, (t - ultimo) / 1000) : 0;
      ultimo = t;
      if (!ferma()) { x += velocita * dt; disegna(); }
      requestAnimationFrame(passo);
    }

    // frecce: avanzano di una foto con un movimento morbido
    function sposta(dir) {
      var li = originali[0];
      var step = li.getBoundingClientRect().width + parseFloat(getComputedStyle(lista).columnGap || 16);
      var da = x, a = x + dir * step;
      if (reduceMotion) { x = a; disegna(); return; }
      stato.tween = true;
      var inizio = performance.now(), durata = 700;
      (function anima(t) {
        var p = Math.min(1, (t - inizio) / durata);
        var e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        x = da + (a - da) * e; disegna();
        if (p < 1) requestAnimationFrame(anima); else stato.tween = false;
      })(inizio);
    }
    box.querySelectorAll('.freccia').forEach(function (b) {
      b.addEventListener('click', function () { sposta(+b.getAttribute('data-dir')); });
    });

    // mouse sopra: si ferma
    vista.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') stato.hover = true; });
    vista.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { stato.hover = false; ignoraHover = false; } });
    vista.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') ignoraHover = false; });

    // tocco e trascinamento
    var start = 0, x0 = 0, idPuntatore = null, mosso = false;
    vista.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      idPuntatore = e.pointerId; start = e.clientX; x0 = x; mosso = false;
      if (e.pointerType !== 'mouse') { stato.tocco = true; clearTimeout(timerTocco); }
    });
    vista.addEventListener('pointermove', function (e) {
      if (e.pointerId !== idPuntatore) return;
      var dx = e.clientX - start;
      if (!mosso && Math.abs(dx) > 6) {
        mosso = true; stato.trascina = true; box.classList.add('is-trascinata');
        try { vista.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
      }
      if (mosso) { x = x0 - dx; disegna(); }
    });
    function fine(e) {
      if (e.pointerId !== idPuntatore) return;
      idPuntatore = null;
      stato.trascina = false;
      box.classList.remove('is-trascinata');
      if (e.pointerType !== 'mouse') {
        clearTimeout(timerTocco);
        timerTocco = setTimeout(function () { stato.tocco = false; }, 2500); // dopo il tocco riparte
      }
    }
    vista.addEventListener('pointerup', fine);
    vista.addEventListener('pointercancel', fine);
    // dopo un trascinamento il clic non apre la foto
    vista.addEventListener('click', function (e) {
      if (mosso) { e.preventDefault(); e.stopPropagation(); mosso = false; }
    }, true);
    vista.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // focus da tastiera: si ferma e porta la foto in vista
    box.addEventListener('focusin', function (e) {
      stato.focus = true;
      var foto = e.target.closest('.foto');
      if (!foto) return;
      vista.scrollLeft = 0;
      // solo da tastiera: con il dito o il mouse la striscia non si sposta (altrimenti il tocco finisce su un'altra foto)
      try { if (!foto.matches(':focus-visible')) return; } catch (err) { /* browser vecchi */ }
      var rv = vista.getBoundingClientRect(), rf = foto.getBoundingClientRect();
      var margine = rv.width * 0.08;
      if (rf.left < rv.left + margine) { x -= (rv.left + margine - rf.left); disegna(); }
      else if (rf.right > rv.right - margine) { x += (rf.right - (rv.right - margine)); disegna(); }
    });
    box.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !box.contains(e.relatedTarget)) { stato.focus = false; ignoraFocus = false; }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { stato.fuori = !en[0].isIntersecting; }).observe(box);
    }

    strisce.push({
      apriLightbox: function () { stato.lightbox = true; },
      // dopo la foto ingrandita la striscia riparte, anche se il mouse o il focus sono rimasti lì
      chiudiLightbox: function () { stato.lightbox = false; ignoraHover = true; ignoraFocus = true; stato.tocco = false; }
    });

    riempi();
    window.addEventListener('load', riempi);
    window.addEventListener('larghezza', function () { velocita = window.innerWidth < 768 ? 22 : 30; riempi(); });
    requestAnimationFrame(passo);
  });

  /* ---------- Video del matrimonio: parte solo quando è visibile ---------- */
  var video = document.getElementById('video-matrimonio');
  if (video) {
    var playBtn = video.parentNode.querySelector('.video__play');
    var avviaAMano = function () {
      playBtn.hidden = true;
      video.controls = true;
      video.play();
    };
    playBtn.addEventListener('click', avviaAMano);
    if (reduceMotion || !('IntersectionObserver' in window)) {
      playBtn.hidden = false; // resta il poster con il pulsante play
    } else {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) {
          var p = video.play();
          if (p && p.catch) p.catch(function () { playBtn.hidden = false; });
        } else if (!video.paused) {
          video.pause();
        }
      }, { threshold: 0.35 }).observe(video);
    }
  }

  /* ---------- Toast e copia del numero ---------- */
  var toast = document.getElementById('toast');
  var toastTimer;
  function mostraToast(testo) {
    toast.textContent = testo;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
  }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var testo = btn.getAttribute('data-copy');
      var ok = function () { mostraToast('Numero copiato: ' + testo); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(testo).then(ok, function () { mostraToast('Il numero è ' + testo); });
      } else {
        mostraToast('Il numero è ' + testo);
      }
    });
  });

  /* ---------- Foto ingrandita ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('.lightbox__img');
  var lbFigura = lb.querySelector('.lightbox__figura');
  var lbConta = document.getElementById('lb-conta');
  var lbTesto = document.getElementById('lb-testo');
  var lbChiudi = lb.querySelector('.lightbox__chiudi');
  var lbPrev = lb.querySelector('.lightbox__nav--prev');
  var lbNext = lb.querySelector('.lightbox__nav--next');
  var elenco = [], attuale = 0, origine = null;

  // la versione più grande dell'srcset: la foto intera alla risoluzione più alta
  function piuGrande(img) {
    var meglio = img.getAttribute('src'), w = 0;
    (img.getAttribute('srcset') || '').split(',').forEach(function (parte) {
      var p = parte.trim().split(/\s+/);
      var n = parseInt(p[1], 10) || 0;
      if (n > w) { w = n; meglio = p[0]; }
    });
    return meglio;
  }
  function voce(btn) {
    var img = btn.querySelector('img');
    return { src: piuGrande(img), alt: img.getAttribute('alt') || '' };
  }
  function precarica(i) {
    if (!elenco.length) return;
    var v = elenco[(i + elenco.length) % elenco.length];
    var im = new Image(); im.src = v.src;
  }
  function mostra(i) {
    attuale = (i + elenco.length) % elenco.length;
    var v = elenco[attuale];
    lbImg.style.opacity = '0';
    lbImg.onload = function () { lbImg.style.opacity = '1'; };
    lbImg.src = v.src;
    lbImg.alt = v.alt;
    if (lbImg.complete) lbImg.style.opacity = '1';
    lbConta.textContent = (attuale + 1) + ' / ' + elenco.length;
    lbTesto.textContent = v.alt;
    var una = elenco.length < 2;
    lbPrev.hidden = una; lbNext.hidden = una;
    precarica(attuale + 1); precarica(attuale - 1);
  }
  function apriLightbox(btns, i, trigger) {
    elenco = btns.map(voce);
    origine = trigger;
    lb.hidden = false;
    bloccaPagina(true);
    strisce.forEach(function (s) { s.apriLightbox(); });
    mostra(i);
    requestAnimationFrame(function () { lb.classList.add('is-aperta'); });
    lbChiudi.focus();
  }
  function chiudiLightbox() {
    if (lb.hidden) return;
    lb.classList.remove('is-aperta');
    lb.hidden = true;
    lbImg.removeAttribute('src');
    bloccaPagina(false);
    strisce.forEach(function (s) { s.chiudiLightbox(); });
    if (origine) origine.focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-gallery]').forEach(function (gal) {
    gal.addEventListener('click', function (e) {
      var btn = e.target.closest('.foto');
      if (!btn || !gal.contains(btn)) return;
      // le foto vere della galleria (le copie della striscia rimandano all'originale)
      var vere = Array.prototype.filter.call(gal.querySelectorAll('.foto'), function (b) { return !b.closest('[data-copia]'); });
      var i = btn.hasAttribute('data-indice') ? +btn.getAttribute('data-indice') : vere.indexOf(btn);
      apriLightbox(vere, Math.max(0, i), btn);
    });
  });

  lbChiudi.addEventListener('click', chiudiLightbox);
  lbPrev.addEventListener('click', function () { mostra(attuale - 1); });
  lbNext.addEventListener('click', function () { mostra(attuale + 1); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); chiudiLightbox(); }
    else if (e.key === 'ArrowRight') mostra(attuale + 1);
    else if (e.key === 'ArrowLeft') mostra(attuale - 1);
    trappola(lb, e);
  });

  // clic fuori dalla foto: chiude. Swipe di lato: cambia foto
  var sx = 0, sy = 0, swipe = false;
  lb.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; swipe = false; });
  lb.addEventListener('pointerup', function (e) {
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swipe = true;
      mostra(dx < 0 ? attuale + 1 : attuale - 1);
    }
  });
  lb.addEventListener('click', function (e) {
    if (swipe) { swipe = false; return; }
    if (e.target === lb || e.target === lbFigura) chiudiLightbox();
  });

  /* ---------- Tastiera del telefono aperta: la barra in basso si nasconde ---------- */
  document.addEventListener('focusin', function (e) {
    if (window.innerWidth < 1000 && e.target.matches('input:not([type="radio"]), select, textarea')) root.classList.add('tastiera');
  });
  document.addEventListener('focusout', function () { root.classList.remove('tastiera'); });

  /* ---------- Modulo richiesta di preventivo ---------- */
  var form = document.getElementById('form-evento');
  var conferma = document.getElementById('conferma');
  var riepilogo = document.getElementById('riepilogo');
  var summary = document.getElementById('form-summary');
  var dateInput = document.getElementById('f-data');

  var today = new Date();
  var iso = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  dateInput.min = iso;

  var rules = [
    { id: 'f-tipo', err: 'e-tipo', check: function (v) { return v ? '' : 'Scegli il tipo di evento dall\'elenco.'; } },
    { id: 'f-data', err: 'e-data', check: function (v) {
      if (!v) return 'Indica la data dell\'evento, anche indicativa.';
      if (v < iso) return 'La data è già passata: scegli un giorno da oggi in poi.';
      return '';
    } },
    { id: 'f-ospiti', err: 'e-ospiti', check: function (v) { return v ? '' : 'Scegli quanti invitati prevedete, anche indicativamente.'; } },
    { id: 'f-nome', err: 'e-nome', check: function (v) { return v.trim().length >= 2 ? '' : 'Scrivi il tuo nome.'; } },
    { id: 'f-cognome', err: 'e-cognome', check: function (v) { return v.trim().length >= 2 ? '' : 'Scrivi il tuo cognome.'; } },
    { id: 'f-tel', err: 'e-tel', check: function (v) {
      var digits = v.replace(/\D/g, '');
      if (!digits) return 'Scrivi un numero di telefono per essere ricontattati.';
      if (/[^\d\s+().\/-]/.test(v)) return 'Il numero può contenere solo cifre, spazi e il segno +.';
      if (digits.length < 6 || digits.length > 15) return 'Il numero sembra incompleto: controlla le cifre.';
      return '';
    } },
    { id: 'f-email', err: 'e-email', check: function (v) {
      v = v.trim();
      if (!v) return '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'L\'indirizzo email non sembra corretto, ad esempio nome@email.it.';
    } }
  ];

  function describedBy(input, errId, hasError) {
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== errId; });
    if (hasError) ids.push(errId);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
  }

  function validateField(rule) {
    var input = document.getElementById(rule.id);
    var msg = rule.check(input.value);
    document.getElementById(rule.err).textContent = msg;
    input.closest('.field').classList.toggle('has-error', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    describedBy(input, rule.err, !!msg);
    return !msg;
  }

  rules.forEach(function (rule) {
    var input = document.getElementById(rule.id);
    var evt = input.tagName === 'SELECT' || input.type === 'date' ? 'change' : 'blur';
    input.addEventListener(evt, function () {
      if (input.closest('.field').classList.contains('has-error') || input.value) validateField(rule);
    });
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('has-error')) validateField(rule);
    });
  });

  function formatDate(value) {
    var parts = value.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function addRow(label, value) {
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    riepilogo.appendChild(row);
  }

  var submitBtn = form.querySelector('button[type="submit"]');
  var submitText = submitBtn.textContent;
  var sending = false;

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.textContent = on ? 'Invio in corso…' : submitText;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function showSendError() {
    summary.innerHTML = 'Non siamo riusciti a inviare la richiesta. Riprovate tra qualche minuto oppure chiamateci allo <a href="tel:+390858579011">085&nbsp;857&nbsp;9011</a>: saremo felici di aiutarvi.';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var invalid = rules.filter(function (rule) { return !validateField(rule); });
    if (invalid.length) {
      summary.textContent = invalid.length === 1
        ? 'Controlla il campo evidenziato.'
        : 'Controlla i ' + invalid.length + ' campi evidenziati.';
      document.getElementById(invalid[0].id).focus({ preventScroll: true });
      return;
    }
    summary.textContent = '';

    var data = new FormData(form);
    var email = (data.get('email') || '').trim();
    var msg = (data.get('messaggio') || '').trim();
    var righe = [
      ['Evento', data.get('tipo')],
      ['Data', formatDate(data.get('data'))],
      ['Invitati', data.get('ospiti')],
      ['Dove', data.get('luogo') || 'Da decidere insieme'],
      ['Nome', data.get('nome').trim()],
      ['Cognome', data.get('cognome').trim()],
      ['Telefono', data.get('telefono').trim()]
    ];
    if (email) righe.push(['Email', email]);
    if (msg) righe.push(['Messaggio', msg]);

    // Web3Forms inoltra la richiesta alla casella email del ristorante
    var payload = {
      access_key: data.get('access_key'),
      subject: data.get('subject'),
      from_name: data.get('from_name')
    };
    if (data.get('botcheck')) payload.botcheck = true; // campo anti-spam: lo compilano solo i bot
    righe.forEach(function (r) { payload[r[0]] = r[1]; });
    if (email) payload.replyto = email;

    setSending(true);
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        setSending(false);
        if (!res.success) { showSendError(); return; }

        riepilogo.innerHTML = '';
        righe.forEach(function (r) { addRow(r[0], r[1]); });
        form.hidden = true;
        conferma.hidden = false;
        conferma.focus({ preventScroll: true });
        conferma.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      })
      .catch(function () {
        setSending(false);
        showSendError();
      });
  });

  document.getElementById('nuova-richiesta').addEventListener('click', function () {
    form.reset();
    rules.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      document.getElementById(rule.err).textContent = '';
      input.closest('.field').classList.remove('has-error');
      input.removeAttribute('aria-invalid');
      describedBy(input, rule.err, false);
    });
    conferma.hidden = true;
    form.hidden = false;
    document.getElementById('f-tipo').focus({ preventScroll: true });
  });
})();

/* Mappa: l'iframe di Google si carica solo dopo il clic */
(function () {
  var btn = document.getElementById('mostra-mappa');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var box = btn.closest('.dove__mappa');
    var frame = document.createElement('iframe');
    frame.title = 'Mappa: Villa Anna – Ristorante La Teleferica a Lettomanoppello';
    frame.src = btn.getAttribute('data-src');
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.setAttribute('allowfullscreen', '');
    box.appendChild(frame);
    box.classList.add('is-attiva');
    frame.focus();
  });
})();
