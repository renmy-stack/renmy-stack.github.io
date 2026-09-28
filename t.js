// ゲームの きろく（あとで 解析する ため）。全ゲーム 共通で <script src="/t.js?v=1"></script> で 読む
// 送りそこねた 記録は スマホに 残して あとで 送り直す（v=2）
// 送るもの: 日時・ゲーム・できごと（ひらいた / とじた / エラー / ゲームごとの できごと）・ランダムな 端末ID・端末の 種類や 画面の 大きさ
// 送らないもの: 名前・場所・IP など 個人の 情報。?nocount を 1 回 ひらいた 端末は 送らない（オーナー用）
// ゲーム側からは T('できごと', { 中身 }) で 記録できる（T が なくても こわれないよう window.T && T(...) で 呼ぶ）
// 引っこし（v=7）: renmy-stack.github.io → renmygames.com。スマホの 中の 記録（モンスター・クリア・ランクせん…）ごと 運ぶ
// github.io で ひらくと、localStorage を まるごと URL の # に のせて 同じ ページの renmygames.com へ（# は サーバーに 送られない）
// renmygames.com 側は 最初の 1 回だけ 受け取って 書きこみ、# から 消す
// 逆むき（取りに行く）: renmygames.com を 先に ひらいた 端末は、まだ 引っこして いなければ 一度 github.io へ 行き（?mvpull）記録を 持って もどる
// MOVE_ALL が false の あいだは github.io で ?movetest を 1 回 ひらいた 端末・renmygames.com で ?pulltest を ひらいた ときだけ
// github.io を やめる ときは PULL を false に（取りに 行かない）
// 記録ごと 運ぶのは モンスターバトルだけ（v=9、オーナー判断）。ほかの ページは github.io で ひらいたら 記録は 運ばず renmygames.com の 同じ ページへ
(function () {
  var NEW = 'https://renmygames.com', OLD = 'https://renmy-stack.github.io', MOVE_ALL = true, PULL = true, MAX = 1500000;
  var MOVE_PAGES = ['draw-monster'];
  try {
    var ls = localStorage, host = location.hostname, h = location.hash.slice(1), q = location.search;
    // 移動に 失敗すると 白い画面の まま に なる（iPad で 記録が 大きい とき）→ 4 秒 たっても ここに いれば 画面を 戻す。2 回 失敗した 端末は もう 運ばない（github.io の まま）
    var de = document.documentElement, show = function () { de.style.visibility = ''; };
    var go = function (url, mv) {
      de.style.visibility = 'hidden';
      if (mv) setTimeout(function () { show(); try { ls.setItem('mv.fail', String((+ls.getItem('mv.fail') || 0) + 1)); } catch (e) {} }, 4000);
      try { location.replace(url); } catch (e) { show(); if (mv) try { ls.setItem('mv.fail', '9'); } catch (e2) {} }
    };
    if (host === 'www.renmygames.com') { go(NEW + location.pathname + q + location.hash); return; }   // www は べつの 保存場所に なるので なしの 方へ
    var carry = MOVE_PAGES.indexOf(location.pathname.split('/')[1] || '') >= 0;
    if (/\.github\.io$/.test(host) && !carry) { go(NEW + location.pathname + q.replace(/[?&]mvpull(=[^&]*)?/, '').replace(/^&/, '?') + location.hash); return; }
    if (/\.github\.io$/.test(host)) {
      if (/[?&]movetest/.test(q)) ls.setItem('mv.test', '1');
      var pull = /[?&]mvpull/.test(q);
      if (!MOVE_ALL && !pull && ls.getItem('mv.test') !== '1') return;
      if (pull) q = q.replace(/[?&]mvpull(=[^&]*)?/, '').replace(/^&/, '?');
      if ((+ls.getItem('mv.fail') || 0) >= 2) return;
      var all = {}; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); all[k] = ls.getItem(k); }
      var data = btoa(unescape(encodeURIComponent(JSON.stringify(all)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      if (data.length > MAX) return;   // 大きすぎる ときは 運ばない（github.io の まま あそべる）
      go(NEW + location.pathname + q + '#' + (h ? h + '&' : '') + 'mv=' + data, true);
    } else if (host === 'renmygames.com') {
      if (/(^|&)mv=/.test(h)) {
        var rest = [], got = '';
        h.split('&').forEach(function (x) { if (x.indexOf('mv=') === 0) got = x.slice(3); else rest.push(x); });
        if (got && ls.getItem('mv.in') !== '1') {
          var o = JSON.parse(decodeURIComponent(escape(atob(got.replace(/-/g, '+').replace(/_/g, '/')))));
          for (var key in o) ls.setItem(key, o[key]);   // 前の 住所の 記録を そのまま（こちらが まだ 引っこし前 なので 上書きで よい）
          ls.setItem('mv.in', '1'); ls.setItem('mv.at', String(Date.now()));
        }
        history.replaceState(null, '', location.pathname + q + (rest.length ? '#' + rest.join('&') : ''));
      } else if (PULL && carry && (MOVE_ALL || /[?&]pulltest/.test(q)) && ls.getItem('mv.in') !== '1' && sessionStorage.getItem('mv.pull') !== '1') {
        sessionStorage.setItem('mv.pull', '1');   // 取りに 行くのは この タブで 1 回だけ（行き来の くりかえしを ふせぐ）
        go(OLD + location.pathname + (q ? q + '&' : '?') + 'mvpull' + location.hash);
      }
    }
  } catch (e) {}
})();

(function () {
  if (window.T) return;
  var API = 'https://script.google.com/macros/s/AKfycbxLuuErUis6wXoyY_O0oP6FasLkPWSsJdRBjGzWfAuvGIS6IipmH0A6CNh-I7Swh0JSHw/exec';
  // 送り先: Firebase Realtime Database（FB_ALL が true なら 全員、false なら ?fbtest を 1 回 ひらいた 端末だけ）。それ以外は 前の Apps Script
  var FB = 'https://renmy-games-default-rtdb.asia-southeast1.firebasedatabase.app', FB_ALL = true;
  // Cloudflare Workers ＋ D1（CF_ALL が true なら 全員、false なら ?cftest を 1 回 ひらいた 端末だけ）。Firebase より 先に 使う
  var CF = 'https://renmy-log.renmy-stack.workers.dev/log', CF_ALL = true;
  var G = window.T_GAME || location.pathname.split('/')[1] || 'portal';
  var q = [], off = !/(\.github\.io|renmygames\.com)$/.test(location.hostname), errs = 0;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var rid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); };
  if (/[?&]nocount/.test(location.search)) set('count.off', '1');
  if (get('count.off')) off = true;
  if (/[?&]fbtest/.test(location.search)) set('t.fb', '1');
  var useFB = FB_ALL || get('t.fb') === '1';
  if (/[?&]cftest/.test(location.search)) set('t.cf', '1');
  var useCF = CF_ALL || get('t.cf') === '1';
  window.T = function (ev, data) { if (off) return; q.push([Date.now(), String(ev), data == null ? null : data]); keepQ(); if (q.length >= 200) flush(); };
  // 送る 前の できごとも スマホに 置いておく（閉じる 合図が 来ないまま 終わっても 次に ひらいた ときに 送る）
  function keepQ() { try { if (q.length) localStorage.setItem('t.q.' + sid, JSON.stringify({ g: G, id: id, s: sid, ctx: ctx, ev: q })); else localStorage.removeItem('t.q.' + sid); } catch (e) {} }
  if (off) return;

  // 端末ID（ランダム）・この ゲームを ひらいた 回数・はじめての 日
  var id = get('t.id'); if (!id) { id = rid(); set('t.id', id); }
  var sid = rid(), day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  var n = (+get('t.n.' + G) || 0) + 1; set('t.n.' + G, String(n));
  var f = get('t.first.' + G), first = !f; if (first) { f = day; set('t.first.' + G, f); }
  var dayFirst = get('count.' + G) !== day; set('count.' + G, day);
  var last = get('t.last.' + G); set('t.last.' + G, day);

  // 端末の ようす（解析に 使う ものだけ。2026-09-28 に 画面の 解像度・画素比・タッチ・ダークを やめた）
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
    lang: navigator.language || '', vp: innerWidth + 'x' + innerHeight,
    dom: location.hostname === 'renmygames.com' ? 'r' : 'g', mv: get('mv.in') === '1', ref: ref, entry: entry.join(' '), n: n,
    days: Math.round((Date.parse(day) - Date.parse(f)) / 864e5)
  };

  // 送る 前の 記録は スマホに 保存（t.p）。受け付けが「ok」と 返したら 消す。失敗したら 間を あけて（30 秒 → 1 分 → 2 分 … 最大 30 分）送り直す
  // 1 回に 送るのは 1 通だけ（成功したら 続けて 最大 3 通）。混んで いる ときに 送り直しで さらに 混ませない ため
  // （送り直しで 同じ 記録が 2 回 とどく ことが ある → 解析で セッション・日時・できごと・中身 が 同じ 行を 1 つに）
  var PK = 't.p', MAXP = 100, sending = false;
  // 端末の ようす（ctx）は、この セッションで 一度 とどくまで 毎回 つける。とどいたら 版と 表示の 大きさ だけ（1 通を 軽く）
  var ctxOk = false;
  function loadP() { try { return JSON.parse(get(PK) || '[]'); } catch (e) { return []; } }
  function saveP(p) { set(PK, JSON.stringify(p.slice(-MAXP))); }
  function flush() {
    var p = loadP();
    if (q.length) {
      ctx.v = window.T_VER || ctx.v; ctx.vp = innerWidth + 'x' + innerHeight;
      var last = p[p.length - 1], lb = null;
      try { lb = last && JSON.parse(last.b); } catch (e) {}
      if (lb && lb.s === sid && lb.g === G && lb.ev.length + q.length <= 200 && !(sending && last.k === sending)) { lb.ev = lb.ev.concat(q.splice(0, 200 - lb.ev.length)); last.b = JSON.stringify(lb); }   // 前の 通に まとめる
      while (q.length) p.push({ k: rid(), full: !ctxOk, b: JSON.stringify({ g: G, id: id, s: sid, ctx: ctxOk ? { v: ctx.v, vp: ctx.vp } : ctx, ev: q.splice(0, 200) }) });
      saveP(p); keepQ();
    }
    send(3);
  }
  function send(left) {
    if (sending || left <= 0) return;
    if (Date.now() < (+get('t.wait') || 0)) return;   // 失敗の あと 休み中
    var p = loadP(); if (!p.length) return;
    var it = p[0]; sending = it.k;
    var done = function (ok) {
      sending = false;
      if (ok) { if (it.full && JSON.parse(it.b).s === sid) ctxOk = true; saveP(loadP().filter(function (x) { return x.k !== it.k; })); set('t.fail', '0'); set('t.wait', '0'); send(left - 1); }
      else { var f = Math.min((+get('t.fail') || 0) + 1, 6); set('t.fail', String(f)); set('t.wait', String(Date.now() + 30000 * Math.pow(2, f - 1))); }
    };
    try {
      if (useCF) {
        fetch(CF, { method: 'POST', body: it.b, keepalive: it.b.length < 60000 }).then(function (r) { return r.text(); })
          .then(function (t) { done(t === 'ok' || t === 'ng'); }, function () { done(false); });
      } else if (useFB) {
        // Firebase: log/日付/自動ID に 1 通。中身は 文字列（ルールで 長さを しばる）。401・400 は 送り直しても むだ なので 消す
        var o = JSON.parse(it.b), day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
        var fb = JSON.stringify({ g: o.g, id: String(o.id), s: String(o.s), c: JSON.stringify(o.ctx || {}), e: JSON.stringify(o.ev || []), r: { '.sv': 'timestamp' } });
        fetch(FB + '/log/' + day + '.json', { method: 'POST', body: fb, keepalive: fb.length < 60000 })
          .then(function (r) { done(r.ok || r.status === 400 || r.status === 401); }, function () { done(false); });
      } else {
        fetch(API, { method: 'POST', body: it.b, keepalive: it.b.length < 60000 }).then(function (r) { return r.text(); })
          .then(function (t) { done(t === 'ok' || t === 'ng'); }, function () { done(false); });   // ng は 送り直しても むだ なので 消す
      }
    } catch (e) { done(false); }
  }

  // ひらいた / 見えなく なった（とじた・ほかの アプリへ）。また 見えた ときは 記録しない（hide の 秒で わかる）
  var shown = Date.now(), total = 0;
  T('open', { first: first, dayFirst: dayFirst, since: last ? Math.round((Date.parse(day) - Date.parse(last)) / 864e5) : null, load: Math.round(performance.now()) });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { var s = Math.round((Date.now() - shown) / 1000); total += s; T('hide', { sec: s, total: total }); flush(); }
    else shown = Date.now();
  });
  addEventListener('pagehide', function () { flush(); });
  addEventListener('error', function (e) { if (errs++ < 5) T('error', { m: String(e.message).slice(0, 200), f: String(e.filename || '').split('/').pop(), l: e.lineno }); });
  // 前の セッションで 送れなかった できごとを 送る 箱に 移す
  try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('t.q.') === 0 && k !== 't.q.' + sid) { var o = JSON.parse(localStorage.getItem(k)); var pp = loadP(); pp.push({ k: rid(), full: true, b: JSON.stringify(o) }); saveP(pp); localStorage.removeItem(k); } } } catch (e) {}
  // 送るのは 見えなく なった とき・200 件 たまった とき・15 分ごと（1 通 = データベースの 1 行。回数を しぼって 書きこみ枠を 節約）。
  // はじめの 10 秒で 送るのは 前に 送れなかった 分だけ
  setTimeout(function () { send(3); }, 10000);
  setInterval(flush, 900000);
})();
