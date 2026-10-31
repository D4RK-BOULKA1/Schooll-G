/* School-G : calculs de notes, bulletins et cartes scolaires (partagé directeur / parent) */
(function () {
  'use strict';
  const { esc, fdate, ic } = window.UI;
  const DOC = (window.DOC = {});
  const num = v => (v === '' || v == null || isNaN(v)) ? null : +v;
  const r2 = v => v == null ? '' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

  DOC.appr = m => m == null ? '' : m >= 16 ? 'Excellent' : m >= 14 ? 'Très bien' : m >= 12 ? 'Bien' : m >= 10 ? 'Assez bien' : m >= 8 ? 'Passable' : 'Insuffisant';
  DOC.mention = m => m == null ? '' : m >= 16 ? 'Tableau d\'honneur et félicitations' : m >= 14 ? 'Tableau d\'honneur' : m >= 12 ? 'Encouragements' : m >= 10 ? 'Passable' : 'Avertissement de travail';

  DOC.results = (D, classId, period) => {
    /* Espace parent : les résultats sont calculés à la publication, sans exposer les notes des autres élèves. */
    if (D._results) return D._results[period] || { list: [], subs: [], count: 0, classMean: null, max: null, min: null };
    const subs = D.subjects[classId] || [];
    const studs = D.students.filter(s => s.classId === classId && s.status !== 'radié').sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
    const w = +D.settings.compWeight || 1;
    const list = studs.map(s => {
      let tot = 0, cf = 0;
      const rows = subs.map(sub => {
        const n = D.notes[s.id + '|' + period + '|' + sub.id] || {};
        const dev = num(n.dev), comp = num(n.comp); let avg = null;
        if (dev != null && comp != null) avg = (dev + comp * w) / (1 + w); else if (dev != null) avg = dev; else if (comp != null) avg = comp;
        const coef = +sub.coef || 1;
        if (avg != null) { tot += avg * coef; cf += coef; }
        return { sub, dev, comp, avg, coef, total: avg != null ? avg * coef : null };
      });
      return { student: s, rows, total: tot, coef: cf, mean: cf ? tot / cf : null };
    });
    const ranked = list.filter(x => x.mean != null).sort((a, b) => b.mean - a.mean);
    ranked.forEach((x, i) => { x.rank = i > 0 && Math.abs(x.mean - ranked[i - 1].mean) < 1e-9 ? ranked[i - 1].rank : i + 1; });
    const means = ranked.map(x => x.mean);
    return { list, subs, count: studs.length, classMean: means.length ? means.reduce((a, b) => a + b, 0) / means.length : null, max: means.length ? Math.max(...means) : null, min: means.length ? Math.min(...means) : null };
  };

  DOC.THEMES = [
    { id: 'classic', name: 'Classique', p: '#14213D', a: '#E4572E', font: 'sans', header: 'left', border: 'thin', zebra: true },
    { id: 'officiel', name: 'Officiel', p: '#14213D', a: '#14213D', font: 'serif', header: 'official', border: 'double', zebra: false },
    { id: 'moderne', name: 'Moderne', p: '#E4572E', a: '#14213D', font: 'sans', header: 'left', border: 'none', zebra: true },
    { id: 'minimal', name: 'Minimal', p: '#222222', a: '#E4572E', font: 'sans', header: 'center', border: 'none', zebra: false, showTotal: false },
    { id: 'marine', name: 'Marine', p: '#14213D', a: '#E4572E', font: 'serif', header: 'center', border: 'thick', zebra: true }
  ].map(t => Object.assign({ showLogo: true, showCoef: true, showDevCompo: true, showTotal: true, showAppr: true, showRank: true, showClassAvg: true, showMinMax: true, showAbs: true, showMention: true, showObs: true, showSign: true, title: 'BULLETIN DE NOTES', footer: '' }, t));
  DOC.theme = (D, id) => { if (id === 'custom') return Object.assign({}, DOC.THEMES[0], { id: 'custom', name: 'Personnalisé' }, D.customTheme || {}); return DOC.THEMES.find(t => t.id === id) || DOC.THEMES[0]; };

  DOC.css = `
.bl{width:190mm;min-height:270mm;margin:0 auto;background:#fff;padding:9mm 10mm;font-size:12px;line-height:1.4;position:relative;color:var(--p)}
.bl.serif{font-family:'Fraunces',Georgia,serif}.bl.sans{font-family:'Public Sans',system-ui,sans-serif}
.bl.thin{border:1px solid var(--p)}.bl.double{border:4px double var(--p)}.bl.thick{border:3px solid var(--p);outline:1px solid var(--a);outline-offset:-8px}
.bl-h{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.bl .off{display:flex;justify-content:space-between;align-items:flex-start;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em}
.bl .off-lg{width:64px;height:64px;object-fit:contain;align-self:center}.bl .off div{text-align:center;line-height:1.35}.bl .off i{display:block;font-style:normal;font-size:9.5px;margin-top:2px}
.bl-brand{display:flex;align-items:center;gap:12px}
.bl.h-center .bl-brand{flex-direction:column;text-align:center}
.bl-brand img{width:60px;height:60px;object-fit:contain}
.bl-brand h1{font-size:20px;color:var(--p)}.bl-brand p{font-size:11px;opacity:.75}
.bl-title{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid var(--a);border-bottom:1px solid var(--p);padding:6px 0}
.bl.h-center .bl-title{justify-content:center;gap:14px}
.bl-title h2{font-size:16px;letter-spacing:.08em;color:var(--a)}.bl-title span{font-size:12px;font-weight:600}
.bl-id{display:grid;grid-template-columns:repeat(3,1fr);gap:5px 14px;margin-bottom:12px;font-size:12px}
.bl-id div{display:flex;flex-direction:column}.bl-id small{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.bl-id b{font-size:12.5px}
.bl table{width:100%;border-collapse:collapse;margin-bottom:10px}
.bl th{background:var(--p);color:#fff;padding:6px 7px;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;text-align:center;font-weight:600}
.bl th:first-child,.bl td:first-child{text-align:left}
.bl td{padding:5px 7px;border-bottom:1px solid rgba(0,0,0,.12);text-align:center}
.bl.zebra tbody tr:nth-child(even) td{background:rgba(0,0,0,.035)}
.bl td.m{font-weight:700;color:var(--a)}
.bl td.ap{text-align:left;font-size:11px}
.bl tfoot td{font-weight:700;border-top:2px solid var(--p);border-bottom:0}
.bl-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
.bl-sum div{border:1px solid var(--p);padding:6px 8px;text-align:center}
.bl-sum small{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;opacity:.7}
.bl-sum b{font-size:15px;color:var(--a)}
.bl-ment{display:flex;gap:10px;margin-bottom:10px}
.bl-ment div{flex:1;border:1px solid var(--p);padding:6px 9px;min-height:52px}
.bl-ment small{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-bottom:2px}
.bl-sign{display:flex;justify-content:space-between;margin-top:14px;font-size:11px}
.bl-sign div{width:42%;text-align:center;padding-top:4px;border-top:1px solid var(--p);margin-top:34px}
.bl-foot{position:absolute;left:10mm;right:10mm;bottom:6mm;text-align:center;font-size:10px;opacity:.65}
@media print{.bl{border-radius:0;page-break-after:always;margin:0 auto}.bl:last-child{page-break-after:auto}}
`;

  DOC.bulletin = (D, school, sid, period, th) => {
    const st = D.students.find(s => s.id === sid); if (!st) return '';
    const cl = D.classes.find(c => c.id === st.classId); const S = D.settings;
    const R = DOC.results(D, st.classId, period); const me = R.list.find(x => x.student.id === sid);
    let abs = 0, ret = 0; Object.values(D.attendance).forEach(day => { const a = day[sid]; if (a) { if (a.s === 'A') abs++; else if (a.s === 'R') ret++; } });
    const bd = th.border === 'none' ? '' : th.border;
    const ml = t => String(t).split('\n').filter(x => x.trim()).map((x, i) => i ? `<i>${esc(x)}</i>` : esc(x)).join('');
    const lgL = th.logoL || S.logo, lgR = th.header === 'official' && th.showLogo !== false ? th.logoR : '';
    const L = Object.assign({ sub: 'Matière', coef: 'Coef', cls: 'Classe', compo: 'Compo', avg: 'Moyenne', total: 'Total', appr: 'Appréciation' }, th.cols || {});
    const head = `<header class="bl-h">
      ${th.header === 'official' ? `<div class="off"><div>${th.offL ? ml(th.offL) : esc(S.ministry || '') + '<i>' + esc(S.academy || '') + '</i>'}</div>${lgR ? `<img class="off-lg" src="${lgR}" alt="">` : ''}<div>${th.offR ? ml(th.offR) : 'République du Mali<i>Un Peuple – Un But – Une Foi</i>'}</div></div>` : ''}
      <div class="bl-brand">${th.showLogo && lgL ? `<img src="${lgL}" alt="">` : ''}<div><h1>${esc(S.name)}</h1><p>${esc([S.address, S.city, S.phone].filter(Boolean).join(' · '))}${S.motto ? '<br>' + esc(S.motto) : ''}</p></div></div>
      <div class="bl-title"><h2>${esc(th.title || 'BULLETIN DE NOTES')}</h2><span>${esc(period)} · ${esc(S.year)}</span></div></header>`;
    const idb = `<section class="bl-id"><div><small>Nom et prénoms</small><b>${esc(st.last.toUpperCase() + ' ' + st.first)}</b></div><div><small>Matricule</small><b>${esc(st.matricule)}</b></div><div><small>Classe</small><b>${esc(cl ? cl.name : '')}</b></div><div><small>Né(e) le</small><b>${esc(fdate(st.birth))}${st.birthplace ? ' à ' + esc(st.birthplace) : ''}</b></div><div><small>Sexe</small><b>${st.sex === 'F' ? 'Féminin' : 'Masculin'}</b></div><div><small>Effectif</small><b>${R.count}</b></div></section>`;
    const cols = [L.sub]; if (th.showCoef) cols.push(L.coef); if (th.showDevCompo) { cols.push(L.cls); cols.push(L.compo); } cols.push(L.avg); if (th.showTotal) cols.push(L.total); if (th.showAppr) cols.push(L.appr);
    const body = me ? me.rows.map(r => `<tr><td>${esc(r.sub.name)}</td>${th.showCoef ? `<td>${r.coef}</td>` : ''}${th.showDevCompo ? `<td>${r2(r.dev)}</td><td>${r2(r.comp)}</td>` : ''}<td class="m">${r2(r.avg)}</td>${th.showTotal ? `<td>${r2(r.total)}</td>` : ''}${th.showAppr ? `<td class="ap">${DOC.appr(r.avg)}</td>` : ''}</tr>`).join('') : '';
    const span = 1 + (th.showCoef ? 1 : 0) + (th.showDevCompo ? 2 : 0);
    const foot = me ? `<tfoot><tr><td colspan="${span}">TOTAL / MOYENNE GÉNÉRALE</td><td class="m">${r2(me.mean)}</td>${th.showTotal ? `<td>${r2(me.total)}</td>` : ''}${th.showAppr ? `<td class="ap">${DOC.appr(me.mean)}</td>` : ''}</tr></tfoot>` : '';
    const sum = `<section class="bl-sum"><div><small>Moyenne générale</small><b>${me && me.mean != null ? r2(me.mean) + ' / 20' : '—'}</b></div>${th.showRank ? `<div><small>Rang</small><b>${me && me.rank ? me.rank + (me.rank === 1 ? 'er' : 'e') + ' / ' + R.count : '—'}</b></div>` : ''}${th.showClassAvg ? `<div><small>Moyenne de la classe</small><b>${r2(R.classMean) || '—'}</b></div>` : ''}${th.showMinMax ? `<div><small>Plus forte / faible</small><b>${r2(R.max) || '—'} / ${r2(R.min) || '—'}</b></div>` : ''}</section>`;
    const ment = `<section class="bl-ment">${th.showAbs ? `<div><small>Assiduité</small>${abs} absence(s) · ${ret} retard(s)</div>` : ''}${th.showMention ? `<div><small>Mention du conseil</small><b>${DOC.mention(me && me.mean)}</b></div>` : ''}${th.showObs ? `<div><small>Observations</small>&nbsp;</div>` : ''}</section>`;
    const sign = th.showSign ? `<section class="bl-sign"><div>${esc(th.sigL || 'Le Parent / Tuteur')}</div><div>${esc(th.sigR || 'Le Directeur')}</div></section>` : '';
    return `<div class="bl ${th.font} ${bd} ${th.zebra ? 'zebra' : ''} h-${th.header === 'center' ? 'center' : 'left'}" style="--p:${th.p};--a:${th.a}">${head}${idb}<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" style="text-align:center;padding:18px">Aucune matière configurée pour cette classe.</td></tr>`}</tbody>${foot}</table>${sum}${ment}${sign}${th.footer ? `<div class="bl-foot">${esc(th.footer)}</div>` : ''}</div>`;
  };


  /* ---------- bulletin libre : modèles créés avec l'éditeur (éléments positionnés sur une page A4) ---------- */
  DOC.PAGE = { w: 794, h: 1122 };
  DOC.FONTS = { pub: "'Public Sans',system-ui,sans-serif", fra: "'Fraunces',Georgia,serif", ari: 'Arial,Helvetica,sans-serif', tim: "'Times New Roman',Times,serif", geo: 'Georgia,serif', ver: 'Verdana,Geneva,sans-serif', tre: "'Trebuchet MS',sans-serif", cou: "'Courier New',monospace" };
  DOC.FONT_NAMES = { pub: 'Public Sans', fra: 'Fraunces', ari: 'Arial', tim: 'Times New Roman', geo: 'Georgia', ver: 'Verdana', tre: 'Trebuchet MS', cou: 'Courier New' };
  DOC.VARS = [['ecole', 'Nom de l\'école'], ['adresse', 'Adresse'], ['ville', 'Ville'], ['tel', 'Téléphone de l\'école'], ['annee', 'Année scolaire'], ['periode', 'Période'], ['ministere', 'Ministère'], ['academie', 'Académie / direction'], ['nom', 'Nom de l\'élève'], ['prenoms', 'Prénoms de l\'élève'], ['matricule', 'Matricule'], ['classe', 'Classe'], ['naissance', 'Date de naissance'], ['lieu', 'Lieu de naissance'], ['sexe', 'Sexe'], ['effectif', 'Effectif de la classe'], ['moyenne', 'Moyenne générale'], ['rang', 'Rang'], ['moyclasse', 'Moyenne de la classe'], ['max', 'Plus forte moyenne'], ['min', 'Plus faible moyenne'], ['mention', 'Mention du conseil'], ['appreciation', 'Appréciation générale'], ['absences', 'Nombre d\'absences'], ['retards', 'Nombre de retards'], ['date', 'Date du jour']];

  DOC.freeVars = (D, sid, period) => {
    const S = D.settings || {}, st = D.students.find(s => s.id === sid), V = { ecole: S.name, adresse: S.address, ville: S.city, tel: S.phone, annee: S.year, periode: period, ministere: S.ministry, academie: S.academy, date: fdate(new Date().toISOString().slice(0, 10)) };
    if (!st) return V;
    const cl = D.classes.find(c => c.id === st.classId), R = DOC.results(D, st.classId, period), me = R.list.find(x => x.student.id === sid);
    let abs = 0, ret = 0; Object.values(D.attendance || {}).forEach(day => { const a = day[sid]; if (a) { if (a.s === 'A') abs++; else if (a.s === 'R') ret++; } });
    return Object.assign(V, { nom: (st.last || '').toUpperCase(), prenoms: st.first, matricule: st.matricule, classe: cl ? cl.name : '', naissance: fdate(st.birth), lieu: st.birthplace || '', sexe: st.sex === 'F' ? 'Féminin' : 'Masculin', effectif: R.count, moyenne: me && me.mean != null ? r2(me.mean) : '—', rang: me && me.rank ? me.rank + (me.rank === 1 ? 'er' : 'e') : '—', moyclasse: r2(R.classMean) || '—', max: r2(R.max) || '—', min: r2(R.min) || '—', mention: me ? DOC.mention(me.mean) : '', appreciation: me ? DOC.appr(me.mean) : '', absences: abs, retards: ret });
  };

  DOC.freeCss = `
.fbw{width:794px;margin:0 auto}
.fb{position:relative;width:794px;height:1122px;overflow:hidden;box-sizing:border-box;background:#fff;color:#14213D;page-break-after:always}
.fbw:last-child .fb{page-break-after:auto}
.fb .fe{position:absolute;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column}
.fb .fe.ft{overflow:visible;display:block}
.fb .fe .tx{width:100%;white-space:pre-wrap;word-break:break-word}
.fb .fe img{width:100%;height:100%;display:block}
.fb .fe.ph{border:1.5px dashed #b9b2a0;color:#8a8473;align-items:center;justify-content:center;font:600 12px 'Public Sans',sans-serif;background:rgba(0,0,0,.03)}
.fb table{border-collapse:collapse;width:100%}
.fb th,.fb td{text-align:center}.fb th:first-child,.fb td:first-child{text-align:left}
@media print{.fbw{margin:0}}
`;

  DOC.freeEl = (e, V, ctx) => {
    const T = s => esc(String(s == null ? '' : s).replace(/\{\{(\w+)\}\}/g, (m, k) => V[k] == null ? '' : V[k]));
    let st = `left:${e.x}px;top:${e.y}px;width:${e.w}px;`;
    if (e.type !== 'table') st += `height:${e.h}px;`;
    if (e.op != null && e.op < 1) st += `opacity:${e.op};`;
    if (e.type !== 'table') {
      if (e.bg) st += `background:${e.bg};`;
      if (e.bw) st += `border:${e.bw}px ${e.bs || 'solid'} ${e.bc || '#14213D'};`;
      if (e.br) st += `border-radius:${e.br}px;`;
    }
    const idAttr = ` data-id="${e.id}"`;
    if (e.type === 'text') {
      const va = e.va === 'middle' ? 'center' : e.va === 'bottom' ? 'flex-end' : 'flex-start';
      const ts = `font-family:${DOC.FONTS[e.font] || DOC.FONTS.pub};font-size:${e.size || 14}px;color:${e.color || '#14213D'};text-align:${e.align || 'left'};line-height:${e.lh || 1.3};letter-spacing:${e.ls || 0}px;${e.b ? 'font-weight:700;' : ''}${e.i ? 'font-style:italic;' : ''}${e.u ? 'text-decoration:underline;' : ''}${e.up ? 'text-transform:uppercase;' : ''}padding:${e.pad == null ? 4 : e.pad}px;`;
      return `<div class="fe"${idAttr} style="${st}justify-content:${va}"><div class="tx" style="${ts}">${T(e.text)}</div></div>`;
    }
    if (e.type === 'image') {
      const S = ctx.S || {}, src = e.kind === 'logo' ? S.logo : e.kind === 'photo' ? ctx.photo : e.src;
      if (!src) return ctx.edit ? `<div class="fe ph"${idAttr} style="${st}">${e.kind === 'logo' ? 'Logo de l\'école' : e.kind === 'photo' ? 'Photo' : 'Image'}</div>` : '';
      return `<div class="fe"${idAttr} style="${st}"><img src="${src}" alt="" style="object-fit:${e.fit || 'contain'};border-radius:${e.br ? Math.max(0, e.br - (e.bw || 0)) : 0}px"></div>`;
    }
    if (e.type === 'rect') return `<div class="fe"${idAttr} style="${st}"></div>`;
    if (e.type === 'table') {
      const C = e.cols || {}, L = Object.assign({ sub: 'Matière', coef: 'Coef', cls: 'Classe', compo: 'Compo', avg: 'Moyenne', total: 'Total', appr: 'Appréciation' }, e.labels || {});
      const fs = e.size || 11.5, pad = e.pad == null ? 5 : e.pad, lc = e.lc || '#d9d9d9', col = e.color || '#14213D';
      const heads = [['sub', 1], ['coef', C.coef], ['cls', C.cls], ['compo', C.compo], ['avg', C.avg !== false], ['total', C.total], ['appr', C.appr]].filter(x => x[1]);
      let rows = ctx.rows && ctx.rows.length ? ctx.rows : (ctx.edit ? [1, 2, 3, 4, 5, 6].map(i => ({ sub: { name: 'Matière ' + i }, coef: 1, dev: null, comp: null, avg: null, total: null })) : []);
      const cell = (r, k) => k === 'sub' ? esc(r.sub.name) : k === 'coef' ? r.coef : k === 'cls' ? r2(r.dev) : k === 'compo' ? r2(r.comp) : k === 'avg' ? r2(r.avg) : k === 'total' ? r2(r.total) : DOC.appr(r.avg);
      const hs = `background:${e.headBg || '#14213D'};color:${e.headColor || '#fff'};padding:${pad + 1}px 6px;border:1px solid ${lc};font-weight:700;font-size:${fs - 1}px;text-transform:uppercase;letter-spacing:.04em`;
      const body = rows.map((r, i) => `<tr>${heads.map(([k]) => `<td style="padding:${pad}px 6px;border:1px solid ${lc};${i % 2 && e.zebra ? 'background:rgba(0,0,0,.04);' : ''}${k === 'avg' ? 'font-weight:700;' : ''}">${cell(r, k)}</td>`).join('')}</tr>`).join('');
      const span = heads.filter(h => ['sub', 'coef', 'cls', 'compo'].includes(h[0])).length;
      const foot = e.foot !== false && ctx.me ? `<tr>${heads.map(([k], i) => i === 0 ? `<td colspan="${span}" style="padding:${pad}px 6px;border:1px solid ${lc};font-weight:700">TOTAL / MOYENNE GÉNÉRALE</td>` : i < span ? '' : `<td style="padding:${pad}px 6px;border:1px solid ${lc};font-weight:700">${k === 'avg' ? r2(ctx.me.mean) : k === 'total' ? r2(ctx.me.total) : k === 'appr' ? DOC.appr(ctx.me.mean) : ''}</td>`).join('')}</tr>` : '';
      return `<div class="fe ft"${idAttr} style="${st}"><table style="font-family:${DOC.FONTS[e.font] || DOC.FONTS.pub};font-size:${fs}px;color:${col}"><thead><tr>${heads.map(([k]) => `<th style="${hs}">${esc(L[k])}</th>`).join('')}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
    }
    return '';
  };

  /* ctx.raw : la page seule (éditeur) ; ctx.edit : repères visibles pour les éléments vides */
  DOC.bulletinFree = (D, school, sid, period, tpl, ctx) => {
    ctx = Object.assign({}, ctx); ctx.S = D.settings || {};
    const st = D.students.find(s => s.id === sid), V = DOC.freeVars(D, sid, period);
    if (st) { ctx.photo = st.photo; const R = DOC.results(D, st.classId, period), me = R.list.find(x => x.student.id === sid); ctx.me = me; ctx.rows = me ? me.rows : []; }
    const page = `<div class="fb" style="background:${tpl.bg || '#fff'}">${(tpl.els || []).map(e => DOC.freeEl(e, V, ctx)).join('')}</div>`;
    return ctx.raw ? page : `<div class="fbw">${page}</div>`;
  };

  /* adapte la page A4 à la largeur disponible (aperçu à l'écran, téléphone des parents) */
  DOC.fitFree = root => {
    (root || document).querySelectorAll('.fbw').forEach(w => {
      const f = w.firstElementChild, host = w.parentElement; if (!f || !host) return;
      const k = Math.min(1, Math.max(.25, (host.clientWidth - 40) / DOC.PAGE.w));
      w.style.width = Math.round(DOC.PAGE.w * k) + 'px'; w.style.height = Math.round(DOC.PAGE.h * k) + 'px';
      f.style.transformOrigin = 'top left'; f.style.transform = k < 1 ? `scale(${k})` : '';
    });
  };

  DOC.bulletinAny = (D, school, sid, period, th, tpl) => tpl ? DOC.bulletinFree(D, school, sid, period, tpl) : DOC.bulletin(D, school, sid, period, th);
  DOC.cssAny = tpl => tpl ? DOC.freeCss + '@page{size:A4;margin:0}' : DOC.css;

  /* modèle de départ construit à partir d'un thème (standard, personnalisé ou importé d'une photo) */
  DOC.starter = (th, S, nSub) => {
    th = th || DOC.THEMES[0]; S = S || {}; nSub = Math.max(6, Math.min(16, nSub || 8));
    const id = () => 'e' + Math.random().toString(36).slice(2, 9), els = [], add = o => els.push(Object.assign({ id: id() }, o));
    const p = th.p || '#14213D', a = th.a || '#E4572E', f = th.font === 'serif' ? 'fra' : 'pub', off = th.header === 'official';
    const txt = (x, y, w, h, text, o) => add(Object.assign({ type: 'text', x, y, w, h, text, font: f, size: 12, color: p, align: 'left', va: 'top', lh: 1.3, ls: 0, pad: 2 }, o));
    const box = (x, y, w, h, o) => add(Object.assign({ type: 'rect', x, y, w, h, bg: '', bw: 1, bc: p, bs: 'solid', br: 0 }, o));
    if (th.border && th.border !== 'none') box(16, 16, 762, 1090, { bw: th.border === 'thin' ? 1 : th.border === 'thick' ? 3 : 4, bs: th.border === 'double' ? 'double' : 'solid' });
    let y;
    if (off) {
      txt(40, 30, 250, 76, th.offL || (S.ministry || '') + (S.academy ? '\n' + S.academy : ''), { size: 10, b: 1, up: 1, align: 'center' });
      txt(504, 30, 250, 76, th.offR || 'République du Mali\nUn Peuple – Un But – Une Foi', { size: 10, b: 1, up: 1, align: 'center' });
      if (th.logoR) add({ type: 'image', x: 357, y: 28, w: 80, h: 80, src: th.logoR, fit: 'contain' });
      if (th.showLogo !== false) add(th.logoL ? { type: 'image', x: 40, y: 118, w: 70, h: 70, src: th.logoL, fit: 'contain' } : { type: 'image', kind: 'logo', x: 40, y: 118, w: 70, h: 70, fit: 'contain' });
      txt(120, 122, 554, 34, '{{ecole}}', { size: 22, b: 1, align: 'center' });
      txt(120, 158, 554, 32, '{{adresse}} · {{tel}}', { size: 11, color: '#555', align: 'center' });
      y = 200;
    } else {
      if (th.showLogo !== false) add(th.logoL ? { type: 'image', x: 40, y: 32, w: 84, h: 84, src: th.logoL, fit: 'contain' } : { type: 'image', kind: 'logo', x: 40, y: 32, w: 84, h: 84, fit: 'contain' });
      txt(136, 40, 618, 34, '{{ecole}}', { size: 22, b: 1, align: th.header === 'center' ? 'center' : 'left' });
      txt(136, 76, 618, 40, '{{adresse}} · {{tel}}', { size: 11, color: '#555', align: th.header === 'center' ? 'center' : 'left' });
      y = 130;
    }
    box(40, y, 714, 2, { bg: a, bw: 0 });
    txt(40, y + 6, 450, 30, th.title || 'BULLETIN DE NOTES', { size: 18, b: 1, color: a, ls: 1.5, va: 'middle' });
    txt(494, y + 6, 260, 30, '{{periode}} · {{annee}}', { size: 12.5, b: 1, align: 'right', va: 'middle' });
    box(40, y + 40, 714, 1, { bg: p, bw: 0 });
    y += 54;
    [['Nom et prénoms', '{{nom}} {{prenoms}}'], ['Matricule', '{{matricule}}'], ['Classe', '{{classe}}'], ['Né(e) le', '{{naissance}} à {{lieu}}'], ['Sexe', '{{sexe}}'], ['Effectif', '{{effectif}}']].forEach(([l, v], i) => {
      const x = 40 + (i % 3) * 242, yy = y + Math.floor(i / 3) * 40;
      txt(x, yy, 230, 14, l, { size: 8.5, up: 1, color: '#777', ls: .6, pad: 0 }); txt(x, yy + 14, 230, 20, v, { size: 12.5, b: 1, pad: 0 });
    });
    y += 90;
    add({ type: 'table', x: 40, y, w: 714, cols: { coef: th.showCoef !== false, cls: th.showDevCompo !== false, compo: th.showDevCompo !== false, avg: true, total: th.showTotal !== false, appr: th.showAppr !== false }, labels: th.cols || {}, size: 11.5, headBg: p, headColor: '#fff', zebra: !!th.zebra, lc: '#d9d9d9', color: p, pad: 5, foot: true, font: f });
    y += 34 + nSub * 25 + 36;
    const sums = [['Moyenne générale', '{{moyenne}} / 20', 1], ['Rang', '{{rang}} / {{effectif}}', th.showRank !== false], ['Moyenne de la classe', '{{moyclasse}}', th.showClassAvg !== false], ['Plus forte / faible', '{{max}} / {{min}}', th.showMinMax !== false]].filter(s => s[2]);
    const sw = (714 - (sums.length - 1) * 12) / sums.length;
    sums.forEach(([l, v], i) => { const x = 40 + i * (sw + 12); box(x, y, sw, 50); txt(x, y + 4, sw, 14, l, { size: 8.5, up: 1, color: '#777', align: 'center', pad: 0 }); txt(x, y + 20, sw, 26, v, { size: 15, b: 1, color: a, align: 'center', pad: 0 }); });
    y += 64;
    const ments = [['Assiduité', '{{absences}} absence(s) · {{retards}} retard(s)', th.showAbs !== false], ['Mention du conseil', '{{mention}}', th.showMention !== false], ['Observations', '', th.showObs !== false]].filter(s => s[2]);
    if (ments.length) { const mw = (714 - (ments.length - 1) * 12) / ments.length; ments.forEach(([l, v], i) => { const x = 40 + i * (mw + 12); box(x, y, mw, 84); txt(x + 6, y + 4, mw - 12, 14, l, { size: 8.5, up: 1, color: '#777', pad: 0 }); if (v) txt(x + 6, y + 22, mw - 12, 56, v, { size: 12, b: 1, pad: 0 }); }); y += 100; }
    if (th.showSign !== false) { box(60, y + 70, 250, 1, { bg: p, bw: 0 }); box(484, y + 70, 250, 1, { bg: p, bw: 0 }); txt(60, y + 74, 250, 18, 'Le Parent / Tuteur', { size: 11, align: 'center' }); txt(484, y + 74, 250, 18, 'Le Directeur', { size: 11, align: 'center' }); }
    if (th.footer) txt(40, 1076, 714, 20, th.footer, { size: 10, color: '#777', align: 'center' });
    return { name: 'Nouveau modèle', bg: '#ffffff', els };
  };

  /* ---------- QR code (bibliothèque qrcode-generator chargée si disponible) ---------- */
  DOC.qr = text => {
    try {
      if (!window.qrcode) return '';
      const q = window.qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(); let p = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c} ${r}h1v1h-1z`;
      return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><path d="${p}" fill="#14213D"/></svg>`;
    } catch (e) { return ''; }
  };

  DOC.CARD_STYLES = [['marine', 'Marine'], ['orange', 'Orange'], ['blanc', 'Blanc sobre']];
  DOC.cardCss = `
.idc{width:324px;height:204px;border-radius:10px;overflow:hidden;position:relative;font-family:'Public Sans',system-ui,sans-serif;display:inline-block;vertical-align:top;margin:0 10px 10px 0;border:1px solid #D3CCBC;background:#fff;color:#14213D}
.idc .top{height:44px;display:flex;align-items:center;gap:9px;padding:0 12px;font-weight:700;font-size:11.5px;line-height:1.15;letter-spacing:.01em}
.idc .top img{width:30px;height:30px;object-fit:contain;background:#fff;border-radius:4px;padding:2px}
.idc .mid{display:flex;gap:11px;padding:10px 12px}
.idc .ph{width:72px;height:88px;border-radius:5px;background:#EFEBE2;overflow:hidden;flex:none;display:grid;place-items:center;color:#9aa;font-size:10px}
.idc .ph img{width:100%;height:100%;object-fit:cover}
.idc .inf{min-width:0;flex:1}.idc .inf small{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-top:5px}
.idc .inf b{display:block;font-size:12px;line-height:1.2}.idc .inf .nm{font-size:13.5px;font-family:'Fraunces',serif}
.idc .bot{position:absolute;left:0;right:0;bottom:0;height:24px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.idc .qr{position:absolute;right:10px;bottom:30px;width:50px;height:50px;background:#fff;padding:2px}
.idc .qr svg{width:100%;height:100%;display:block}
.idc.marine .top,.idc.marine .bot{background:#14213D;color:#fff}.idc.marine .bot{border-top:3px solid var(--ac,#E4572E)}
.idc.orange .top,.idc.orange .bot{background:var(--ac,#E4572E);color:#fff}
.idc.blanc{border:2px solid #14213D}.idc.blanc .top{color:#14213D;border-bottom:3px solid var(--ac,#E4572E)}.idc.blanc .bot{background:#14213D;color:#fff}
.idc.back{padding:12px 14px;font-size:10px;line-height:1.5}
.idc.back h5{font-family:'Fraunces',serif;font-size:13px;margin-bottom:6px}
.idc.back .qr{bottom:10px;right:12px;width:62px;height:62px}
.idc.back .sg{position:absolute;left:14px;bottom:12px;font-size:9px;opacity:.6;max-width:190px}
`;
  DOC.card = (D, school, s, style, accent) => {
    const S = D.settings; const cl = D.classes.find(c => c.id === s.classId);
    const ac = accent || S.accent || '#E4572E'; const code = 'SG|' + school.code + '|' + s.matricule;
    const qr = DOC.qr(code);
    const front = `<div class="idc ${style}" style="--ac:${ac}"><div class="top">${S.logo ? `<img src="${S.logo}" alt="">` : ''}<span>${esc(S.name)}</span></div>
      <div class="mid"><div class="ph">${s.photo ? `<img src="${s.photo}" alt="">` : 'PHOTO'}</div><div class="inf"><small>Nom</small><b class="nm">${esc(s.last.toUpperCase())}</b><small>Prénoms</small><b>${esc(s.first)}</b><small>Classe</small><b>${esc(cl ? cl.name : '')}</b><small>Matricule</small><b>${esc(s.matricule)}</b></div></div>
      ${qr ? `<div class="qr">${qr}</div>` : ''}<div class="bot"><span>Carte scolaire</span><span>${esc(S.year)}</span></div></div>`;
    const back = `<div class="idc back" style="--ac:${ac}"><h5>${esc(S.name)}</h5>${S.address ? esc(S.address) + '<br>' : ''}${S.phone ? 'Tél : ' + esc(S.phone) + '<br>' : ''}<b>En cas d'urgence :</b> ${esc(s.parent || '')} ${esc(s.parentPhone || '')}<br>Né(e) le ${esc(fdate(s.birth))}<div class="sg">Cette carte est strictement personnelle. En cas de perte, la signaler à l'administration de l'école.</div>${qr ? `<div class="qr">${qr}</div>` : ''}</div>`;
    return { front, back };
  };
})();
