/* School-G : éditeur de bulletin (modèles libres).
   Page A4 de 794 x 1122 px ; chaque élément est positionné librement (texte, image, forme, tableau des notes).
   Les modèles sont enregistrés dans D.bulTpls ; D.bulActive désigne celui utilisé (publié aussi aux parents). */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc } = U;
  const PW = DOC.PAGE.w, PH = DOC.PAGE.h;
  const uid = () => 'e' + Math.random().toString(36).slice(2, 9);
  const clone = o => JSON.parse(JSON.stringify(o));
  const IC = { undo: '<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>' };
  const svg = p => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  const CSS = `
#bed{position:fixed;inset:0;z-index:800;background:#E9E5DB;display:flex;flex-direction:column;font-family:'Public Sans',system-ui,sans-serif;color:#14213D;font-size:13px}
#bed *{box-sizing:border-box}
#bed button{font:inherit;cursor:pointer}
#bed .be-top{height:54px;background:#fff;border-bottom:1px solid #D3CCBC;display:flex;align-items:center;gap:8px;padding:0 12px;flex:none}
#bed .be-top .sp{flex:1}
#bed .be-name{font:600 15px 'Public Sans',sans-serif;border:1px solid transparent;border-radius:6px;padding:7px 10px;width:260px;background:#F6F3EC;color:#14213D}
#bed .be-name:focus{outline:2px solid #E4572E;background:#fff}
#bed .tb{display:inline-flex;align-items:center;gap:6px;border:1px solid #D3CCBC;background:#fff;border-radius:6px;padding:7px 10px;color:#14213D;font-weight:600}
#bed .tb:hover{background:#F6F3EC}#bed .tb[disabled]{opacity:.35;cursor:default}
#bed .tb.pri{background:#E4572E;border-color:#E4572E;color:#fff}#bed .tb.pri:hover{background:#cf4a23}
#bed .be-main{flex:1;display:flex;min-height:0}
#bed aside{background:#fff;overflow-y:auto;flex:none;padding:12px}
#bed .be-l{width:208px;border-right:1px solid #D3CCBC}
#bed .be-r{width:272px;border-left:1px solid #D3CCBC}
#bed h4{font:700 11px 'Public Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7a7461;margin:14px 0 8px}
#bed h4:first-child{margin-top:0}
#bed .ad{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#bed .ad button{border:1px solid #D3CCBC;background:#fff;border-radius:6px;padding:9px 6px;font-weight:600;color:#14213D;text-align:center;line-height:1.2}
#bed .ad button:hover{border-color:#E4572E;background:#FFF3EC}
#bed select,#bed input[type=text],#bed input[type=number],#bed textarea{width:100%;border:1px solid #D3CCBC;border-radius:6px;padding:6px 8px;font:inherit;background:#fff;color:#14213D}
#bed textarea{resize:vertical;min-height:70px}
#bed input[type=color]{width:100%;height:30px;border:1px solid #D3CCBC;border-radius:6px;padding:2px;background:#fff;cursor:pointer}
#bed label.f{display:block;font-size:11px;font-weight:600;color:#7a7461;margin:0 0 3px}
#bed .row{display:grid;gap:8px;margin-bottom:9px}
#bed .r2{grid-template-columns:1fr 1fr}#bed .r3{grid-template-columns:1fr 1fr 1fr}#bed .r4{grid-template-columns:repeat(4,1fr)}
#bed .seg{display:flex;border:1px solid #D3CCBC;border-radius:6px;overflow:hidden}
#bed .seg button{flex:1;border:0;background:#fff;padding:6px 0;color:#14213D;font-weight:700;border-right:1px solid #D3CCBC}
#bed .seg button:last-child{border-right:0}#bed .seg button.on{background:#14213D;color:#fff}
#bed .chk{display:flex;align-items:center;gap:7px;margin-bottom:6px;font-weight:500}#bed .chk input{width:auto}
#bed .lay{display:flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer;margin-bottom:2px}
#bed .lay:hover{background:#F6F3EC}#bed .lay.on{background:#FFF3EC;border-color:#E4572E}
#bed .lay span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bed .lay button{border:0;background:none;padding:1px 4px;color:#7a7461}
#bed .be-c{flex:1;overflow:auto;padding:24px;position:relative}
#bed .be-stage{margin:0 auto;position:relative}
#bed .be-scale{position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;transform-origin:0 0;box-shadow:0 2px 14px rgba(0,0,0,.18);background:#fff}
#bed .be-scale .fb{page-break-after:auto}
#bed .be-scale .fe{cursor:move}
#bed .be-scale .fe.ed{cursor:text;outline:2px solid #E4572E}
#bed .be-scale .fe .tx{user-select:none}#bed .be-scale .fe.ed .tx{user-select:text}
#bed .be-ov{position:absolute;inset:0;pointer-events:none}
#bed .be-sel{position:absolute;border:1.5px solid #E4572E;pointer-events:none;display:none}
#bed .be-sel i{position:absolute;width:10px;height:10px;background:#fff;border:1.5px solid #E4572E;border-radius:2px;pointer-events:auto}
#bed .be-gv,#bed .be-gh{position:absolute;background:#E4572E;display:none;pointer-events:none}
#bed .be-gv{width:1px;top:0;bottom:0}#bed .be-gh{height:1px;left:0;right:0}
#bed .hint{font-size:11.5px;color:#7a7461;line-height:1.5}
#bed .hint kbd{background:#F6F3EC;border:1px solid #D3CCBC;border-radius:4px;padding:0 4px;font:600 11px monospace}
#bed .del{color:#c0392b}
`;

  const FONT_OPTS = Object.keys(DOC.FONT_NAMES).map(k => `<option value="${k}">${DOC.FONT_NAMES[k]}</option>`).join('');
  const lbl = e => e.type === 'text' ? ((e.text || '').replace(/\{\{(\w+)\}\}/g, '·').split('\n')[0].slice(0, 22) || 'Texte vide') : e.type === 'image' ? (e.kind === 'logo' ? 'Logo de l\'école' : e.kind === 'photo' ? 'Photo de l\'élève' : 'Image') : e.type === 'table' ? 'Tableau des notes' : (e.h <= 6 || e.w <= 6) ? 'Ligne' : e.br >= 50 ? 'Cercle' : 'Rectangle';

  function resizeFile(file, max, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => U.toast ? U.toast('Image illisible.', 'err') : 0;
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        const png = /png|svg|gif|webp/.test(file.type), cx = cv.getContext('2d');
        if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); }
        cx.drawImage(im, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL(png ? 'image/png' : 'image/jpeg', .85));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function open(tpl) {
    if (window.innerWidth < 900) return UI.toast('L\'éditeur de bulletin s\'utilise sur un ordinateur ou une tablette en mode paysage.', 'err');
    if (!document.getElementById('bed-css')) { const s = document.createElement('style'); s.id = 'bed-css'; s.textContent = CSS + DOC.freeCss; document.head.appendChild(s); }
    const t = clone(tpl), school = A.school(); t.els = t.els || []; if (!t.id) t.id = 'm' + Math.random().toString(36).slice(2, 9);
    let sel = null, z = 1, editing = null, hist = [], hi = -1, savedAt = null, tmr = null, nudgeAdd = 0;
    const state = () => JSON.stringify({ bg: t.bg, els: t.els });
    const ov = document.createElement('div'); ov.id = 'bed';
    const studs = () => D.students.filter(s => s.classId === ST.bCls && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
    ov.innerHTML = `<div class="be-top">
      <button class="tb" data-a="close">${svg('<path d="m15 18-6-6 6-6"/>')}Fermer</button>
      <input class="be-name" id="be-name" type="text" maxlength="50" value="${esc(t.name || '')}" placeholder="Nom du modèle">
      <button class="tb" data-a="undo" id="be-undo" title="Annuler (Ctrl+Z)">${svg(IC.undo)}</button><button class="tb" data-a="redo" id="be-redo" title="Rétablir (Ctrl+Y)">${svg(IC.redo)}</button>
      <div class="sp"></div>
      <span class="hint">Aperçu avec :</span><select id="be-stu" style="width:170px">${studs().map(s => `<option value="${s.id}" ${s.id === ST.bStu ? 'selected' : ''}>${esc(A.name(s))}</option>`).join('')}</select>
      <button class="tb" data-a="zm">−</button><span id="be-zl" style="min-width:42px;text-align:center;font-weight:600">100%</span><button class="tb" data-a="zp">+</button><button class="tb" data-a="zf">Ajuster</button>
      <button class="tb pri" data-a="save">Enregistrer</button></div>
    <div class="be-main"><aside class="be-l" id="be-l"></aside><div class="be-c" id="be-c"><div class="be-stage" id="be-st"><div class="be-scale" id="be-sc"><div id="be-host"></div><div class="be-ov" id="be-ov"><div class="be-gv" id="gv"></div><div class="be-gh" id="gh"></div><div class="be-sel" id="be-sel">${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(h => `<i data-h="${h}"></i>`).join('')}</div></div></div></div></div><aside class="be-r" id="be-r"></aside></div>
    <input type="file" id="be-file" accept="image/*" hidden>`;
    document.body.appendChild(ov);
    const $ = id => ov.querySelector('#' + id), host = $('be-host'), sc = $('be-sc'), stg = $('be-st'), cnv = $('be-c'), selBox = $('be-sel');
    const get = id => t.els.find(e => e.id === id);
    const node = id => host.querySelector(`.fe[data-id="${id}"]`);

    /* ---------- historique ---------- */
    const commit = () => { const s = state(); if (s === hist[hi]) return; hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 80) hist.shift(); hi = hist.length - 1; btns(); };
    const later = () => { clearTimeout(tmr); tmr = setTimeout(commit, 350); };
    const btns = () => { $('be-undo').disabled = hi <= 0; $('be-redo').disabled = hi >= hist.length - 1; };
    const restore = () => { const o = JSON.parse(hist[hi]); t.bg = o.bg; t.els = o.els; if (sel && !get(sel)) sel = null; render(); panel(); layers(); btns(); };
    hist = [state()]; hi = 0; btns();

    /* ---------- affichage ---------- */
    const fit = () => { const w = cnv.clientWidth - 48; z = Math.max(.3, Math.min(1.5, w / PW)); setZ(); };
    const setZ = () => { sc.style.transform = `scale(${z})`; stg.style.width = PW * z + 'px'; stg.style.height = PH * z + 'px'; $('be-zl').textContent = Math.round(z * 100) + '%'; };
    const render = () => { host.innerHTML = DOC.bulletinFree(D, school, ST.bStu, ST.bPer, t, { raw: true, edit: true }); sc.style.background = t.bg || '#fff'; box(); };
    const box = () => {
      const e = sel && get(sel), n = e && node(sel);
      if (!e || !n) { selBox.style.display = 'none'; return; }
      selBox.style.display = 'block'; Object.assign(selBox.style, { left: n.offsetLeft + 'px', top: n.offsetTop + 'px', width: n.offsetWidth + 'px', height: n.offsetHeight + 'px' });
      const hs = 10 / z; selBox.style.borderWidth = 1.5 / z + 'px';
      selBox.querySelectorAll('i').forEach(i => { const h = i.dataset.h, s = i.style; s.width = s.height = hs + 'px'; s.borderWidth = 1.5 / z + 'px'; s.left = h.includes('w') ? -hs / 2 + 'px' : h.includes('e') ? 'auto' : `calc(50% - ${hs / 2}px)`; s.right = h.includes('e') ? -hs / 2 + 'px' : 'auto'; s.top = h.includes('n') ? -hs / 2 + 'px' : h.includes('s') ? 'auto' : `calc(50% - ${hs / 2}px)`; s.bottom = h.includes('s') ? -hs / 2 + 'px' : 'auto'; s.cursor = h + '-resize'; if (e.type === 'table' && (h === 'n' || h === 's' || h.length === 2)) s.display = 'none'; else s.display = ''; });
    };

    /* ---------- panneau gauche : ajout + calques ---------- */
    const left = () => {
      $('be-l').innerHTML = `<h4>Ajouter</h4><div class="ad">
        <button data-add="text">Texte</button><button data-add="title">Titre</button>
        <button data-add="image">Image</button><button data-add="logo">Logo de l'école</button>
        <button data-add="photo">Photo élève</button><button data-add="table">Tableau des notes</button>
        <button data-add="rect">Rectangle</button><button data-add="circle">Cercle</button>
        <button data-add="line">Ligne</button><button data-add="box">Case vide</button></div>
        <h4>Champ de données</h4><select id="be-var"><option value="">Insérer un champ…</option>${DOC.VARS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
        <p class="hint" style="margin-top:6px">Remplacé automatiquement pour chaque élève. Vous pouvez aussi taper <b>{{nom}}</b> dans un texte.</p>
        <h4>Calques</h4><div id="be-lay"></div>
        <h4>Raccourcis</h4><p class="hint"><kbd>Double-clic</kbd> modifier le texte<br><kbd>Flèches</kbd> déplacer (<kbd>Maj</kbd> = 10 px)<br><kbd>Suppr</kbd> supprimer · <kbd>Ctrl+D</kbd> dupliquer<br><kbd>Ctrl+Z</kbd> annuler · <kbd>Ctrl+S</kbd> enregistrer<br><kbd>Alt</kbd> pendant le déplacement : sans aimantation</p>`;
      layers();
    };
    const layers = () => {
      const l = $('be-lay'); if (!l) return;
      l.innerHTML = t.els.slice().reverse().map(e => `<div class="lay ${e.id === sel ? 'on' : ''}" data-l="${e.id}"><span>${esc(lbl(e))}</span><button data-up="${e.id}" title="Avancer">▲</button><button data-dn="${e.id}" title="Reculer">▼</button></div>`).join('') || '<p class="hint">Aucun élément.</p>';
    };

    /* ---------- panneau droit : propriétés ---------- */
    const num = (p, label, o = {}) => `<div><label class="f">${label}</label><input type="number" data-p="${p}" step="${o.step || 1}" ${o.min != null ? `min="${o.min}"` : ''} ${o.max != null ? `max="${o.max}"` : ''}></div>`;
    const col = (p, label) => `<div><label class="f">${label}</label><input type="color" data-p="${p}"></div>`;
    const seg = (p, opts) => `<div class="seg" data-seg="${p}">${opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`;
    const panel = () => {
      const e = sel && get(sel), r = $('be-r');
      if (!e) {
        r.innerHTML = `<h4>Page</h4><div class="row"><div>${'<label class="f">Couleur de fond</label>'}<input type="color" id="be-bg" value="${t.bg || '#ffffff'}"></div></div>
          <p class="hint">Cliquez sur un élément de la page pour le modifier. Glissez-le pour le déplacer, tirez les poignées pour le redimensionner.</p>
          <p class="hint" style="margin-top:8px">Pour changer le nom, l'adresse ou le logo de l'école, passez par <b>Paramètres</b> : ils se mettent à jour dans tous les modèles.</p>`;
        const bg = r.querySelector('#be-bg'); bg.oninput = () => { t.bg = bg.value; sc.style.background = t.bg; later(); }; return;
      }
      let h = `<h4>${esc(lbl(e))}</h4><div class="row r4">${num('x', 'X')}${num('y', 'Y')}${num('w', 'Larg.', { min: 4 })}${e.type === 'table' ? '<div></div>' : num('h', 'Haut.', { min: 1 })}</div>
        <div class="row"><div class="seg"><button data-al="l" title="Aligner à gauche">⇤</button><button data-al="c" title="Centrer horizontalement">↔</button><button data-al="r" title="Aligner à droite">⇥</button><button data-al="t" title="En haut">⤒</button><button data-al="m" title="Centrer verticalement">↕</button><button data-al="b" title="En bas">⤓</button></div></div>`;
      if (e.type === 'text') {
        h += `<div class="row"><div><label class="f">Texte</label><textarea data-p="text"></textarea></div><select id="be-ins"><option value="">Insérer un champ…</option>${DOC.VARS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></div>
          <div class="row r2"><div><label class="f">Police</label><select data-p="font">${FONT_OPTS}</select></div>${num('size', 'Taille (px)', { min: 5, max: 200, step: .5 })}</div>
          <div class="row"><div class="seg" data-tog="1"><button data-t="b" style="font-weight:800">G</button><button data-t="i" style="font-style:italic">I</button><button data-t="u" style="text-decoration:underline">S</button><button data-t="up">AA</button></div></div>
          <div class="row">${seg('align', [['left', '≡'], ['center', '☰'], ['right', '≣'], ['justify', '▤']])}</div>
          <div class="row">${seg('va', [['top', 'Haut'], ['middle', 'Milieu'], ['bottom', 'Bas']])}</div>
          <div class="row r2">${col('color', 'Couleur du texte')}<div><label class="f">Fond</label><input type="color" data-p="bg"><label class="chk" style="margin:4px 0 0"><input type="checkbox" data-none="bg">Aucun</label></div></div>
          <div class="row r3">${num('lh', 'Interligne', { step: .1, min: .8, max: 3 })}${num('ls', 'Espacement', { step: .1, min: -2, max: 20 })}${num('pad', 'Marge', { min: 0, max: 60 })}</div>`;
      }
      if (e.type === 'image') {
        h += `${e.kind ? '' : '<div class="row"><button class="tb" data-a="repl" style="width:100%;justify-content:center">Changer l\'image…</button></div>'}
          ${e.kind === 'logo' ? '<p class="hint">Logo enregistré dans les paramètres de l\'école.</p>' : ''}${e.kind === 'photo' ? '<p class="hint">Photo de l\'élève (si elle est enregistrée).</p>' : ''}
          <div class="row"><div><label class="f">Ajustement</label><select data-p="fit"><option value="contain">Entière</option><option value="cover">Remplir (rogner)</option><option value="fill">Étirer</option></select></div></div>`;
      }
      if (e.type === 'table') {
        const C = e.cols || {}, L = e.labels || {};
        h += `<div class="row"><label class="f">Colonnes (cochez, puis renommez)</label>
          <div class="row r2" style="margin:0 0 6px"><span class="chk"><input type="checkbox" checked disabled>Matière</span><input type="text" data-lb="sub" placeholder="Matière" value="${esc(L.sub || '')}"></div>
          ${[['coef', 'Coef'], ['cls', 'Classe'], ['compo', 'Compo'], ['avg', 'Moyenne'], ['total', 'Total'], ['appr', 'Appréciation']].map(([k, d]) => `<div class="row r2" style="margin:0 0 6px"><label class="chk"><input type="checkbox" data-col="${k}" ${C[k] !== false && (C[k] || k === 'avg') ? 'checked' : ''}>${d}</label><input type="text" data-lb="${k}" placeholder="${d}" value="${esc(L[k] || '')}"></div>`).join('')}</div>
          <div class="row r2"><div><label class="f">Police</label><select data-p="font">${FONT_OPTS}</select></div>${num('size', 'Taille (px)', { min: 6, max: 30, step: .5 })}</div>
          <div class="row r2">${col('headBg', 'Fond de l\'en-tête')}${col('headColor', 'Texte de l\'en-tête')}</div>
          <div class="row r2">${col('color', 'Couleur du texte')}${col('lc', 'Couleur des traits')}</div>
          <div class="row r2">${num('pad', 'Hauteur des lignes', { min: 1, max: 20 })}<div></div></div>
          <label class="chk"><input type="checkbox" data-bool="zebra">Lignes alternées</label><label class="chk"><input type="checkbox" data-bool="foot">Ligne « Total / moyenne générale »</label>`;
      }
      if (e.type === 'rect') h += `<div class="row r2">${col('bg', 'Couleur')}<div></div></div>`;
      if (e.type === 'rect' || e.type === 'image' || e.type === 'text') {
        h += `<div class="row r3">${num('bw', 'Bordure', { min: 0, max: 30, step: .5 })}${col('bc', 'Couleur')}${num('br', 'Arrondi', { min: 0, max: 400 })}</div>
          <div class="row"><div><label class="f">Style de bordure</label><select data-p="bs"><option value="solid">Continu</option><option value="dashed">Tirets</option><option value="dotted">Points</option><option value="double">Double</option></select></div></div>`;
      }
      h += `<div class="row"><div><label class="f">Opacité</label><input type="range" data-p="op" min="0.1" max="1" step="0.05" style="width:100%"></div></div>
        <div class="row r2"><button class="tb" data-a="dup" style="justify-content:center">Dupliquer</button><button class="tb del" data-a="del" style="justify-content:center">Supprimer</button></div>
        <div class="row r2"><button class="tb" data-a="front" style="justify-content:center">Premier plan</button><button class="tb" data-a="back" style="justify-content:center">Arrière-plan</button></div>`;
      r.innerHTML = h; fill();
    };
    const fill = () => {
      const e = sel && get(sel), r = $('be-r'); if (!e) return;
      r.querySelectorAll('[data-p]').forEach(i => { const v = e[i.dataset.p]; if (i === document.activeElement) return; i.value = v == null ? (i.dataset.p === 'op' ? 1 : i.dataset.p === 'bs' ? 'solid' : i.dataset.p === 'fit' ? 'contain' : i.dataset.p === 'font' ? 'pub' : '') : v; if (i.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(i.value)) i.value = '#ffffff'; });
      r.querySelectorAll('[data-none]').forEach(i => { i.checked = !e[i.dataset.none]; });
      r.querySelectorAll('[data-seg]').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', (e[s.dataset.seg] || (s.dataset.seg === 'va' ? 'top' : 'left')) === b.dataset.v)));
      r.querySelectorAll('[data-tog] button').forEach(b => b.classList.toggle('on', !!e[b.dataset.t]));
      r.querySelectorAll('[data-bool]').forEach(i => { i.checked = i.dataset.bool === 'foot' ? e.foot !== false : !!e[i.dataset.bool]; });
    };

    /* ---------- sélection / modifications ---------- */
    const select = id => { if (editing) endEdit(); sel = id; box(); panel(); layers(); };
    const upd = (e, k, v) => { e[k] = v; };
    const redraw = () => { const keep = sel; render(); sel = keep; box(); };
    const syncPos = () => { const e = sel && get(sel); if (!e) return; const r = $('be-r'); ['x', 'y', 'w', 'h'].forEach(k => { const i = r.querySelector(`[data-p="${k}"]`); if (i && e[k] != null) i.value = Math.round(e[k] * 10) / 10; }); };
    const add = (type, extra) => {
      const base = { id: uid(), x: 80 + nudgeAdd, y: 80 + nudgeAdd }; nudgeAdd = (nudgeAdd + 20) % 120;
      const D0 = {
        text: { type: 'text', w: 260, h: 40, text: 'Votre texte', font: 'pub', size: 16, color: '#14213D', align: 'left', va: 'top', lh: 1.3, ls: 0, pad: 4 },
        title: { type: 'text', w: 600, h: 50, text: 'TITRE', font: 'fra', size: 28, b: 1, color: '#14213D', align: 'center', va: 'middle', lh: 1.2, ls: 1, pad: 4 },
        rect: { type: 'rect', w: 200, h: 80, bg: '#E4572E', bw: 0, bc: '#14213D', bs: 'solid', br: 0 },
        circle: { type: 'rect', w: 100, h: 100, bg: '#E4572E', bw: 0, bc: '#14213D', bs: 'solid', br: 50 },
        line: { type: 'rect', w: 300, h: 2, bg: '#14213D', bw: 0, br: 0 },
        box: { type: 'rect', w: 220, h: 80, bg: '', bw: 1, bc: '#14213D', bs: 'solid', br: 0 },
        logo: { type: 'image', kind: 'logo', w: 80, h: 80, fit: 'contain' },
        photo: { type: 'image', kind: 'photo', w: 90, h: 110, fit: 'cover', bw: 1, bc: '#14213D', bs: 'solid' },
        image: { type: 'image', w: 120, h: 120, fit: 'contain' },
        table: { type: 'table', w: 714, x: 40, y: 300, cols: { coef: true, cls: true, compo: true, avg: true, total: true, appr: true }, labels: {}, size: 11.5, headBg: '#14213D', headColor: '#ffffff', zebra: true, lc: '#d9d9d9', color: '#14213D', pad: 5, foot: true, font: 'pub' }
      }[type];
      const e = Object.assign(base, clone(D0), extra || {}); if (type === 'table') { e.x = 40; e.y = 300; }
      t.els.push(e); redraw(); select(e.id); commit(); return e;
    };
    const remove = () => { if (!sel) return; t.els = t.els.filter(e => e.id !== sel); sel = null; render(); panel(); layers(); commit(); };
    const dup = () => { const e = sel && get(sel); if (!e) return; const c = clone(e); c.id = uid(); c.x += 14; c.y += 14; t.els.push(c); redraw(); select(c.id); commit(); };
    const order = (id, d) => { const i = t.els.findIndex(e => e.id === id), j = Math.max(0, Math.min(t.els.length - 1, i + d)); if (i < 0 || i === j) return; const [e] = t.els.splice(i, 1); t.els.splice(j, 0, e); redraw(); layers(); commit(); };
    const align = k => {
      const e = sel && get(sel), n = e && node(sel); if (!e) return; const w = e.w, h = e.type === 'table' ? n.offsetHeight : e.h;
      if (k === 'l') e.x = 0; if (k === 'c') e.x = Math.round((PW - w) / 2); if (k === 'r') e.x = PW - w; if (k === 't') e.y = 0; if (k === 'm') e.y = Math.round((PH - h) / 2); if (k === 'b') e.y = PH - h;
      redraw(); syncPos(); commit();
    };

    /* ---------- saisie dans le panneau ---------- */
    const rp = $('be-r');
    rp.addEventListener('input', ev => {
      const i = ev.target, e = sel && get(sel); if (!e) return;
      if (i.dataset.p) { let v = i.value; if (i.type === 'number' || i.type === 'range') { v = parseFloat(v); if (isNaN(v)) return; } upd(e, i.dataset.p, v); if (i.dataset.p === 'bg') { const nn = rp.querySelector('[data-none="bg"]'); if (nn) nn.checked = false; } redraw(); later(); layers(); }
      else if (i.dataset.lb) { e.labels = e.labels || {}; e.labels[i.dataset.lb] = i.value.slice(0, 24); redraw(); later(); }
    });
    rp.addEventListener('change', ev => {
      const i = ev.target, e = sel && get(sel); if (!e) return;
      if (i.dataset.col) { e.cols = e.cols || {}; e.cols[i.dataset.col] = i.checked; redraw(); commit(); }
      else if (i.dataset.bool) { e[i.dataset.bool] = i.checked; redraw(); commit(); }
      else if (i.dataset.none) { if (i.checked) e[i.dataset.none] = ''; else e[i.dataset.none] = '#ffffff'; redraw(); fill(); commit(); }
      else if (i.id === 'be-ins' && i.value) { const ta = rp.querySelector('textarea[data-p=text]'); const s = '{{' + i.value + '}}'; const a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd; ta.value = ta.value.slice(0, a) + s + ta.value.slice(b); e.text = ta.value; i.value = ''; redraw(); commit(); }
    });
    rp.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return; const e = sel && get(sel); if (!e) return;
      if (b.dataset.al) return align(b.dataset.al);
      if (b.closest('[data-seg]')) { e[b.closest('[data-seg]').dataset.seg] = b.dataset.v; redraw(); fill(); commit(); return; }
      if (b.closest('[data-tog]')) { const k = b.dataset.t; e[k] = e[k] ? 0 : 1; redraw(); fill(); commit(); return; }
      const a = b.dataset.a;
      if (a === 'dup') dup(); else if (a === 'del') remove(); else if (a === 'front') { order(e.id, 999); } else if (a === 'back') { order(e.id, -999); } else if (a === 'repl') { fileFor = e.id; $('be-file').click(); }
    });

    /* ---------- panneau gauche ---------- */
    let fileFor = null;
    ov.addEventListener('click', ev => {
      const b = ev.target.closest('[data-add]');
      if (b) { const k = b.dataset.add; if (k === 'image') { fileFor = 'new'; $('be-file').click(); } else add(k); return; }
      const lay = ev.target.closest('[data-l]'); if (lay && !ev.target.closest('button')) return select(lay.dataset.l);
      const up = ev.target.closest('[data-up]'); if (up) return order(up.dataset.up, 1);
      const dn = ev.target.closest('[data-dn]'); if (dn) return order(dn.dataset.dn, -1);
      const a = ev.target.closest('.be-top [data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'close') close(); else if (k === 'save') save(); else if (k === 'undo') { if (hi > 0) { hi--; restore(); } } else if (k === 'redo') { if (hi < hist.length - 1) { hi++; restore(); } } else if (k === 'zm') { z = Math.max(.3, z - .1); setZ(); box(); } else if (k === 'zp') { z = Math.min(2, z + .1); setZ(); box(); } else if (k === 'zf') { fit(); box(); }
    });
    ov.addEventListener('change', ev => {
      const i = ev.target;
      if (i.id === 'be-var' && i.value) { add('text', { text: '{{' + i.value + '}}', w: 220, h: 28 }); i.value = ''; }
      else if (i.id === 'be-stu') { ST.bStu = i.value; render(); }
      else if (i.id === 'be-file' && i.files[0]) {
        const f = i.files[0], target = fileFor; i.value = '';
        resizeFile(f, 600, url => { if (target === 'new') add('image', { src: url }); else { const e = get(target); if (e) { e.src = url; redraw(); commit(); } } });
      }
    });
    $('be-name').addEventListener('input', () => { t.name = $('be-name').value; });

    /* ---------- souris : sélection, déplacement, redimensionnement ---------- */
    const guide = (x, y) => { const gv = $('gv'), gh = $('gh'); gv.style.display = x == null ? 'none' : 'block'; if (x != null) gv.style.left = x + 'px'; gh.style.display = y == null ? 'none' : 'block'; if (y != null) gh.style.top = y + 'px'; };
    const snapAxis = (val, size, targets, alt) => {
      if (alt) return { v: val, g: null }; const th = 6 / z; let best = null;
      [[val, 0], [val + size / 2, size / 2], [val + size, size]].forEach(([p, off]) => targets.forEach(tg => { const d = Math.abs(p - tg); if (d < th && (!best || d < best.d)) best = { d, v: tg - off, g: tg }; }));
      return best || { v: val, g: null };
    };
    let drag = null;
    const pt = ev => { const r = sc.getBoundingClientRect(); return { x: (ev.clientX - r.left) / z, y: (ev.clientY - r.top) / z }; };
    host.addEventListener('pointerdown', ev => {
      const n = ev.target.closest('.fe');
      if (editing && n && n.dataset.id === editing) return;
      if (!n) { select(null); return; }
      ev.preventDefault(); const e = get(n.dataset.id); if (sel !== e.id) select(e.id); else if (editing) endEdit();
      drag = { mode: 'move', p: pt(ev), x: e.x, y: e.y, id: e.id, moved: false }; host.setPointerCapture(ev.pointerId);
    });
    selBox.addEventListener('pointerdown', ev => {
      const h = ev.target.dataset && ev.target.dataset.h; if (!h) return; ev.preventDefault(); ev.stopPropagation(); const e = get(sel), n = node(sel);
      drag = { mode: 'size', h, p: pt(ev), x: e.x, y: e.y, w: e.w, hh: e.type === 'table' ? n.offsetHeight : e.h, id: e.id, moved: false, ratio: e.w / Math.max(1, e.type === 'table' ? n.offsetHeight : e.h) }; selBox.setPointerCapture(ev.pointerId);
    });
    const move = ev => {
      if (!drag) return; const e = get(drag.id), n = node(drag.id); if (!e || !n) return; const c = pt(ev), dx = c.x - drag.p.x, dy = c.y - drag.p.y; drag.moved = true;
      if (drag.mode === 'move') {
        const h = e.type === 'table' ? n.offsetHeight : e.h, others = t.els.filter(o => o.id !== e.id), nodeH = o => { const nn = node(o.id); return o.type === 'table' && nn ? nn.offsetHeight : o.h; };
        const tx = [0, PW / 2, PW], ty = [0, PH / 2, PH]; others.forEach(o => { tx.push(o.x, o.x + o.w / 2, o.x + o.w); ty.push(o.y, o.y + nodeH(o) / 2, o.y + nodeH(o)); });
        let nx = drag.x + dx, ny = drag.y + dy; const sx = snapAxis(nx, e.w, tx, ev.altKey), sy = snapAxis(ny, h, ty, ev.altKey);
        e.x = Math.round(sx.v); e.y = Math.round(sy.v); guide(sx.g, sy.g);
        n.style.left = e.x + 'px'; n.style.top = e.y + 'px';
      } else {
        const hs = drag.h; let x = drag.x, y = drag.y, w = drag.w, h = drag.hh;
        if (hs.includes('e')) w = drag.w + dx; if (hs.includes('s')) h = drag.hh + dy; if (hs.includes('w')) { w = drag.w - dx; x = drag.x + dx; } if (hs.includes('n')) { h = drag.hh - dy; y = drag.y + dy; }
        if (ev.shiftKey && hs.length === 2 && e.type !== 'table') { h = w / drag.ratio; if (hs.includes('n')) y = drag.y + drag.hh - h; }
        if (w < 8) { if (hs.includes('w')) x = drag.x + drag.w - 8; w = 8; } if (h < 3) { if (hs.includes('n')) y = drag.y + drag.hh - 3; h = 3; }
        e.x = Math.round(x); e.y = Math.round(y); e.w = Math.round(w); if (e.type !== 'table') e.h = Math.round(h);
        n.style.left = e.x + 'px'; n.style.top = e.y + 'px'; n.style.width = e.w + 'px'; if (e.type !== 'table') n.style.height = e.h + 'px';
      }
      box(); syncPos();
    };
    const up = () => { if (!drag) return; const mv = drag.moved; drag = null; guide(null, null); if (mv) { redraw(); commit(); } };
    host.addEventListener('pointermove', move); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    selBox.addEventListener('pointermove', move); selBox.addEventListener('pointerup', up); selBox.addEventListener('pointercancel', up);

    /* ---------- édition du texte sur la page ---------- */
    const endEdit = () => {
      if (!editing) return; const id = editing, n = node(id), e = get(id); editing = null;
      if (n && e) { const tx = n.querySelector('.tx'); let v = tx.innerText.replace(/ /g, ' '); if (v.endsWith('\n')) v = v.slice(0, -1); e.text = v; }
      redraw(); panel(); commit();
    };
    host.addEventListener('dblclick', ev => {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY), n = hit && hit.closest && hit.closest('.fe'); if (!n || !host.contains(n)) return; const e = get(n.dataset.id); if (!e || e.type !== 'text') return;
      select(e.id); editing = e.id; const nn = node(e.id), tx = nn.querySelector('.tx'); nn.classList.add('ed');
      tx.textContent = e.text || ''; tx.contentEditable = 'true'; tx.focus();
      const rg = document.createRange(); rg.selectNodeContents(tx); const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
      tx.addEventListener('blur', () => { if (editing === e.id) endEdit(); }, { once: true });
    });

    /* ---------- clavier ---------- */
    const key = ev => {
      if (!document.body.contains(ov)) return document.removeEventListener('keydown', key, true);
      if (document.querySelector('.ov')) return; const tg = ev.target, typing = tg.matches && tg.matches('input,textarea,select,[contenteditable=true]');
      const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
      if (ctrl && k === 's') { ev.preventDefault(); return save(); }
      if (ctrl && k === 'z' && !typing) { ev.preventDefault(); if (ev.shiftKey) { if (hi < hist.length - 1) { hi++; restore(); } } else if (hi > 0) { hi--; restore(); } return; }
      if (ctrl && k === 'y' && !typing) { ev.preventDefault(); if (hi < hist.length - 1) { hi++; restore(); } return; }
      if (ev.key === 'Escape' && editing) { const tx = node(editing).querySelector('.tx'); tx.blur(); return; }
      if (typing || !sel) return;
      if (ctrl && k === 'd') { ev.preventDefault(); return dup(); }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return remove(); }
      const st = ev.shiftKey ? 10 : 1, e = get(sel); if (!e) return;
      const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[ev.key];
      if (m) { ev.preventDefault(); e.x += m[0]; e.y += m[1]; const n = node(sel); n.style.left = e.x + 'px'; n.style.top = e.y + 'px'; box(); syncPos(); later(); }
    };
    document.addEventListener('keydown', key, true);

    /* ---------- enregistrer / fermer ---------- */
    const save = () => {
      if (editing) endEdit();
      t.name = ($('be-name').value || '').trim() || 'Modèle sans nom';
      const out = { id: t.id, name: t.name, bg: t.bg || '#ffffff', els: clone(t.els) };
      if (JSON.stringify(out).length > 700000) return UI.toast('Modèle trop lourd (images trop grandes). Utilisez des images plus petites.', 'err');
      D.bulTpls = D.bulTpls || []; const i = D.bulTpls.findIndex(x => x.id === out.id); if (i >= 0) D.bulTpls[i] = out; else D.bulTpls.push(out);
      D.bulActive = out.id; ST.bTheme = 'tpl:' + out.id; A.save(); savedAt = state();
      UI.toast('Modèle « ' + out.name + ' » enregistré.', 'ok');
    };
    const dirty = () => { if (editing) return true; return state() !== (savedAt == null ? JSON.stringify({ bg: tpl.bg, els: tpl.els || [] }) : savedAt); };
    const shut = () => { clearTimeout(tmr); document.removeEventListener('keydown', key, true); ov.remove(); window.removeEventListener('resize', onRes); A.rerender(); };
    const close = () => { if (!dirty()) return shut(); UI.confirm('Fermer sans enregistrer ? Les modifications non enregistrées seront perdues.', shut, { title: 'Modifications non enregistrées' }); };
    const onRes = () => { fit(); box(); }; window.addEventListener('resize', onRes);

    left(); render(); panel(); requestAnimationFrame(() => { fit(); box(); });
  }

  /* ---------- exposé à l'application ---------- */
  A.bulEditor = { open };
  A.bulTplNew = (th, nSub) => DOC.starter(th, D.settings, nSub);
})();
