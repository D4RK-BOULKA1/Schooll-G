/* School-G : importer le design d'un bulletin à partir d'une photo.
   1) analyse par l'IA via la fonction serveur « analyseBulletin » (si elle est déployée) ;
   2) sinon, repli local : reprise des couleurs dominantes de la photo. */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc } = U;
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const BOOLS = ['zebra', 'showLogo', 'showCoef', 'showDevCompo', 'showTotal', 'showAppr', 'showRank', 'showClassAvg', 'showMinMax', 'showAbs', 'showMention', 'showObs', 'showSign'];

  const clean = o => {
    const t = {}; o = o || {};
    if (typeof o.title === 'string' && o.title.trim()) t.title = o.title.trim().slice(0, 60);
    if (HEX.test(o.p)) t.p = o.p; if (HEX.test(o.a)) t.a = o.a;
    if (['sans', 'serif'].includes(o.font)) t.font = o.font;
    if (['left', 'center', 'official'].includes(o.header)) t.header = o.header;
    if (['none', 'thin', 'double', 'thick'].includes(o.border)) t.border = o.border;
    BOOLS.forEach(k => { if (typeof o[k] === 'boolean') t[k] = o[k]; });
    if (typeof o.footer === 'string') t.footer = o.footer.trim().slice(0, 120);
    return t;
  };

  function loadImage(file, max) {
    return new Promise((ok, ko) => {
      const fr = new FileReader();
      fr.onerror = () => ko(new Error('Lecture de la photo impossible.'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => ko(new Error('Ce fichier n\'est pas une image valide.'));
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
          cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
          ok(cv);
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---- repli local : couleurs dominantes ---- */
  function palette(cv) {
    const w = 140, h = Math.max(1, Math.round(cv.height * w / cv.width)), c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const cx = c2.getContext('2d'); cx.drawImage(cv, 0, 0, w, h); const px = cx.getImageData(0, 0, w, h).data;
    const B = new Map();
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
      if (l > .88) continue; // papier blanc
      const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); const o = B.get(key) || { n: 0, r: 0, g: 0, b: 0, l, s }; o.n++; o.r += r; o.g += g; o.b += b; B.set(key, o);
    }
    const list = [...B.values()].map(o => ({ n: o.n, r: Math.round(o.r / o.n), g: Math.round(o.g / o.n), b: Math.round(o.b / o.n), l: o.l, s: o.s })).sort((a, b) => b.n - a.n);
    const hex = o => '#' + [o.r, o.g, o.b].map(v => v.toString(16).padStart(2, '0')).join('');
    const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    const dark = list.find(o => o.l < .45), prim = dark || list[0];
    const acc = list.find(o => o.s > .45 && o.l > .25 && o.l < .75 && (!prim || dist(o, prim) > 90));
    const t = {}; if (prim) t.p = hex(prim); if (acc) t.a = hex(acc); return t;
  }

  const base = () => { const b = Object.assign({}, D.customTheme || DOC.THEMES[0]); delete b.id; delete b.name; return b; };

  A.importDesign = async file => {
    const m = UI.modal({ title: 'Importer le design d\'un bulletin', size: 'sm', body: '<p id="imMsg">Analyse de la photo en cours… Cela peut prendre quelques secondes.</p>', actions: [] });
    const say = t => { const e = m.el.querySelector('#imMsg'); if (e) e.innerHTML = t; };
    try {
      const cv = await loadImage(file, 1400);
      let theme = null, how = '';
      const fn = window.firebase && firebase.functions;
      if (fn) {
        try {
          const call = firebase.functions().httpsCallable('analyseBulletin', { timeout: 70000 });
          const r = await call({ image: cv.toDataURL('image/jpeg', .82).split(',')[1], mime: 'image/jpeg' });
          theme = clean(r.data && r.data.theme); how = 'ia';
          if (!theme.p && !theme.a) theme = null;
        } catch (e) {
          if (e && e.code === 'functions/resource-exhausted') { m.close(); return UI.toast(e.message || 'Limite d\'analyses atteinte pour aujourd\'hui.', 'err'); }
        }
      }
      if (!theme) { theme = palette(cv); how = 'couleurs'; if (!theme.p && !theme.a) throw new Error('Aucune couleur exploitable dans cette photo. Prenez-la sur une table claire, bien éclairée.'); }
      D.customTheme = Object.assign(base(), theme); ST.bTheme = 'custom'; A.save(); m.close(); A.rerender();
      UI.toast(how === 'ia' ? 'Design du bulletin copié. Ajustez-le si besoin dans « Thème personnalisé ».' : 'Analyse automatique indisponible pour le moment : seules les couleurs ont été reprises. Réglez le reste dans « Thème personnalisé ».', 'ok');
    } catch (e) {
      say('<b style="color:var(--red)">' + esc(e.message || String(e)) + '</b>');
      const f = m.el.querySelector('.mdl-f'); if (f) f.innerHTML = '<button type="button" class="btn btn-ghost" data-close>Fermer</button>';
    }
  };

  A.acts['bul-import'] = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = () => { if (i.files[0]) A.importDesign(i.files[0]); };
    i.click();
  };
})();
