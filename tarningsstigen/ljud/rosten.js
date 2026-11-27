/* Röst från Shipholm: färdiga MP3-filer i /ljud, med webbläsarens röst som reserv.
 *
 * ljud/lines.js fyller window.__ROST = { "exakt mening": "filnamn" }.
 *
 *   window.__rost(text)       -> true om en fil spelades (eller försökte spelas)
 *   window.__rost(text, true) -> samma, men stoppar det som spelas först
 *   window.__rostStopp()      -> stoppar pågående fil
 *   window.__rostFinns(text)  -> true om texten har en fil
 *   window.__rostUpplast      -> true när ljudet är upplåst av ett första tryck
 *   window.__rostFel(text)    -> anropas om webbläsaren nekade uppspelningen
 *
 * Viktigt (iPad/iPhone): Safari startar bara ljud inifrån ett tryck. Därför
 *  - skapas varje ljud bara en gång och återanvänds (pool),
 *  - låses alla röster upp med ett tystlit tryck på sidan första gången,
 *  - säger appen sin mening direkt i klickhanteraren (se app.js).
 */
(function () {
  var ROST = (window.__ROST = window.__ROST || {});
  var pool = {};
  var inne = null;
  var serie = 0;
  var misslyckad = null;   /* mening som nekades före första trycket */
  var dbg = [];
  function log(s) { dbg.push(s); if (dbg.length > 40) dbg.shift(); }   /* varje ny uppspelning får ett nummer, så gamla löften inte stör */

  window.__rostUpplast = false;

  function element(id) {
    var a = pool[id];
    if (!a) {
      try {
        a = new Audio('ljud/' + id + '.mp3');
        a.preload = 'auto';
        a.setAttribute('playsinline', '');
        a.setAttribute('data-fil', id + '.mp3');
        a.load();
      } catch (e) { return null; }
      pool[id] = a;
    }
    return a;
  }

  function stopp() {
    if (inne) {
      try { inne.pause(); } catch (e) {}
      try { inne.currentTime = 0; } catch (e) {}
      inne = null;
    }
  }
  window.__rostStopp = stopp;
  window.__rostFinns = function (text) { return !!(text && ROST[String(text).trim()]); };

  /* play() kan avbrytas av att en annan röst pausas i samma andetag
     (AbortError). Då försöker vi igen ett par gånger i stället för att bli tysta. */
  function spela(a, text, forsok, min) {
    var p = a.play();
    if (!p || !p.catch) return;
    p.catch(function (e) {
      log('fel ' + (e && e.name) + ' min=' + min + ' serie=' + serie + ' pausad=' + a.paused + ' tid=' + a.currentTime.toFixed(2));
      if (min !== serie) return;   /* ett äldre play() som avbröts – strunt i det */
      if (e && e.name === 'AbortError' && forsok < 3) {
        setTimeout(function () { if (min === serie) spela(a, text, forsok + 1, min); }, 90);
        return;
      }
      if (inne === a) inne = null;
      if (e && (e.name === 'NotAllowedError' || e.name === 'NotSupportedError')) misslyckad = text;
      log('nekad: ' + text.slice(0, 24));
      if (window.__rostFel) window.__rostFel(text, e);
    });
  }

  window.__rost = function (text, nu) {
    if (!text) return false;
    var id = ROST[String(text).trim()];
    if (!id) return false;
    if (nu) stopp();
    var a = element(id);
    if (!a) return false;
    /* En röst i taget – men pausa inte den fil vi just ska spela om:
       pause() + play() i samma andetag ger AbortError i Safari. */
    log('spela ' + id + ' serie=' + (serie + 1) + ' inne=' + (inne ? (inne.getAttribute('data-fil') || '?') : 'null') + ' pausad=' + (inne ? inne.paused : '-'));
    if (inne && inne !== a) stopp();
    inne = a;
    try { a.currentTime = 0; } catch (e) {}
    a.volume = 1;
    spela(a, String(text), 1, ++serie);
    return true;
  };

  /* Flera meningar i rad (t.ex. två halvor av samma besked): spelas efter varandra.
     Returnerar false om någon mening saknar fil, så appen är tyst i stället. */
  window.__rostFler = function (texter) {
    if (!texter || !texter.length) return false;
    for (var i = 0; i < texter.length; i++) {
      if (!ROST[String(texter[i]).trim()]) return false;
    }
    var kvar = texter.slice(1);
    if (!window.__rost(texter[0])) return false;
    var a = inne;
    if (!a) return false;
    var klar = false;
    var nasta = function () {
      if (klar) return;
      klar = true;
      a.removeEventListener('ended', nasta);
      clearTimeout(vakt);
      if (!kvar.length) return;
      window.__rost(kvar.shift());
      a = inne;
      if (a) a.addEventListener('ended', nasta);
    };
    /* reserv om 'ended' aldrig kommer (t.ex. avbruten uppspelning) */
    var vakt = setTimeout(nasta, 6000);
    a.addEventListener('ended', nasta);
    return true;
  };

  /* Lås upp ljudet vid första trycket: spela varje röst tyst en kort stund.
     Efter det får sidan spela även från timers (t.ex. nästa mening i sagan). */
  var last = false;
  function lasUpp() {
    if (last) return;
    last = true;
    var kvar = misslyckad;
    misslyckad = null;
    if (kvar && !window.__rostPending) setTimeout(function () { window.__rost(kvar); }, 160);
    window.__rostUpplast = true;
    for (var k in ROST) {
      if (!Object.prototype.hasOwnProperty.call(ROST, k)) continue;
      (function (a) {
        if (!a) return;
        a.volume = 0;
        var p = a.play();
        if (p && p.then) {
          p.then(function () {
            setTimeout(function () {
              if (inne === a) { a.volume = 1; return; }  /* rösten spelar nu – pausa inte */
              try { a.pause(); a.currentTime = 0; } catch (e) {}
              a.volume = 1;
            }, 120);
          }).catch(function () { a.volume = 1; });
        } else {
          a.volume = 1;
        }
      })(element(ROST[k]));
    }
    if (window.__rostPending) window.__rostPending();
  }
  /* testkrok: vad spelas just nu? */
  window.__rostStatus = function () {
    return {
      upplast: !!window.__rostUpplast,
      filer: Object.keys(pool).length,
      dbg: dbg.slice(-12),
      spelar: inne ? { fil: inne.getAttribute('data-fil') || inne.src.split('/').pop(), tid: Math.round((inne.currentTime || 0) * 10) / 10, pausad: !!inne.paused, fel: inne.error ? inne.error.code : 0 } : null
    };
  };

  window.addEventListener('pointerdown', lasUpp, { once: true });
  window.addEventListener('touchstart', lasUpp, { once: true, passive: true });
})();