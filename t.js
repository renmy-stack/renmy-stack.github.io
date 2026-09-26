// ゲームの きろく（あとで 解析する ため）。全ゲーム 共通で <script src="/t.js?v=1"></script> で 読む
// 送りそこねた 記録は スマホに 残して あとで 送り直す（v=2）
// 送るもの: 日時・ゲーム・できごと（ひらいた / とじた / エラー / ゲームごとの できごと）・ランダムな 端末ID・端末の 種類や 画面の 大きさ
// 送らないもの: 名前・場所・IP など 個人の 情報。?nocount を 1 回 ひらいた 端末は 送らない（オーナー用）
// ゲーム側からは T('できごと', { 中身 }) で 記録できる（T が なくても こわれないよう window.T && T(...) で 呼ぶ）
(function () {
  if (window.T) return;
  var API = 'https://script.google.com/macros/s/AKfycbxLuuErUis6wXoyY_O0oP6FasLkPWSsJdRBjGzWfAuvGIS6IipmH0A6CNh-I7Swh0JSHw/exec';
  var G = window.T_GAME || location.pathname.split('/')[1] || 'portal';
  var q = [], off = location.hostname.indexOf('github.io') < 0, errs = 0;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var rid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); };
  if (/[?&]nocount/.test(location.search)) set('count.off', '1');
  if (get('count.off')) off = true;
  window.T = function (ev, data) { if (off) return; q.push([Date.now(), String(ev), data == null ? null : data]); if (q.length >= 30) flush(); };
  if (off) return;

  // 端末ID（ランダム）・この ゲームを ひらいた 回数・はじめての 日
  var id = get('t.id'); if (!id) { id = rid(); set('t.id', id); }
  var sid = rid(), day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  var n = (+get('t.n.' + G) || 0) + 1; set('t.n.' + G, String(n));
  var f = get('t.first.' + G), first = !f; if (first) { f = day; set('t.first.' + G, f); }
  var dayFirst = get('count.' + G) !== day; set('count.' + G, day);
  var last = get('t.last.' + G); set('t.last.' + G, day);

  // 端末の ようす
  var ua = navigator.userAgent, m;
  var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var os = (m = ua.match(/iPhone OS ([\d_]+)|CPU OS ([\d_]+)/)) ? 'iOS ' + (m[1] || m[2]).replace(/_/g, '.') : (m = ua.match(/Android ([\d.]+)/)) ? 'Android ' + m[1] : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? (ipad ? 'iPadOS' : 'Mac') : /Linux/.test(ua) ? 'Linux' : 'other';
  var dev = ipad ? 'tablet' : /iPhone|Android.+Mobile/.test(ua) ? 'phone' : /Android/.test(ua) ? 'tablet' : 'pc';
  var br = /Line\//.test(ua) ? 'LINE' : /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /\bX\/|Twitter/.test(ua) ? 'X' : /CriOS|Chrome\//.test(ua) && !/Edg/.test(ua) ? 'Chrome' : /Edg/.test(ua) ? 'Edge' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'other';
  var ref = ''; try { ref = document.referrer ? new URL(document.referrer).hostname + (new URL(document.referrer).hostname === location.hostname ? new URL(document.referrer).pathname : '') : ''; } catch (e) {}
  var entry = []; location.search.replace(/[?&]([^=&]+)/g, function (_, k) { entry.push('?' + k); }); if (location.hash) entry.push(location.hash.slice(0, 3));
  var mm = function (s) { try { return matchMedia(s).matches; } catch (e) { return false; } };
  var ctx = {
    v: window.T_VER || '', page: location.pathname.split('/').slice(2).join('/') || '', dev: dev, os: os, br: br, app: !!(navigator.standalone || mm('(display-mode: standalone)')),
    lang: navigator.language || '', scr: screen.width + 'x' + screen.height, vp: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio || 1,
    touch: navigator.maxTouchPoints > 0, dark: mm('(prefers-color-scheme: dark)'), ref: ref, entry: entry.join(' '), n: n,
    days: Math.round((Date.parse(day) - Date.parse(f)) / 864e5)
  };

  // 送る 前の 記録は スマホに 保存（t.p）。受け付けが「ok」と 返したら 消す。返事が なければ 次の 送信 / 次に ひらいた ときに 送り直す
  // （送り直しで 同じ 記録が 2 回 とどく ことが ある → 解析で セッション・日時・できごと・中身 が 同じ 行を 1 つに）
  var PK = 't.p', MAXP = 200, busy = {};
  function loadP() { try { return JSON.parse(get(PK) || '[]'); } catch (e) { return []; } }
  function saveP(p) { set(PK, JSON.stringify(p.slice(-MAXP))); }
  function flush() {
    var p = loadP();
    if (q.length) {
      ctx.v = window.T_VER || ctx.v; ctx.vp = innerWidth + 'x' + innerHeight;
      while (q.length) p.push({ k: rid(), b: JSON.stringify({ g: G, id: id, s: sid, ctx: ctx, ev: q.splice(0, 60) }) });
      saveP(p);
    }
    var sent = 0;
    for (var i = 0; i < p.length && sent < 6; i++) {
      var it = p[i];
      if (busy[it.k] && Date.now() - busy[it.k] < 20000) continue;   // 送っている さいちゅう
      busy[it.k] = Date.now(); sent++;
      (function (k, b) {
        try {
          fetch(API, { method: 'POST', body: b, keepalive: b.length < 60000 }).then(function (r) { return r.text(); }).then(function (t) {
            delete busy[k];
            if (t === 'ok' || t === 'ng') saveP(loadP().filter(function (x) { return x.k !== k; }));   // ng は 送り直しても むだ なので 消す
          }).catch(function () { delete busy[k]; });
        } catch (e) { delete busy[k]; }
      })(it.k, it.b);
    }
  }

  // ひらいた / 見えなく なった（とじた・ほかの アプリへ）/ また 見えた
  var shown = Date.now(), total = 0;
  T('open', { first: first, dayFirst: dayFirst, since: last ? Math.round((Date.parse(day) - Date.parse(last)) / 864e5) : null, load: Math.round(performance.now()) });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { var s = Math.round((Date.now() - shown) / 1000); total += s; T('hide', { sec: s, total: total }); flush(); }
    else { shown = Date.now(); T('show', null); }
  });
  addEventListener('pagehide', function () { flush(); });
  addEventListener('error', function (e) { if (errs++ < 5) T('error', { m: String(e.message).slice(0, 200), f: String(e.filename || '').split('/').pop(), l: e.lineno }); });
  setTimeout(flush, 3000);
  setInterval(flush, 30000);
})();
