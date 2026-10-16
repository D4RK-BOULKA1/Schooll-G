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
.bl .off div{text-align:center;line-height:1.35}.bl .off i{display:block;font-style:normal;font-size:9.5px;margin-top:2px}
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
    const head = `<header class="bl-h">
      ${th.header === 'official' ? `<div class="off"><div>${esc(S.ministry || '')}<i>${esc(S.academy || '')}</i></div><div>République du Mali<i>Un Peuple – Un But – Une Foi</i></div></div>` : ''}
      <div class="bl-brand">${th.showLogo && S.logo ? `<img src="${S.logo}" alt="">` : ''}<div><h1>${esc(S.name)}</h1><p>${esc([S.address, S.city, S.phone].filter(Boolean).join(' · '))}${S.motto ? '<br>' + esc(S.motto) : ''}</p></div></div>
      <div class="bl-title"><h2>${esc(th.title || 'BULLETIN DE NOTES')}</h2><span>${esc(period)} · ${esc(S.year)}</span></div></header>`;
    const idb = `<section class="bl-id"><div><small>Nom et prénoms</small><b>${esc(st.last.toUpperCase() + ' ' + st.first)}</b></div><div><small>Matricule</small><b>${esc(st.matricule)}</b></div><div><small>Classe</small><b>${esc(cl ? cl.name : '')}</b></div><div><small>Né(e) le</small><b>${esc(fdate(st.birth))}${st.birthplace ? ' à ' + esc(st.birthplace) : ''}</b></div><div><small>Sexe</small><b>${st.sex === 'F' ? 'Féminin' : 'Masculin'}</b></div><div><small>Effectif</small><b>${R.count}</b></div></section>`;
    const cols = ['Matière']; if (th.showCoef) cols.push('Coef'); if (th.showDevCompo) { cols.push('Classe'); cols.push('Compo'); } cols.push('Moyenne'); if (th.showTotal) cols.push('Total'); if (th.showAppr) cols.push('Appréciation');
    const body = me ? me.rows.map(r => `<tr><td>${esc(r.sub.name)}</td>${th.showCoef ? `<td>${r.coef}</td>` : ''}${th.showDevCompo ? `<td>${r2(r.dev)}</td><td>${r2(r.comp)}</td>` : ''}<td class="m">${r2(r.avg)}</td>${th.showTotal ? `<td>${r2(r.total)}</td>` : ''}${th.showAppr ? `<td class="ap">${DOC.appr(r.avg)}</td>` : ''}</tr>`).join('') : '';
    const span = 1 + (th.showCoef ? 1 : 0) + (th.showDevCompo ? 2 : 0);
    const foot = me ? `<tfoot><tr><td colspan="${span}">TOTAL / MOYENNE GÉNÉRALE</td><td class="m">${r2(me.mean)}</td>${th.showTotal ? `<td>${r2(me.total)}</td>` : ''}${th.showAppr ? `<td class="ap">${DOC.appr(me.mean)}</td>` : ''}</tr></tfoot>` : '';
    const sum = `<section class="bl-sum"><div><small>Moyenne générale</small><b>${me && me.mean != null ? r2(me.mean) + ' / 20' : '—'}</b></div>${th.showRank ? `<div><small>Rang</small><b>${me && me.rank ? me.rank + (me.rank === 1 ? 'er' : 'e') + ' / ' + R.count : '—'}</b></div>` : ''}${th.showClassAvg ? `<div><small>Moyenne de la classe</small><b>${r2(R.classMean) || '—'}</b></div>` : ''}${th.showMinMax ? `<div><small>Plus forte / faible</small><b>${r2(R.max) || '—'} / ${r2(R.min) || '—'}</b></div>` : ''}</section>`;
    const ment = `<section class="bl-ment">${th.showAbs ? `<div><small>Assiduité</small>${abs} absence(s) · ${ret} retard(s)</div>` : ''}${th.showMention ? `<div><small>Mention du conseil</small><b>${DOC.mention(me && me.mean)}</b></div>` : ''}${th.showObs ? `<div><small>Observations</small>&nbsp;</div>` : ''}</section>`;
    const sign = th.showSign ? `<section class="bl-sign"><div>Le Parent / Tuteur</div><div>Le Directeur</div></section>` : '';
    return `<div class="bl ${th.font} ${bd} ${th.zebra ? 'zebra' : ''} h-${th.header === 'center' ? 'center' : 'left'}" style="--p:${th.p};--a:${th.a}">${head}${idb}<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" style="text-align:center;padding:18px">Aucune matière configurée pour cette classe.</td></tr>`}</tbody>${foot}</table>${sum}${ment}${sign}${th.footer ? `<div class="bl-foot">${esc(th.footer)}</div>` : ''}</div>`;
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
