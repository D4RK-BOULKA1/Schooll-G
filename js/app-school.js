/* School-G : notes, bulletins, cartes scolaires, avis aux parents */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc, fdate, ic, uid, today, badge } = U; const V = A.views, ACT = A.acts;
  const r2 = v => v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const firstCls = () => { const c = D.classes.find(c => D.students.some(s => s.classId === c.id)) || D.classes[0]; return c ? c.id : ''; };

  /* ================= NOTES ================= */
  V.grades = () => {
    ST.gTab = ST.gTab || 'in'; ST.gCls = ST.gCls || firstCls(); ST.gPer = ST.gPer || D.settings.periods[0];
    const subs = D.subjects[ST.gCls] || []; if (!subs.find(s => s.id === ST.gSub)) ST.gSub = subs[0] && subs[0].id;
    const tabs = `<div class="pills"><button class="${ST.gTab === 'in' ? 'on' : ''}" data-act="gtab" data-id="in">Saisie des notes</button><button class="${ST.gTab === 'out' ? 'on' : ''}" data-act="gtab" data-id="out">Résultats et classement</button></div>`;
    const tools = `<div class="tools">${tabs}${A.sel('gCls', A.classOpts(), ST.gCls, { re: true })}${A.sel('gPer', D.settings.periods.map(p => [p, p]), ST.gPer, { re: true })}${ST.gTab === 'in' ? A.sel('gSub', subs.map(s => [s.id, s.name + ' (coef ' + s.coef + ')']), ST.gSub, { re: true }) : A.btn('res-csv', 'Exporter CSV', { sm: true, icon: 'dl' })}</div>`;
    let body;
    if (!D.classes.length) body = A.empty('Aucune classe', 'Créez vos classes et leurs matières pour saisir des notes.', '<a class="btn btn-primary" href="#/classes">Créer les classes</a>');
    else if (!subs.length) body = A.empty('Aucune matière pour cette classe', 'Définissez les matières et leurs coefficients.', '<a class="btn btn-primary" href="#/classes">Configurer les matières</a>');
    else if (ST.gTab === 'in') {
      const studs = D.students.filter(s => s.classId === ST.gCls && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
      body = studs.length ? `<div class="card flat"><div class="tw"><table class="tbl"><thead><tr><th>Élève</th><th style="width:140px">Note de classe /20</th><th style="width:140px">Composition /20</th><th class="c">Moyenne</th></tr></thead><tbody>${studs.map(s => { const n = D.notes[s.id + '|' + ST.gPer + '|' + ST.gSub] || {}; const w = +D.settings.compWeight || 1; const m = n.dev !== '' && n.dev != null && n.comp !== '' && n.comp != null ? (n.dev + n.comp * w) / (1 + w) : (n.dev !== '' && n.dev != null ? n.dev : (n.comp !== '' && n.comp != null ? n.comp : null)); return `<tr><td><div class="who">${A.avatar(s)}<b>${esc(A.name(s))}</b></div></td><td><input type="number" min="0" max="20" step="0.25" data-nt="${s.id}" data-k="dev" value="${n.dev != null ? n.dev : ''}"></td><td><input type="number" min="0" max="20" step="0.25" data-nt="${s.id}" data-k="comp" value="${n.comp != null ? n.comp : ''}"></td><td class="c"><b id="m_${s.id}">${r2(m)}</b></td></tr>`; }).join('')}</tbody></table></div></div><p class="small muted" style="margin-top:10px">Enregistrement automatique à chaque saisie.</p>` : A.empty('Aucun élève dans cette classe', '');
    } else {
      const R = DOC.results(D, ST.gCls, ST.gPer); ST._res = R;
      body = R.list.length ? `<div class="kpis"><div class="kpi"><small>Moyenne de classe</small><b>${r2(R.classMean)}</b></div><div class="kpi g"><small>Meilleure moyenne</small><b>${r2(R.max)}</b></div><div class="kpi r"><small>Plus faible</small><b>${r2(R.min)}</b></div><div class="kpi o"><small>Effectif</small><b>${R.count}</b></div></div><div class="card flat"><div class="tw"><table class="tbl"><thead><tr><th class="c">Rang</th><th>Élève</th>${R.subs.map(s => `<th class="c">${esc(s.name.slice(0, 10))}</th>`).join('')}<th class="c">Moyenne</th><th>Mention</th></tr></thead><tbody>${R.list.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999)).map(x => `<tr><td class="c"><b>${x.rank || '—'}</b></td><td><a href="#/student/${x.student.id}"><b>${esc(A.name(x.student))}</b></a></td>${x.rows.map(r => `<td class="c">${r2(r.avg)}</td>`).join('')}<td class="c"><b style="color:var(--orange-d)">${r2(x.mean)}</b></td><td>${x.mean != null ? badge(esc(DOC.mention(x.mean)), x.mean >= 10 ? 'ok' : 'bad') : ''}</td></tr>`).join('')}</tbody></table></div></div>` : A.empty('Aucun élève', '');
    }
    A.view(A.head('Notes', 'Saisie par matière, moyennes pondérées et classement') + tools + body);
  };
  ACT.gtab = el => { ST.gTab = el.dataset.id; A.rerender(); };
  ACT['res-csv'] = () => { const R = ST._res; if (!R) return; U.csv('resultats.csv', [['Rang', 'Élève', ...R.subs.map(s => s.name), 'Moyenne'], ...R.list.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999)).map(x => [x.rank || '', A.name(x.student), ...x.rows.map(r => r2(r.avg)), r2(x.mean)])]); };
  document.addEventListener('input', e => {
    const t = e.target.closest && e.target.closest('[data-nt]'); if (!t) return;
    const key = t.dataset.nt + '|' + ST.gPer + '|' + ST.gSub; let v = t.value === '' ? '' : Math.max(0, Math.min(20, +t.value));
    D.notes[key] = D.notes[key] || { dev: '', comp: '' }; D.notes[key][t.dataset.k] = v; A.save();
    const n = D.notes[key], w = +D.settings.compWeight || 1, ok = x => x !== '' && x != null;
    const m = ok(n.dev) && ok(n.comp) ? (n.dev + n.comp * w) / (1 + w) : ok(n.dev) ? n.dev : ok(n.comp) ? n.comp : null;
    const el = document.getElementById('m_' + t.dataset.nt); if (el) el.textContent = r2(m);
  });

  /* ================= BULLETINS ================= */
  const CT_FIELDS = [
    ['title', 'Titre du document', 'text'], ['p', 'Couleur principale', 'color'], ['a', 'Couleur d\'accent', 'color'],
    ['font', 'Police', 'select', [['sans', 'Moderne (Public Sans)'], ['serif', 'Classique (Fraunces)']]],
    ['header', 'En-tête', 'select', [['left', 'Logo à gauche'], ['center', 'Centré'], ['official', 'Officiel (République du Mali)']]],
    ['border', 'Cadre', 'select', [['none', 'Sans cadre'], ['thin', 'Simple'], ['double', 'Double'], ['thick', 'Épais']]],
    ['footer', 'Pied de page', 'text']
  ];
  const CT_TOGGLES = [['zebra', 'Lignes alternées'], ['showLogo', 'Logo de l\'école'], ['showCoef', 'Colonne coefficient'], ['showDevCompo', 'Colonnes classe et composition'], ['showTotal', 'Colonne total'], ['showAppr', 'Appréciation par matière'], ['showRank', 'Rang'], ['showClassAvg', 'Moyenne de la classe'], ['showMinMax', 'Plus forte et plus faible moyenne'], ['showAbs', 'Absences et retards'], ['showMention', 'Mention du conseil'], ['showObs', 'Observations'], ['showSign', 'Signatures']];
  V.bulletins = () => {
    ST.bCls = ST.bCls || firstCls(); ST.bPer = ST.bPer || D.settings.periods[0]; ST.bTheme = ST.bTheme || 'classic';
    const studs = D.students.filter(s => s.classId === ST.bCls && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
    if (!studs.find(s => s.id === ST.bStu)) ST.bStu = studs[0] && studs[0].id;
    const themes = [...DOC.THEMES.map(t => [t.id, t.name]), ['custom', 'Personnalisé']];
    A.view(`${A.head('Bulletins', 'Cinq thèmes prêts à imprimer et un thème entièrement personnalisable', A.btn('bul-import', 'Importer un design (photo)', { icon: 'up' }) + A.btn('bul-print', 'Imprimer ce bulletin', { icon: 'print' }) + A.btn('bul-all', 'Imprimer toute la classe', { cls: 'btn-primary', icon: 'print' }))}
    <div class="tools">${A.sel('bCls', A.classOpts(), ST.bCls, { re: true })}${A.sel('bPer', D.settings.periods.map(p => [p, p]), ST.bPer, { re: true })}${A.sel('bStu', studs.map(s => [s.id, A.name(s)]), ST.bStu, { re: true })}</div>
    <div class="sw" style="margin-bottom:16px">${themes.map(([id, n]) => `<button class="${ST.bTheme === id ? 'on' : ''}" data-act="bth" data-id="${id}">${esc(n)}</button>`).join('')}</div>
    <div class="g21" style="align-items:start"><div class="bl-wrap" id="prev"></div><div class="card" id="cust" ${ST.bTheme === 'custom' ? '' : 'hidden'}><div class="ch"><h3>Thème personnalisé</h3>${A.btn('ct-base', 'Partir d\'un modèle', { sm: true })}</div><div class="cb"><div class="frm" id="ctf"></div></div></div></div>`);
    const th = () => DOC.theme(D, ST.bTheme);
    const draw = () => { document.getElementById('prev').innerHTML = `<style>${DOC.css}</style>` + (ST.bStu ? DOC.bulletin(D, A.school(), ST.bStu, ST.bPer, th()) : '<div class="empty">Sélectionnez une classe contenant des élèves.</div>'); };
    const cust = () => {
      const ct = DOC.theme(D, 'custom');
      document.getElementById('ctf').innerHTML = CT_FIELDS.map(([k, l, t, o]) => UI.fields([t === 'select' ? { name: k, label: l, type: 'select', options: o } : { name: k, label: l, type: t, cls: t === 'color' ? 'half' : '' }], ct)).join('') + `<div class="fld"><label>Rubriques à afficher</label>${CT_TOGGLES.map(([k, l]) => `<label class="chk" style="margin-bottom:7px"><input type="checkbox" name="${k}" ${ct[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
    };
    if (ST.bTheme === 'custom') cust();
    const save = () => { D.customTheme = UI.read(document.getElementById('ctf')); A.save(); draw(); };
    const cf = document.getElementById('ctf'); cf.addEventListener('input', save); cf.addEventListener('change', save);
    draw();
  };
  ACT.bth = el => { ST.bTheme = el.dataset.id; if (ST.bTheme === 'custom' && !D.customTheme) { D.customTheme = Object.assign({}, DOC.THEMES[0]); A.save(); } A.rerender(); };
  ACT['ct-base'] = () => UI.formModal({ title: 'Partir d\'un modèle', size: 'sm', submit: 'Appliquer', fields: [{ name: 'id', label: 'Modèle', type: 'select', options: DOC.THEMES.map(t => [t.id, t.name]) }], onSubmit: v => { D.customTheme = Object.assign({}, DOC.THEMES.find(t => t.id === v.id)); delete D.customTheme.id; delete D.customTheme.name; A.save(); A.rerender(); } });
  const printBul = ids => { const th = DOC.theme(D, ST.bTheme); U.print(ids.map(id => DOC.bulletin(D, A.school(), id, ST.bPer, th)).join(''), DOC.css); };
  ACT['bul-print'] = () => { if (!ST.bStu) return UI.toast('Aucun élève sélectionné.', 'err'); printBul([ST.bStu]); };
  ACT['bul-all'] = () => { const ids = D.students.filter(s => s.classId === ST.bCls && s.status !== 'radié').map(s => s.id); if (!ids.length) return UI.toast('Aucun élève dans cette classe.', 'err'); printBul(ids); };

  /* ================= CARTES SCOLAIRES ================= */
  V.cards = () => {
    ST.cardCls = ST.cardCls || firstCls(); ST.cardStyle = ST.cardStyle || 'marine';
    const studs = D.students.filter(s => s.classId === ST.cardCls && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
    if (!studs.find(s => s.id === ST.cardStu)) ST.cardStu = studs[0] && studs[0].id;
    A.view(`${A.head('Cartes scolaires', 'Le nom et le logo de votre école, la photo et le matricule de l\'élève', A.btn('card-print', 'Imprimer cette carte', { icon: 'print' }) + A.btn('card-all', 'Imprimer toute la classe', { cls: 'btn-primary', icon: 'print' }))}
    <div class="g21" style="align-items:start"><div class="card"><div class="ch"><h3>Aperçu</h3></div><div class="cb"><div class="tools">${A.sel('cardCls', A.classOpts(), ST.cardCls, { re: true })}${A.sel('cardStu', studs.map(s => [s.id, A.name(s)]), ST.cardStu, { re: true })}</div><div class="sw" style="margin-bottom:16px">${DOC.CARD_STYLES.map(([k, l]) => `<button class="${ST.cardStyle === k ? 'on' : ''}" data-act="cstyle" data-id="${k}">${l}</button>`).join('')}</div><div id="cprev" style="overflow:auto"></div></div></div>
    <div class="card"><div class="ch"><h3>Identité de l'école</h3></div><div class="cb"><form class="frm" id="cform">${UI.fields([{ name: 'name', label: 'Nom de l\'école', req: true }, { name: 'logo', label: 'Logo', type: 'img', max: 400 }, { name: 'accent', label: 'Couleur de la carte', type: 'color' }, { name: 'year', label: 'Année scolaire' }], { name: D.settings.name, logo: D.settings.logo, accent: D.settings.accent, year: D.settings.year })}</form><p class="small muted" style="margin-top:10px">Ces informations sont partagées avec les paramètres de l'école.</p></div></div></div>`);
    const draw = () => { const s = A.stu(ST.cardStu); const box = document.getElementById('cprev'); if (!s) { box.innerHTML = '<div class="empty">Aucun élève dans cette classe.</div>'; return; } const c = DOC.card(D, A.school(), s, ST.cardStyle); box.innerHTML = `<style>${DOC.cardCss}</style>${c.front}${c.back}`; };
    const f = document.getElementById('cform'); const sv = () => { const v = UI.read(f); Object.assign(D.settings, { name: v.name || D.settings.name, logo: v.logo, accent: v.accent, year: v.year }); A.save(); document.documentElement.style.setProperty('--orange', v.accent); draw(); };
    f.addEventListener('input', sv); f.addEventListener('imgchange', sv);
    draw();
  };
  ACT.cstyle = el => { ST.cardStyle = el.dataset.id; A.rerender(); };
  ACT['card-print'] = () => { const s = A.stu(ST.cardStu); if (!s) return UI.toast('Aucun élève sélectionné.', 'err'); const c = DOC.card(D, A.school(), s, ST.cardStyle); U.print(`<div style="padding:10mm">${c.front}${c.back}</div>`, DOC.cardCss); };
  ACT['card-all'] = () => { const l = D.students.filter(s => s.classId === ST.cardCls && s.status !== 'radié'); if (!l.length) return UI.toast('Aucun élève dans cette classe.', 'err'); U.print(`<div style="padding:4mm">${l.map(s => { const c = DOC.card(D, A.school(), s, ST.cardStyle); return `<div style="display:inline-block;page-break-inside:avoid">${c.front}</div>`; }).join('')}</div>`, DOC.cardCss); };

  /* ================= AVIS ================= */
  const nFields = () => [{ name: 'title', label: 'Titre', req: true }, { name: 'body', label: 'Message', type: 'textarea', rows: 6, req: true }, { name: 'target', label: 'Destinataires', type: 'select', options: [['all', 'Tous les parents'], ...A.classOpts()], cls: 'half' }, { name: 'priority', label: 'Importance', type: 'select', options: [['normal', 'Normal'], ['important', 'Important'], ['urgent', 'Urgent']], cls: 'half' }, { name: 'date', label: 'Date', type: 'date', cls: 'half' }];
  ACT['not-new'] = () => UI.formModal({ title: 'Nouvel avis aux parents', size: 'lg', submit: 'Publier', fields: nFields(), values: { date: today(), target: 'all', priority: 'normal' }, onSubmit: v => { D.notices.push(Object.assign(v, { id: uid() })); A.save(); UI.toast('Avis publié : visible dans l\'espace parent.', 'ok'); A.rerender(); } });
  ACT['not-edit'] = el => { const n = D.notices.find(x => x.id === el.dataset.id); UI.formModal({ title: 'Modifier l\'avis', size: 'lg', fields: nFields(), values: n, onSubmit: v => { Object.assign(n, v); A.save(); A.rerender(); } }); };
  ACT['not-del'] = el => UI.confirm('Supprimer cet avis ?', () => { D.notices = D.notices.filter(x => x.id !== el.dataset.id); A.save(); A.rerender(); }, { danger: true, yes: 'Supprimer' });
  V.notices = () => {
    const list = D.notices.slice().sort((a, b) => b.date.localeCompare(a.date));
    A.view(`${A.head('Avis aux parents', 'Les avis publiés apparaissent directement dans l\'espace parent', A.btn('not-new', 'Nouvel avis', { cls: 'btn-primary', icon: 'plus' }))}${list.length ? `<div class="stack">${list.map(n => `<div class="card"><div class="ch"><div><h3>${esc(n.title)}</h3><small class="muted">${fdate(n.date)} · ${n.target === 'all' ? 'Tous les parents' : esc((A.cls(n.target) || {}).name || 'Classe supprimée')}</small></div><div style="display:flex;gap:8px;align-items:center">${n.priority !== 'normal' ? badge(n.priority === 'urgent' ? 'Urgent' : 'Important', n.priority === 'urgent' ? 'bad' : 'warn') : ''}${A.iconBtn('not-edit', 'edit', n.id, 'Modifier')}${A.iconBtn('not-del', 'trash', n.id, 'Supprimer', true)}</div></div><div class="cb" style="white-space:pre-wrap">${esc(n.body)}</div></div>`).join('')}</div>` : `<div class="card"><div class="cb">${A.empty('Aucun avis', 'Publiez un premier avis : réunion de parents, rentrée, rappel de paiement.', A.btn('not-new', 'Nouvel avis', { cls: 'btn-primary' }))}</div></div>`}`);
  };
})();
