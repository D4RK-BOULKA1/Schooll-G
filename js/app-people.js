/* School-G : élèves, pointage, classes, professeurs, emplois du temps */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc, money, fdate, ic, uid, today, badge } = U; const V = A.views, ACT = A.acts;
  const SGg = window.SG;
  const rnd6 = () => A.pin();
  const cycles = ['Jardin', 'Primaire', 'Collège', 'Lycée'];

  /* ================= ÉLÈVES ================= */
  function stuFields(create) {
    const f = [
      { name: 'photo', label: 'Photo', type: 'img', max: 260 },
      { name: 'last', label: 'Nom', req: true, cls: 'half' }, { name: 'first', label: 'Prénoms', req: true, cls: 'half' },
      { name: 'sex', label: 'Sexe', type: 'select', options: [['M', 'Masculin'], ['F', 'Féminin']], cls: 'half' },
      { name: 'birth', label: 'Date de naissance', type: 'date', cls: 'half' },
      { name: 'birthplace', label: 'Lieu de naissance', cls: 'half' },
      { name: 'classId', label: 'Classe', type: 'select', options: A.classOpts(), req: true, cls: 'half' },
      { name: 'parent', label: 'Nom du parent / tuteur', cls: 'half' }, { name: 'parentPhone', label: 'Téléphone du parent', type: 'tel', cls: 'half' },
      { name: 'parentEmail', label: 'Email du parent', type: 'email', cls: 'half' }, { name: 'address', label: 'Adresse', cls: 'half' },
      { name: 'discount', label: 'Remise sur la scolarité (FCFA)', type: 'number', min: 0, def: 0, cls: 'half', hint: 'Déduite de la scolarité annuelle de la classe.' },
      { name: 'cantine', label: 'Inscrit à la cantine', type: 'checkbox', cls: 'half' }
    ];
    if (create) f.push({ name: 'inscPay', label: 'Encaisser les frais d\'inscription maintenant', type: 'checkbox' }, { name: 'inscFee', label: 'Frais d\'inscription (FCFA)', type: 'number', min: 0, cls: 'half' });
    else f.push({ name: 'status', label: 'Statut', type: 'select', options: [['inscrit', 'Inscrit'], ['radié', 'Radié']], cls: 'half' });
    return f;
  }
  function stuModal(s) {
    if (!D.classes.length) { UI.toast('Créez d\'abord au moins une classe.', 'err'); return A.go('#/classes'); }
    const create = !s; const vals = s || { classId: D.classes[0].id, discount: 0, sex: 'M', inscFee: (D.classes[0].inscription || 0) };
    UI.formModal({
      title: create ? 'Inscrire un élève' : 'Modifier l\'élève', size: 'lg', fields: stuFields(create), values: vals,
      onSubmit: v => {
        v.last = v.last.trim(); v.first = v.first.trim();
        if (create) {
          const st = Object.assign({}, v, { id: uid(), matricule: 'ELV-' + String(++D.counters.student).padStart(4, '0'), pin: rnd6(), status: 'inscrit', createdAt: today() });
          delete st.inscPay; delete st.inscFee; D.students.push(st);
          if (v.inscPay && +v.inscFee > 0) A.addPayment({ studentId: st.id, type: 'Inscription', amount: +v.inscFee });
          A.save(); UI.toast('Élève inscrit : ' + st.matricule, 'ok'); A.go('#/student/' + st.id);
        } else { Object.assign(s, v); A.save(); UI.toast('Fiche mise à jour.', 'ok'); A.rerender(); }
      }
    });
  }
  ACT['stu-new'] = () => stuModal(null);
  ACT['stu-edit'] = el => stuModal(A.stu(el.dataset.id));
  ACT['stu-del'] = el => { const s = A.stu(el.dataset.id); UI.confirm(`Supprimer définitivement <b>${esc(A.name(s))}</b> avec ses paiements, notes et pointages ? Pour conserver l'historique, utilisez plutôt le statut « Radié ».`, () => { D.students = D.students.filter(x => x.id !== s.id); D.payments = D.payments.filter(p => p.studentId !== s.id); Object.keys(D.notes).forEach(k => { if (k.startsWith(s.id + '|')) delete D.notes[k]; }); Object.values(D.attendance).forEach(d => delete d[s.id]); A.save(); UI.toast('Élève supprimé.'); A.go('#/students'); }, { danger: true, yes: 'Supprimer' }); };
  ACT['stu-pin'] = el => { const s = A.stu(el.dataset.id); s.pin = rnd6(); A.save(); UI.toast('Nouveau code parent généré.'); A.rerender(); };
  ACT.copy = el => { navigator.clipboard && navigator.clipboard.writeText(el.dataset.v); UI.toast('Copié.'); };

  V.students = () => {
    ST.sq = ST.sq || ''; ST.sc = ST.sc || ''; ST.sf = ST.sf || '';
    A.view(`${A.head('Élèves', 'Inscriptions et dossiers individuels', A.btn('stu-new', 'Inscrire un élève', { cls: 'btn-primary', icon: 'plus' }))}
      <div class="tools">${A.search('sq', 'Rechercher un nom, matricule ou téléphone')}${A.sel('sc', [['', 'Toutes les classes'], ...A.classOpts()], ST.sc)}${A.sel('sf', [['', 'Tous les états'], ['late', 'En retard de paiement'], ['paid', 'Scolarité soldée'], ['cantine', 'Cantine'], ['out', 'Radiés']], ST.sf)}</div>
      <div class="card flat"><div class="tw" id="list"></div></div>`);
    const draw = () => {
      const q = ST.sq.toLowerCase().trim();
      let l = D.students.filter(s => (ST.sf === 'out') === (s.status === 'radié'));
      if (ST.sc) l = l.filter(s => s.classId === ST.sc);
      if (q) l = l.filter(s => (A.name(s) + ' ' + s.matricule + ' ' + (s.parentPhone || '') + ' ' + (s.parent || '')).toLowerCase().includes(q));
      if (ST.sf === 'late') l = l.filter(s => A.late(s) > 0); if (ST.sf === 'paid') l = l.filter(s => A.tuition(s) && !A.balance(s)); if (ST.sf === 'cantine') l = l.filter(s => s.cantine);
      l.sort((a, b) => A.name(a).localeCompare(A.name(b)));
      document.getElementById('list').innerHTML = l.length ? `<table class="tbl"><thead><tr><th>Élève</th><th>Matricule</th><th>Classe</th><th>Parent</th><th>Scolarité</th><th>État</th><th></th></tr></thead><tbody>${l.map(s => { const T = A.tuition(s), pd = A.paidScol(s.id); return `<tr><td><a class="who" href="#/student/${s.id}">${A.avatar(s)}<span><b>${esc(A.name(s))}</b><small>${s.sex === 'F' ? 'Fille' : 'Garçon'}${s.cantine ? ' · cantine' : ''}</small></span></a></td><td><span class="code">${esc(s.matricule)}</span></td><td>${esc((A.cls(s.classId) || {}).name || '—')}</td><td>${esc(s.parent || '')}<br><small class="muted">${esc(s.parentPhone || '')}</small></td><td style="min-width:150px"><small>${money(pd)} / ${money(T)}</small>${A.bar(pd, T)}</td><td>${A.scolBadge(s)}</td><td class="r"><div class="acts"><a class="btn btn-ghost btn-sm" href="#/student/${s.id}">Fiche</a>${A.iconBtn('stu-edit', 'edit', s.id, 'Modifier')}</div></td></tr>`; }).join('')}</tbody></table><div style="padding:12px 16px" class="small muted">${l.length} élève(s)</div>` : A.empty('Aucun élève', D.students.length ? 'Aucun résultat pour ce filtre.' : 'Commencez par inscrire votre premier élève.', D.students.length ? '' : A.btn('stu-new', 'Inscrire un élève', { cls: 'btn-primary' }));
    };
    ST._r = draw; draw();
  };

  A.attStats = sid => { let P = 0, R = 0, Ab = 0; const hist = []; Object.keys(D.attendance).sort().forEach(d => { const a = D.attendance[d][sid]; if (!a) return; if (a.s === 'P') P++; else if (a.s === 'R') R++; else Ab++; hist.push([d, a]); }); return { P, R, A: Ab, hist }; };

  V.student = id => {
    const s = A.stu(id); if (!s) return A.view(A.empty('Élève introuvable', '', '<a class="btn btn-ghost" href="#/students">Retour</a>'));
    const cl = A.cls(s.classId) || {}, T = A.tuition(s), pd = A.paidScol(s.id), tr = A.tranches(s), as = A.attStats(s.id), todayAtt = (D.attendance[today()] || {})[s.id];
    const pays = D.payments.filter(p => p.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
    let lastB = null; D.settings.periods.forEach(per => { const R = DOC.results(D, s.classId, per); const me = R.list.find(x => x.student.id === s.id); if (me && me.mean != null) lastB = { per, me, count: R.count }; });
    const sch = A.school();
    const moves = D.moves.filter(m => m.studentId === s.id);
    A.view(`<a href="#/students" class="small muted" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:12px">${ic('arrow', 14)}Retour aux élèves</a>
    <div class="card" style="margin-bottom:20px"><div class="cb"><div class="profile"><div class="big">${s.photo ? `<img src="${s.photo}" alt="">` : esc(A.initials(s))}</div><div style="flex:1;min-width:220px"><h1 style="font-size:27px">${esc(A.name(s))}</h1><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${badge(esc(cl.name || 'Sans classe'), 'info')}<span class="code">${esc(s.matricule)}</span>${s.status === 'radié' ? badge('Radié', 'bad') : badge('Inscrit', 'ok')}${A.scolBadge(s)}${s.cantine ? badge('Cantine', 'or') : ''}${todayAtt ? badge(todayAtt.s === 'P' ? 'Présent aujourd\'hui' : todayAtt.s === 'R' ? 'En retard aujourd\'hui' + (todayAtt.t ? ' (' + esc(todayAtt.t) + ')' : '') : 'Absent aujourd\'hui', todayAtt.s === 'P' ? 'ok' : todayAtt.s === 'R' ? 'warn' : 'bad') : ''}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${A.btn('pay-new', 'Paiement', { cls: 'btn-primary', icon: 'card', id: s.id })}${A.btn('stu-card', 'Carte', { icon: 'id', id: s.id })}${A.btn('stu-bul', 'Bulletin', { icon: 'award', id: s.id })}${s.parentPhone ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${A.waParent(s, 'Bonjour, message de l\'école ' + D.settings.name + ' concernant ' + s.first + ' ' + s.last + '.')}">WhatsApp</a>` : ''}${A.iconBtn('stu-edit', 'edit', s.id, 'Modifier')}${A.iconBtn('stu-del', 'trash', s.id, 'Supprimer', true)}</div></div></div></div>
    <div class="g3" style="margin-bottom:20px">
      <div class="card"><div class="ch"><h3>Identité</h3></div><div class="cb"><dl class="kv"><dt>Sexe</dt><dd>${s.sex === 'F' ? 'Féminin' : 'Masculin'}</dd><dt>Naissance</dt><dd>${esc(fdate(s.birth)) || '—'}${s.birthplace ? ' à ' + esc(s.birthplace) : ''}</dd><dt>Adresse</dt><dd>${esc(s.address || '—')}</dd><dt>Inscrit le</dt><dd>${esc(fdate(s.createdAt))}</dd></dl></div></div>
      <div class="card"><div class="ch"><h3>Parent et accès</h3></div><div class="cb"><dl class="kv"><dt>Parent</dt><dd>${esc(s.parent || '—')}</dd><dt>Téléphone</dt><dd>${esc(s.parentPhone || '—')}</dd><dt>Email</dt><dd>${esc(s.parentEmail || '—')}</dd><dt>Code école</dt><dd><span class="code">${esc(sch.code)}</span></dd><dt>Code parent</dt><dd><span class="code">${esc(s.pin)}</span> <button class="btn btn-ghost btn-sm" data-act="stu-pin" data-id="${s.id}" title="Régénérer">${ic('refresh', 14)}</button></dd></dl><p class="small muted" style="margin-top:10px">Le parent se connecte sur l'espace parent avec le code école, le matricule et ce code. Les modifications se publient vers l'espace parent quelques secondes après l'enregistrement.</p></div></div>
      <div class="card"><div class="ch"><h3>Scolarité</h3></div><div class="cb"><dl class="kv"><dt>Annuelle</dt><dd>${money(T)}${s.discount ? ' <small class="muted">(remise ' + money(s.discount) + ')</small>' : ''}</dd><dt>Payé</dt><dd style="color:var(--green)">${money(pd)}</dd><dt>Reste</dt><dd style="color:${A.balance(s) ? 'var(--red)' : 'var(--green)'}">${money(A.balance(s))}</dd></dl>${A.bar(pd, T)}</div></div>
    </div>
    <div class="card" style="margin-bottom:20px"><div class="ch"><h3>Tranches de scolarité</h3></div><div class="tw"><table class="tbl"><thead><tr><th>Tranche</th><th>Échéance</th><th class="r">Montant</th><th class="r">Payé</th><th class="r">Reste</th><th>État</th></tr></thead><tbody>${tr.map(t => `<tr><td>${esc(t.label)}</td><td>${fdate(t.due)}</td><td class="r">${money(t.amount)}</td><td class="r">${money(t.paid)}</td><td class="r">${money(t.rest)}</td><td>${badge(t.status, { 'payée': 'ok', 'partielle': 'warn', 'en retard': 'bad', 'à venir': '' }[t.status])}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="g2" style="margin-bottom:20px">
      <div class="card"><div class="ch"><h3>Historique des paiements</h3></div><div class="tw">${pays.length ? `<table class="tbl"><tbody>${pays.map(p => `<tr><td>${fdate(p.date)}<br><small class="muted">${esc(p.ref)}</small></td><td>${esc(p.type)}${p.month ? '<br><small class="muted">' + U.monthLabel(p.month) + '</small>' : ''}</td><td class="r"><b>${money(p.amount)}</b><br>${p.status === 'validé' ? '' : badge(p.status, 'bad')}</td><td class="r">${A.iconBtn('pay-rcp', 'print', p.id, 'Reçu')}</td></tr>`).join('')}</tbody></table>` : A.empty('Aucun paiement', '')}</div></div>
      <div class="card"><div class="ch"><h3>Assiduité</h3><a class="btn btn-ghost btn-sm" href="#/attendance">Pointer</a></div><div class="cb"><div class="g3" style="gap:10px;margin-bottom:12px"><div class="kpi g" style="padding:12px"><small>Présences</small><b style="font-size:22px">${as.P}</b></div><div class="kpi o" style="padding:12px;border-top-color:var(--amber)"><small>Retards</small><b style="font-size:22px">${as.R}</b></div><div class="kpi r" style="padding:12px"><small>Absences</small><b style="font-size:22px">${as.A}</b></div></div>${as.hist.slice(-6).reverse().map(([d, a]) => `<div class="row"><span>${fdate(d)}</span><span>${badge(a.s === 'P' ? 'Présent' : a.s === 'R' ? 'Retard' + (a.t ? ' ' + esc(a.t) : '') : 'Absent', a.s === 'P' ? 'ok' : a.s === 'R' ? 'warn' : 'bad')}</span></div>`).join('') || '<p class="muted small">Aucun pointage enregistré.</p>'}</div></div>
    </div>
    <div class="g2"><div class="card"><div class="ch"><h3>Dernier bulletin</h3>${lastB ? A.btn('stu-bul', 'Ouvrir', { sm: true, id: s.id }) : ''}</div><div class="cb">${lastB ? `<div class="row"><span>Période</span><b>${esc(lastB.per)}</b></div><div class="row"><span>Moyenne générale</span><b>${(Math.round(lastB.me.mean * 100) / 100).toFixed(2)} / 20</b></div><div class="row"><span>Rang</span><b>${lastB.me.rank} / ${lastB.count}</b></div><div class="row"><span>Mention</span><b>${esc(DOC.mention(lastB.me.mean))}</b></div>` : A.empty('Aucune note saisie', 'Le bulletin apparaîtra dès que des notes seront enregistrées.')}</div></div>
    <div class="card"><div class="ch"><h3>Tenues et fournitures remises</h3></div><div class="cb">${moves.map(m => { const it = D.stock.find(i => i.id === m.itemId); return `<div class="row"><span>${esc(it ? it.name : 'Article')} × ${m.qty}</span><span class="muted small">${fdate(m.date)}</span></div>`; }).join('') || '<p class="muted small">Aucune sortie de stock pour cet élève.</p>'}</div></div></div>`);
  };
  ACT['stu-card'] = el => { ST.cardStu = el.dataset.id; ST.cardCls = (A.stu(el.dataset.id) || {}).classId; A.go('#/cards'); };
  ACT['stu-bul'] = el => { const s = A.stu(el.dataset.id); ST.bCls = s.classId; ST.bStu = s.id; A.go('#/bulletins'); };

  /* ================= POINTAGE ================= */
  V.attendance = () => {
    ST.aDate = ST.aDate || today(); ST.aMode = ST.aMode || 'students'; ST.aTab = ST.aTab || 'day';
    ST.aCls = ST.aCls || ((D.classes.find(c => D.students.some(s => s.classId === c.id)) || D.classes[0] || {}).id) || ''; ST.aMonth = ST.aMonth || today().slice(0, 7);
    const tabs = `<div class="pills" style="margin-bottom:16px"><button class="${ST.aTab === 'day' ? 'on' : ''}" data-act="atab" data-id="day">Pointage du jour</button><button class="${ST.aTab === 'rep' ? 'on' : ''}" data-act="atab" data-id="rep">Rapport mensuel</button></div>`;
    const isT = ST.aMode === 'teachers';
    const mode = `<div class="pills"><button class="${!isT ? 'on' : ''}" data-act="amode" data-id="students">Élèves</button><button class="${isT ? 'on' : ''}" data-act="amode" data-id="teachers">Professeurs</button></div>`;
    A.view(`${A.head('Pointage', 'Présent, en retard ou absent, avec l\'heure d\'arrivée')}${tabs}<div class="tools">${ST.aTab === 'day' ? `<input type="date" data-f="aDate" data-re="1" value="${ST.aDate}">` : `<input type="month" data-f="aMonth" data-re="1" value="${ST.aMonth}">`}${mode}${!isT ? A.sel('aCls', A.classOpts(), ST.aCls, { re: true }) : ''}${ST.aTab === 'day' ? A.btn('att-all', 'Tout le monde présent', { sm: true, icon: 'check' }) : A.btn('att-csv', 'Exporter CSV', { sm: true, icon: 'dl' })}</div><div class="card flat"><div class="tw" id="list"></div></div>`);
    const persons = () => isT ? D.teachers.slice() : D.students.filter(s => s.classId === ST.aCls && s.status !== 'radié').sort((a, b) => A.name(a).localeCompare(A.name(b)));
    const pname = p => isT ? p.name : A.name(p);
    const draw = () => {
      const list = persons(); const box = document.getElementById('list');
      if (!list.length) { box.innerHTML = A.empty(isT ? 'Aucun professeur' : 'Aucun élève dans cette classe', ''); return; }
      if (ST.aTab === 'day') {
        const day = D.attendance[ST.aDate] || {};
        const c = { P: 0, R: 0, A: 0 }; list.forEach(p => { const a = day[p.id]; if (a) c[a.s]++; });
        box.innerHTML = `<div style="padding:12px 16px;display:flex;gap:14px;flex-wrap:wrap" class="small">${badge('Présents ' + c.P, 'ok')}${badge('Retards ' + c.R, 'warn')}${badge('Absents ' + c.A, 'bad')}${badge('Non pointés ' + (list.length - c.P - c.R - c.A), '')}</div><table class="tbl"><tbody>${list.map(p => { const a = day[p.id] || {}; return `<tr><td><div class="who">${isT ? `<div class="av2">${esc(p.name[0])}</div>` : A.avatar(p)}<span><b>${esc(pname(p))}</b></span></div></td><td><div class="att">${[['P', 'Présent'], ['R', 'Retard'], ['A', 'Absent']].map(([k, l]) => `<button class="${a.s === k ? 'on ' + k : ''}" data-act="att" data-id="${p.id}" data-v="${k}">${l}</button>`).join('')}</div></td><td style="width:130px">${a.s === 'R' ? `<input type="time" data-attt="${p.id}" value="${esc(a.t || '')}">` : ''}</td></tr>`; }).join('')}</tbody></table>`;
      } else {
        const rows = list.map(p => { let P = 0, R = 0, Ab = 0; Object.keys(D.attendance).filter(d => d.startsWith(ST.aMonth)).forEach(d => { const a = D.attendance[d][p.id]; if (!a) return; if (a.s === 'P') P++; else if (a.s === 'R') R++; else Ab++; }); const tot = P + R + Ab; return { p, P, R, Ab, tot, rate: tot ? Math.round((P + R) / tot * 100) : null }; });
        ST._rep = rows;
        box.innerHTML = `<table class="tbl"><thead><tr><th>${isT ? 'Professeur' : 'Élève'}</th><th class="c">Présences</th><th class="c">Retards</th><th class="c">Absences</th><th class="c">Assiduité</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(pname(r.p))}</b></td><td class="c">${r.P}</td><td class="c">${r.R}</td><td class="c">${r.Ab}</td><td class="c">${r.rate == null ? '—' : badge(r.rate + ' %', r.rate >= 90 ? 'ok' : r.rate >= 75 ? 'warn' : 'bad')}</td></tr>`).join('')}</tbody></table>`;
      }
    };
    ST._r = draw; ST._draw = draw; ST._persons = persons; draw();
  };
  ACT.atab = el => { ST.aTab = el.dataset.id; A.rerender(); };
  ACT.amode = el => { ST.aMode = el.dataset.id; A.rerender(); };
  ACT.att = el => { const d = ST.aDate; D.attendance[d] = D.attendance[d] || {}; const cur = D.attendance[d][el.dataset.id]; const v = el.dataset.v; D.attendance[d][el.dataset.id] = { s: v, t: v === 'R' ? ((cur && cur.t) || new Date().toTimeString().slice(0, 5)) : '' }; A.save(); ST._draw(); };
  ACT['att-all'] = () => { const d = ST.aDate; D.attendance[d] = D.attendance[d] || {}; ST._persons().forEach(p => { if (!D.attendance[d][p.id]) D.attendance[d][p.id] = { s: 'P', t: '' }; }); A.save(); ST._draw(); UI.toast('Non pointés marqués présents.', 'ok'); };
  ACT['att-csv'] = () => U.csv('presences-' + ST.aMonth + '.csv', [['Nom', 'Présences', 'Retards', 'Absences'], ...(ST._rep || []).map(r => [ST.aMode === 'teachers' ? r.p.name : A.name(r.p), r.P, r.R, r.Ab])]);
  document.addEventListener('change', e => { const t = e.target.closest && e.target.closest('[data-attt]'); if (t) { const a = (D.attendance[ST.aDate] || {})[t.dataset.attt]; if (a) { a.t = t.value; A.save(); } } });

  /* ================= CLASSES ================= */
  const PRESET = {
    Jardin: [['Langage', 3], ['Graphisme', 2], ['Éveil', 2], ['Initiation aux mathématiques', 2], ['Éducation artistique', 1], ['Éducation physique', 1]],
    Primaire: [['Français', 3], ['Mathématiques', 3], ['Sciences d\'observation', 2], ['Histoire-Géographie', 2], ['Éducation civique et morale', 1], ['Dessin', 1], ['Éducation physique', 1]],
    'Collège': [['Français', 3], ['Mathématiques', 3], ['Anglais', 2], ['Histoire-Géographie', 2], ['SVT', 2], ['Physique-Chimie', 2], ['Éducation civique et morale', 1], ['Informatique', 1], ['Éducation physique', 1]],
    'Lycée': [['Français', 3], ['Mathématiques', 4], ['Physique-Chimie', 3], ['SVT', 3], ['Histoire-Géographie', 2], ['Philosophie', 2], ['Anglais', 2], ['Informatique', 1], ['Éducation physique', 1]]
  };
  const STD = [['Jardin – Petite section', 'Jardin'], ['Jardin – Moyenne section', 'Jardin'], ['Jardin – Grande section', 'Jardin'], ['1ère année', 'Primaire'], ['2ème année', 'Primaire'], ['3ème année', 'Primaire'], ['4ème année', 'Primaire'], ['5ème année', 'Primaire'], ['6ème année', 'Primaire'], ['7ème année', 'Collège'], ['8ème année', 'Collège'], ['9ème année', 'Collège'], ['10ème année', 'Lycée'], ['11ème année', 'Lycée'], ['Terminale', 'Lycée']];
  const clsFields = () => [{ name: 'name', label: 'Nom de la classe', req: true, cls: 'half' }, { name: 'cycle', label: 'Cycle', type: 'select', options: cycles, cls: 'half' }, { name: 'tuition', label: 'Scolarité annuelle (FCFA)', type: 'number', min: 0, cls: 'half' }, { name: 'inscription', label: 'Frais d\'inscription (FCFA)', type: 'number', min: 0, cls: 'half' }, { name: 'capacity', label: 'Capacité', type: 'number', min: 0, cls: 'half' }, { name: 'teacherId', label: 'Titulaire', type: 'select', options: [['', 'Non défini'], ...D.teachers.map(t => [t.id, t.name])], cls: 'half' }];
  ACT['cls-new'] = () => UI.formModal({ title: 'Nouvelle classe', fields: clsFields(), values: { cycle: 'Primaire', tuition: 0, inscription: 0, capacity: 40 }, onSubmit: v => { D.classes.push(Object.assign(v, { id: uid() })); A.save(); A.rerender(); } });
  ACT['cls-edit'] = el => { const c = A.cls(el.dataset.id); UI.formModal({ title: 'Modifier la classe', fields: clsFields(), values: c, onSubmit: v => { Object.assign(c, v); A.save(); A.rerender(); } }); };
  ACT['cls-del'] = el => { const c = A.cls(el.dataset.id); if (D.students.some(s => s.classId === c.id)) return UI.toast('Cette classe contient des élèves : déplacez-les d\'abord.', 'err'); UI.confirm('Supprimer la classe <b>' + esc(c.name) + '</b> ?', () => { D.classes = D.classes.filter(x => x.id !== c.id); delete D.subjects[c.id]; delete D.timetable[c.id]; A.save(); A.rerender(); }, { danger: true, yes: 'Supprimer' }); };
  ACT['cls-gen'] = () => UI.formModal({
    title: 'Générer les classes standard', submit: 'Créer les classes',
    extra: '<p class="small muted" style="flex:1 1 100%">Crée les 15 classes, du Jardin à la Terminale, avec leurs matières et coefficients usuels. Vous pourrez tout modifier ensuite.</p>',
    fields: [{ name: 'tJ', label: 'Scolarité Jardin (FCFA)', type: 'number', min: 0, cls: 'half', def: 0 }, { name: 'tP', label: 'Scolarité Primaire (FCFA)', type: 'number', min: 0, cls: 'half', def: 0 }, { name: 'tC', label: 'Scolarité Collège (FCFA)', type: 'number', min: 0, cls: 'half', def: 0 }, { name: 'tL', label: 'Scolarité Lycée (FCFA)', type: 'number', min: 0, cls: 'half', def: 0 }, { name: 'ins', label: 'Frais d\'inscription (FCFA)', type: 'number', min: 0, def: 0 }],
    onSubmit: v => { const map = { Jardin: v.tJ, Primaire: v.tP, 'Collège': v.tC, 'Lycée': v.tL }; STD.forEach(([n, cy]) => { if (D.classes.some(c => c.name === n)) return; const id = uid(); D.classes.push({ id, name: n, cycle: cy, tuition: +map[cy] || 0, inscription: +v.ins || 0, capacity: 40, teacherId: '' }); D.subjects[id] = PRESET[cy].map(([name, coef]) => ({ id: uid(), name, coef })); }); A.save(); UI.toast('Classes créées.', 'ok'); A.rerender(); }
  });
  ACT['cls-sub'] = el => {
    const c = A.cls(el.dataset.id); let subs = (D.subjects[c.id] || []).map(x => ({ ...x }));
    const rows = () => subs.map((s, i) => `<div style="display:flex;gap:8px;margin-bottom:8px"><input type="text" data-i="${i}" data-k="name" value="${esc(s.name)}" placeholder="Matière" style="flex:1"><input type="number" data-i="${i}" data-k="coef" value="${s.coef}" min="1" step="1" style="width:80px" title="Coefficient"><button class="btn btn-ghost btn-sm btn-icon" data-rm="${i}" type="button">${ic('x', 16)}</button></div>`).join('') || '<p class="muted small">Aucune matière.</p>';
    const m = UI.modal({
      title: 'Matières : ' + esc(c.name), body: `<div id="subs">${rows()}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-ghost btn-sm" data-add type="button">${ic('plus', 14)}Ajouter</button><button class="btn btn-ghost btn-sm" data-pre type="button">Charger les matières du cycle ${esc(c.cycle)}</button></div><p class="small muted" style="margin-top:10px">Le coefficient pondère la matière dans la moyenne générale.</p>`,
      actions: [{ label: 'Annuler' }, { label: 'Enregistrer', cls: 'btn-primary', onClick: () => { D.subjects[c.id] = subs.filter(s => s.name.trim()).map(s => ({ id: s.id || uid(), name: s.name.trim(), coef: +s.coef || 1 })); A.save(); A.rerender(); } }]
    });
    const box = m.el.querySelector('#subs'); const redraw = () => { box.innerHTML = rows(); };
    m.el.addEventListener('input', e => { const t = e.target; if (t.dataset.k) subs[t.dataset.i][t.dataset.k] = t.value; });
    m.el.addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; if (t.dataset.rm != null) { subs.splice(+t.dataset.rm, 1); redraw(); } else if (t.hasAttribute('data-add')) { subs.push({ id: uid(), name: '', coef: 1 }); redraw(); } else if (t.hasAttribute('data-pre')) { subs = (PRESET[c.cycle] || []).map(([name, coef]) => ({ id: uid(), name, coef })); redraw(); } });
  };
  V.classes = () => {
    A.view(`${A.head('Classes et matières', 'Du Jardin à la dernière année du lycée', A.btn('cls-gen', 'Générer les classes standard', { icon: 'layers' }) + A.btn('cls-new', 'Nouvelle classe', { cls: 'btn-primary', icon: 'plus' }))}
    <div class="card flat"><div class="tw">${D.classes.length ? `<table class="tbl"><thead><tr><th>Classe</th><th>Cycle</th><th class="c">Élèves</th><th class="r">Scolarité</th><th class="r">Inscription</th><th>Titulaire</th><th class="c">Matières</th><th></th></tr></thead><tbody>${D.classes.map(c => { const n = D.students.filter(s => s.classId === c.id && s.status !== 'radié').length; return `<tr><td><b>${esc(c.name)}</b></td><td>${badge(esc(c.cycle), 'info')}</td><td class="c">${n}${c.capacity ? ' / ' + c.capacity : ''}</td><td class="r">${money(c.tuition)}</td><td class="r">${money(c.inscription)}</td><td>${esc((A.tch(c.teacherId) || {}).name || '—')}</td><td class="c"><button class="btn btn-ghost btn-sm" data-act="cls-sub" data-id="${c.id}">${(D.subjects[c.id] || []).length} matière(s)</button></td><td class="r"><div class="acts">${A.iconBtn('cls-edit', 'edit', c.id, 'Modifier')}${A.iconBtn('cls-del', 'trash', c.id, 'Supprimer', true)}</div></td></tr>`; }).join('')}</tbody></table>` : A.empty('Aucune classe', 'Générez en un clic les classes du Jardin à la Terminale.', A.btn('cls-gen', 'Générer les classes standard', { cls: 'btn-primary' }))}</div></div>`);
  };

  /* ================= PROFESSEURS ================= */
  const tFields = () => [{ name: 'name', label: 'Nom complet', req: true }, { name: 'phone', label: 'Téléphone', type: 'tel', cls: 'half' }, { name: 'email', label: 'Email', type: 'email', cls: 'half' }, { name: 'subjects', label: 'Matières enseignées', cls: 'half', placeholder: 'Ex : Mathématiques, Physique' }, { name: 'contract', label: 'Contrat', type: 'select', options: ['Permanent', 'Vacataire', 'Stagiaire'], cls: 'half' }, { name: 'salary', label: 'Salaire mensuel (FCFA)', type: 'number', min: 0, cls: 'half' }, { name: 'hired', label: 'Date d\'embauche', type: 'date', cls: 'half' }, { name: 'classes', label: 'Classes assignées', type: 'multi', options: A.classOpts() }];
  ACT['tch-new'] = () => UI.formModal({ title: 'Nouveau professeur', fields: tFields(), values: { contract: 'Permanent', salary: 0, hired: today(), classes: [] }, size: 'lg', onSubmit: v => { D.teachers.push(Object.assign(v, { id: uid() })); A.save(); A.rerender(); } });
  ACT['tch-edit'] = el => { const t = A.tch(el.dataset.id); UI.formModal({ title: 'Modifier le professeur', fields: tFields(), values: t, size: 'lg', onSubmit: v => { Object.assign(t, v); A.save(); A.rerender(); } }); };
  ACT['tch-del'] = el => { const t = A.tch(el.dataset.id); UI.confirm('Supprimer <b>' + esc(t.name) + '</b> et son historique de salaires ?', () => { D.teachers = D.teachers.filter(x => x.id !== t.id); D.salaries = D.salaries.filter(x => x.teacherId !== t.id); A.save(); A.rerender(); }, { danger: true, yes: 'Supprimer' }); };
  ACT['sal-pay'] = el => { const t = A.tch(el.dataset.id); UI.formModal({ title: 'Payer le salaire : ' + esc(t.name), fields: [{ name: 'month', label: 'Mois', type: 'month', def: ST.tMonth }, { name: 'amount', label: 'Montant (FCFA)', type: 'number', min: 0, def: t.salary }, { name: 'method', label: 'Mode de paiement', type: 'select', options: ['Espèces', 'Orange Money', 'Moov Money', 'Virement', 'Chèque'] }], onSubmit: v => { D.salaries = D.salaries.filter(x => !(x.teacherId === t.id && x.month === v.month)); D.salaries.push({ id: uid(), teacherId: t.id, month: v.month, amount: +v.amount, method: v.method, date: today(), status: 'payé' }); A.save(); UI.toast('Salaire enregistré.', 'ok'); A.rerender(); } }); };
  ACT['sal-cancel'] = el => { D.salaries = D.salaries.filter(x => x.id !== el.dataset.id); A.save(); A.rerender(); };
  V.teachers = () => {
    ST.tTab = ST.tTab || 'list'; ST.tMonth = ST.tMonth || today().slice(0, 7);
    const tabs = `<div class="pills" style="margin-bottom:16px"><button class="${ST.tTab === 'list' ? 'on' : ''}" data-act="ttab" data-id="list">Dossiers</button><button class="${ST.tTab === 'sal' ? 'on' : ''}" data-act="ttab" data-id="sal">Salaires</button></div>`;
    let body;
    if (ST.tTab === 'list') body = `<div class="card flat"><div class="tw">${D.teachers.length ? `<table class="tbl"><thead><tr><th>Professeur</th><th>Matières</th><th>Classes</th><th>Contrat</th><th class="r">Salaire</th><th></th></tr></thead><tbody>${D.teachers.map(t => `<tr><td><div class="who"><div class="av2">${esc(t.name[0] || '?')}</div><span><b>${esc(t.name)}</b><small>${esc(t.phone || '')}</small></span></div></td><td>${esc(t.subjects || '—')}</td><td>${(t.classes || []).map(id => esc((A.cls(id) || {}).name || '')).filter(Boolean).join(', ') || '—'}</td><td>${badge(esc(t.contract), 'info')}</td><td class="r">${money(t.salary)}</td><td class="r"><div class="acts">${A.iconBtn('tch-edit', 'edit', t.id, 'Modifier')}${A.iconBtn('tch-del', 'trash', t.id, 'Supprimer', true)}</div></td></tr>`).join('')}</tbody></table>` : A.empty('Aucun professeur', 'Ajoutez votre équipe enseignante.', A.btn('tch-new', 'Ajouter un professeur', { cls: 'btn-primary' }))}</div></div>`;
    else {
      const paid = D.salaries.filter(x => x.month === ST.tMonth && x.status === 'payé');
      const due = U ? D.teachers.reduce((a, t) => a + (+t.salary || 0), 0) : 0; const pt = paid.reduce((a, x) => a + x.amount, 0);
      body = `<div class="tools"><input type="month" data-f="tMonth" data-re="1" value="${ST.tMonth}"></div><div class="kpis"><div class="kpi"><small>Masse salariale</small><b>${money(due)}</b></div><div class="kpi g"><small>Payé</small><b>${money(pt)}</b></div><div class="kpi r"><small>Reste à payer</small><b>${money(Math.max(0, due - pt))}</b></div></div><div class="card flat"><div class="tw"><table class="tbl"><thead><tr><th>Professeur</th><th class="r">Salaire</th><th>État</th><th></th></tr></thead><tbody>${D.teachers.map(t => { const p = paid.find(x => x.teacherId === t.id); return `<tr><td><b>${esc(t.name)}</b></td><td class="r">${money(t.salary)}</td><td>${p ? badge('Payé le ' + fdate(p.date), 'ok') : badge('Non payé', 'bad')}</td><td class="r">${p ? A.iconBtn('sal-cancel', 'x', p.id, 'Annuler', true) : A.btn('sal-pay', 'Payer', { sm: true, cls: 'btn-primary', id: t.id })}</td></tr>`; }).join('') || '<tr><td colspan="4">' + A.empty('Aucun professeur', '') + '</td></tr>'}</tbody></table></div></div>`;
    }
    A.view(`${A.head('Professeurs', 'Dossiers, classes et salaires', A.btn('tch-new', 'Ajouter un professeur', { cls: 'btn-primary', icon: 'plus' }))}${tabs}${body}`);
  };
  ACT.ttab = el => { ST.tTab = el.dataset.id; A.rerender(); };

  /* ================= EMPLOIS DU TEMPS ================= */
  V.timetable = () => {
    ST.ttMode = ST.ttMode || 'class'; ST.ttCls = ST.ttCls || (D.classes[0] && D.classes[0].id) || ''; ST.ttTch = ST.ttTch || (D.teachers[0] && D.teachers[0].id) || '';
    const days = D.settings.days, slots = D.settings.slots; const isT = ST.ttMode === 'teacher';
    const cellOf = (cid, d, i) => (D.timetable[cid] || {})[d + '|' + i];
    const grid = () => `<div class="tw"><div class="tt-grid" style="grid-template-columns:96px repeat(${days.length},1fr)"><div class="hd"></div>${days.map(d => `<div class="hd">${d}</div>`).join('')}${slots.map((sl, i) => `<div class="sl">${esc(sl)}</div>${days.map(d => {
      if (isT) { const hit = D.classes.map(c => ({ c, x: cellOf(c.id, d, i) })).find(h => h.x && h.x.teacherId === ST.ttTch); return `<div>${hit ? `<b>${esc(hit.x.subject)}</b>${esc(hit.c.name)}` : ''}</div>`; }
      const x = cellOf(ST.ttCls, d, i); if (x && x.brk) return `<div class="cell brk" data-act="tt-edit" data-id="${d}|${i}">${esc(x.subject || 'Pause')}</div>`;
      return `<div class="cell" data-act="tt-edit" data-id="${d}|${i}">${x ? `<b>${esc(x.subject)}</b>${esc((A.tch(x.teacherId) || {}).name || '')}` : ''}</div>`;
    }).join('')}`).join('')}</div></div>`;
    A.view(`${A.head('Emplois du temps', 'Une grille par classe, du Jardin à la Terminale', A.btn('tt-print', 'Imprimer', { icon: 'print' }) + A.btn('tt-slots', 'Horaires', { icon: 'clock' }))}
    <div class="tools"><div class="pills"><button class="${!isT ? 'on' : ''}" data-act="ttmode" data-id="class">Par classe</button><button class="${isT ? 'on' : ''}" data-act="ttmode" data-id="teacher">Par professeur</button></div>${isT ? A.sel('ttTch', D.teachers.map(t => [t.id, t.name]), ST.ttTch, { re: true }) : A.sel('ttCls', A.classOpts(), ST.ttCls, { re: true })}</div>
    <div class="card"><div class="cb">${(isT ? D.teachers.length : D.classes.length) ? grid() : A.empty('Rien à afficher', isT ? 'Ajoutez des professeurs.' : 'Créez d\'abord vos classes.')}</div></div>${isT ? '' : '<p class="small muted" style="margin-top:10px">Cliquez sur une case pour y placer une matière et un professeur.</p>'}`);
  };
  ACT.ttmode = el => { ST.ttMode = el.dataset.id; A.rerender(); };
  ACT['tt-edit'] = el => {
    const key = el.dataset.id, c = A.cls(ST.ttCls); if (!c) return; const cur = (D.timetable[c.id] || {})[key] || {};
    const subs = (D.subjects[c.id] || []).map(s => s.name);
    UI.formModal({ title: 'Créneau : ' + key.split('|')[0] + ', ' + D.settings.slots[+key.split('|')[1]], size: 'sm', submit: 'Enregistrer', fields: [{ name: 'subject', label: 'Matière ou activité', type: 'text', list: 'dl_subj', def: cur.subject || '', hint: 'Choisissez dans la liste ou écrivez librement.' }, { html: `<datalist id="dl_subj">${[...subs, 'Récréation', 'Pause déjeuner', 'Étude'].map(s => `<option value="${esc(s)}">`).join('')}</datalist>` }, { name: 'teacherId', label: 'Professeur', type: 'select', options: [['', 'Aucun'], ...D.teachers.map(t => [t.id, t.name])], def: cur.teacherId || '' }, { name: 'brk', label: 'Créneau de pause', type: 'checkbox', def: !!cur.brk }], onSubmit: v => { D.timetable[c.id] = D.timetable[c.id] || {}; if (!v.subject.trim() && !v.teacherId) delete D.timetable[c.id][key]; else D.timetable[c.id][key] = { subject: v.subject.trim(), teacherId: v.teacherId, brk: v.brk }; A.save(); A.rerender(); } });
  };
  ACT['tt-slots'] = () => UI.formModal({ title: 'Horaires et jours', fields: [{ name: 'slots', label: 'Créneaux (un par ligne)', type: 'textarea', rows: 8, def: D.settings.slots.join('\n') }, { name: 'days', label: 'Jours (un par ligne)', type: 'textarea', rows: 6, def: D.settings.days.join('\n') }], onSubmit: v => { const sl = v.slots.split('\n').map(x => x.trim()).filter(Boolean), dy = v.days.split('\n').map(x => x.trim()).filter(Boolean); if (!sl.length || !dy.length) { UI.toast('Renseignez au moins un créneau et un jour.', 'err'); return false; } D.settings.slots = sl; D.settings.days = dy; A.save(); A.rerender(); } });
  ACT['tt-print'] = () => { const g = document.querySelector('.tt-grid'); if (!g) return; const c = ST.ttMode === 'teacher' ? A.tch(ST.ttTch) : A.cls(ST.ttCls); const css = `.tt-grid{display:grid;border:1px solid #14213D;font-size:11px}.tt-grid>div{border-right:1px solid #ccc;border-bottom:1px solid #ccc;padding:6px;min-height:42px}.tt-grid .hd{background:#14213D;color:#fff;text-align:center;font-weight:700;min-height:0}.tt-grid .sl{background:#f3efe7;font-weight:700}.tt-grid b{display:block}.brk{background:#eee}h1{font-family:Fraunces,serif;font-size:20px;margin-bottom:4px}p{margin-bottom:12px;font-size:12px;color:#555}`; U.print(`<h1>${esc(D.settings.name)}</h1><p>Emploi du temps : ${esc((c && (c.name)) || '')} · ${esc(D.settings.year)}</p>${g.outerHTML.replace('min-width:760px', '')}`, css); };
})();
