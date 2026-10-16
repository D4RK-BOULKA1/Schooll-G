/* School-G : panel administrateur (propriétaire du SaaS). Accès par email + mot de passe. */
(function () {
  'use strict';
  const { esc, money, fdate, ic, uid, today, badge, addDays } = UI;
  const root = document.getElementById('root');
  const ST = { q: '', f: '', tab: 'dash' };
  const $ = id => document.getElementById(id);

  /* ---------- connexion ---------- */
  function loginView() {
    root.innerHTML = `<div class="lock"><div class="box" style="text-align:left"><div class="ic" style="margin:0 0 14px">${ic('shield', 28)}</div><h1 style="margin-top:0">Administration</h1><p>Accès réservé au propriétaire de School-G.</p><div class="err" id="err" style="display:none;background:var(--red-s);color:var(--red);padding:10px 12px;border-radius:6px;font-size:14px;margin-bottom:14px"></div><form class="frm" id="f" novalidate><div class="fld"><label>Email</label><input type="email" name="email" autocomplete="username" required></div><div class="fld"><label>Mot de passe</label><input type="password" name="pw" autocomplete="current-password" required></div><div class="fld"><button class="btn btn-navy btn-lg" style="width:100%">Se connecter</button></div></form><p class="small" style="margin-top:14px"><a href="index.html" class="muted">Retour au site</a></p></div></div>`;
    $('f').onsubmit = async e => {
      e.preventDefault(); const v = UI.read($('f')); const b = e.target.querySelector('button'); b.disabled = true;
      try { await SG.adminLogin(v.email, v.pw); boot(); } catch (x) { const er = $('err'); er.textContent = x.message; er.style.display = 'block'; b.disabled = false; }
    };
  }

  /* ---------- calculs ---------- */
  const stats = () => {
    const sch = SG.schools(), subs = SG.subs().filter(s => s.status === 'validé');
    const by = { active: 0, trial: 0, expired: 0, blocked: 0, banned: 0 }; sch.forEach(s => by[SG.status(s)]++);
    const ym = today().slice(0, 7); let students = 0; sch.forEach(s => { try { students += SG.data(s.id).students.length; } catch (e) { } });
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    return {
      sch, subs, by, students, total: subs.reduce((a, s) => a + s.amount, 0), month: subs.filter(s => s.date.startsWith(ym)).reduce((a, s) => a + s.amount, 0),
      conv: sch.length ? Math.round(by.active / sch.length * 100) : 0,
      chart: months.map(m => ({ label: UI.MONTHS[+m.slice(5) - 1].slice(0, 4), v: [sch.filter(s => s.createdAt.startsWith(m)).length, subs.filter(s => s.date.startsWith(m)).reduce((a, s) => a + s.amount, 0) / 1000] }))
    };
  };

  /* ---------- actions ---------- */
  const A = {};
  const refresh = () => render();
  A.view = id => { const s = SG.school(id); if (!s) return; SG.updateSchool(id, {}); const old = SG.session(); localStorage.setItem('sgv1_session', JSON.stringify({ role: 'director', schoolId: id, byAdmin: true })); window.open('app.html', '_blank'); SG.log('Consultation de l\'école ' + s.name); };
  A.ban = id => { const s = SG.school(id); UI.confirm(`Bannir définitivement <b>${esc(s.name)}</b> ? L'école et les parents ne pourront plus se connecter.`, () => { SG.updateSchool(id, { banned: true }); SG.log('Bannissement : ' + s.name); refresh(); }, { danger: true, yes: 'Bannir' }); };
  A.unban = id => { SG.updateSchool(id, { banned: false }); SG.log('Débannissement : ' + SG.school(id).name); refresh(); };
  A.block = id => { const s = SG.school(id); UI.confirm(`Bloquer l'accès de <b>${esc(s.name)}</b> ? Vous pourrez le débloquer à tout moment.`, () => { SG.updateSchool(id, { blocked: true }); SG.log('Blocage : ' + s.name); refresh(); }, { danger: true, yes: 'Bloquer' }); };
  A.unblock = id => { SG.updateSchool(id, { blocked: false }); SG.log('Déblocage : ' + SG.school(id).name); refresh(); };
  A.cancelTrial = id => { const s = SG.school(id); UI.confirm(`Annuler l'essai gratuit de <b>${esc(s.name)}</b> ? L'accès sera bloqué jusqu'au paiement.`, () => { SG.updateSchool(id, { trialCancelled: true }); SG.log('Essai annulé : ' + s.name); refresh(); }, { danger: true, yes: 'Annuler l\'essai' }); };
  A.extend = id => UI.formModal({ title: 'Prolonger l\'essai', size: 'sm', fields: [{ name: 'days', label: 'Jours à ajouter', type: 'number', min: 1, def: 7 }], onSubmit: v => { const s = SG.school(id); const base = new Date(s.trialEnd) > Date.now() ? new Date(s.trialEnd) : new Date(); SG.updateSchool(id, { trialEnd: addDays(base, +v.days).toISOString(), trialCancelled: false }); SG.log('Essai prolongé : ' + s.name); refresh(); } });
  A.pay = id => {
    const g = SG.global(); const s = SG.school(id);
    UI.formModal({
      title: 'Enregistrer un paiement : ' + esc(s.name), fields: [{ name: 'plan', label: 'Formule', type: 'select', options: g.plans.map(p => [p.id, p.name + ' · ' + money(p.price)]) }, { name: 'amount', label: 'Montant reçu (FCFA)', type: 'number', min: 0, def: g.plans[0].price, cls: 'half' }, { name: 'months', label: 'Durée (mois)', type: 'number', min: 1, def: g.plans[0].months, cls: 'half' }, { name: 'method', label: 'Mode de paiement', type: 'select', options: ['Orange Money', 'Moov Money', 'Espèces', 'Virement', 'Autre'], cls: 'half' }, { name: 'ref', label: 'Référence', cls: 'half' }, { name: 'note', label: 'Note' }],
      submit: 'Enregistrer et activer', onSubmit: v => { const p = g.plans.find(x => x.id === v.plan); SG.recordSub(id, { plan: p ? p.name : 'Abonnement', amount: v.amount, months: +v.months || 1, method: v.method, ref: v.ref, note: v.note }); UI.toast('Abonnement activé.', 'ok'); refresh(); },
      after: el => { const f = el.querySelector('form'); f.querySelector('[name=plan]').addEventListener('change', e => { const p = g.plans.find(x => x.id === e.target.value); if (p) { f.querySelector('[name=amount]').value = p.price; f.querySelector('[name=months]').value = p.months; } }); }
    });
  };
  A.edit = id => {
    const s = SG.school(id);
    UI.formModal({
      title: 'Modifier : ' + esc(s.name), size: 'lg', fields: [{ name: 'name', label: 'École', req: true, cls: 'half' }, { name: 'director', label: 'Directeur', cls: 'half' }, { name: 'email', label: 'Email', type: 'email', cls: 'half' }, { name: 'phone', label: 'Téléphone', cls: 'half' }, { name: 'city', label: 'Ville', cls: 'half' }, { name: 'plan', label: 'Formule affichée', cls: 'half' }, { name: 'trialEnd', label: 'Fin de l\'essai', type: 'date', def: (s.trialEnd || '').slice(0, 10), cls: 'half' }, { name: 'paidUntil', label: 'Abonnement jusqu\'au', type: 'date', def: (s.paidUntil || '').slice(0, 10), cls: 'half', hint: 'Videz pour retirer l\'abonnement.' }, { name: 'newpw', label: 'Nouveau mot de passe (optionnel)', type: 'text', hint: 'Laissez vide pour ne pas changer.' }, { name: 'notes', label: 'Notes internes', type: 'textarea', rows: 3 }], values: s,
      onSubmit: async v => { const patch = { name: v.name, director: v.director, email: v.email, phone: v.phone, city: v.city, plan: v.plan, notes: v.notes, trialEnd: v.trialEnd ? new Date(v.trialEnd + 'T23:59:00').toISOString() : s.trialEnd, paidUntil: v.paidUntil ? new Date(v.paidUntil + 'T23:59:00').toISOString() : null }; if (v.newpw) patch.pw = await SG.hash(v.newpw); SG.updateSchool(id, patch); SG.log('Modification : ' + v.name); refresh(); }
    });
  };
  A.reset = id => { const s = SG.school(id); UI.formModal({ title: 'Nouveau mot de passe : ' + esc(s.name), size: 'sm', fields: [{ name: 'pw', label: 'Mot de passe', def: Math.random().toString(36).slice(2, 10), req: true }], onSubmit: async v => { SG.updateSchool(id, { pw: await SG.hash(v.pw) }); UI.toast('Mot de passe changé : ' + v.pw, 'ok'); } }); };
  A.del = id => { const s = SG.school(id); UI.confirm(`Supprimer <b>${esc(s.name)}</b> et <b>toutes ses données</b> ? Action définitive.`, () => { SG.saveSchools(SG.schools().filter(x => x.id !== id)); SG.dropData(id); SG.log('Suppression : ' + s.name); refresh(); }, { danger: true, yes: 'Supprimer définitivement' }); };
  A.detail = id => {
    const s = SG.school(id); const d = SG.data(id); const st = SG.status(s); const subs = SG.subs().filter(x => x.schoolId === id);
    const paid = d.payments.filter(p => p.status === 'validé').reduce((a, p) => a + (+p.amount), 0);
    UI.modal({
      title: esc(s.name), size: 'lg', body: `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">${badge(SG.STATUS[st][0], SG.STATUS[st][1])}<span class="code">Code ${esc(s.code)}</span>${badge(esc(s.plan), 'info')}</div>
      <div class="g2"><dl class="kv"><dt>Directeur</dt><dd>${esc(s.director)}</dd><dt>Email</dt><dd>${esc(s.email)}</dd><dt>Téléphone</dt><dd>${esc(s.phone)}</dd><dt>Ville</dt><dd>${esc(s.city || '—')}</dd><dt>Inscrit le</dt><dd>${fdate(s.createdAt)}</dd><dt>Fin d'essai</dt><dd>${fdate(s.trialEnd)}</dd><dt>Abonné jusqu'au</dt><dd>${fdate(s.paidUntil) || '—'}</dd></dl>
      <dl class="kv"><dt>Élèves</dt><dd>${d.students.length}</dd><dt>Classes</dt><dd>${d.classes.length}</dd><dt>Professeurs</dt><dd>${d.teachers.length}</dd><dt>Paiements saisis</dt><dd>${d.payments.length}</dd><dt>Encaissé par l'école</dt><dd>${money(paid)}</dd><dt>Notes internes</dt><dd>${esc(s.notes || '—')}</dd></dl></div>
      <h4 style="margin:18px 0 8px;font-size:16px">Abonnements payés</h4>${subs.length ? `<div class="tw"><table class="tbl"><tbody>${subs.map(x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.plan)} · ${x.months} mois</td><td>${esc(x.method)}</td><td class="r"><b>${money(x.amount)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Aucun paiement.</p>'}`
    });
  };
  A.refund = id => { const subs = SG.subs(); const x = subs.find(q => q.id === id); UI.confirm(`Annuler le paiement de ${money(x.amount)} de <b>${esc(x.schoolName)}</b> ? L'abonnement sera ramené à sa date précédente.`, () => { x.status = 'annulé'; SG.saveSubs(subs); const sc = SG.school(x.schoolId); if (sc) SG.updateSchool(sc.id, { paidUntil: x.prevPaidUntil || null }); SG.log('Paiement annulé : ' + x.schoolName); refresh(); }, { danger: true, yes: 'Annuler le paiement' }); };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    if (el.dataset.a === 'tab') { ST.tab = el.dataset.id; render(); return; }
    if (el.dataset.a === 'logout') { SG.adminOut(); loginView(); return; }
    if (el.dataset.a === 'csv') return exportCsv();
    if (el.dataset.a === 'plans') return plansModal();
    if (el.dataset.a === 'announce') return announceModal();
    if (el.dataset.a === 'security') return securityModal();
    if (el.dataset.a === 'backup') return UI.download('school-g-admin-' + today() + '.json', JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sgv1_')).map(k => [k, localStorage.getItem(k)]))));
    const f = A[el.dataset.a]; if (f) f(el.dataset.id);
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { ST.q = e.target.value; drawList(); } });
  document.addEventListener('change', e => { if (e.target.id === 'f') { ST.f = e.target.value; drawList(); } });

  function plansModal() {
    const g = SG.global(); const plans = g.plans.map(p => ({ ...p }));
    UI.formModal({
      title: 'Tarifs et paramètres', size: 'lg', fields: [{ name: 'trialDays', label: 'Durée de l\'essai (jours)', type: 'number', min: 1, def: g.trialDays, cls: 'half' }, { name: 'contactWa', label: 'WhatsApp de contact', def: g.contactWa, cls: 'half' }, { name: 'contactMail', label: 'Email de contact', def: g.contactMail }, ...plans.flatMap((p, i) => [{ name: 'n' + i, label: 'Formule ' + (i + 1) + ' : nom', def: p.name, cls: 'third' }, { name: 'p' + i, label: 'Prix (FCFA)', type: 'number', def: p.price, cls: 'third' }, { name: 'm' + i, label: 'Mois', type: 'number', def: p.months, cls: 'third' }])],
      onSubmit: v => { SG.setGlobal({ trialDays: +v.trialDays || 7, contactWa: v.contactWa, contactMail: v.contactMail, plans: plans.map((p, i) => ({ ...p, name: v['n' + i], price: +v['p' + i], months: +v['m' + i] || 1 })) }); UI.toast('Paramètres enregistrés.', 'ok'); render(); }
    });
  }
  function announceModal() { const g = SG.global(); UI.formModal({ title: 'Annonce affichée à toutes les écoles', fields: [{ name: 'a', label: 'Message (vide pour retirer)', type: 'textarea', rows: 3, def: g.announcement }], onSubmit: v => { SG.setGlobal({ announcement: v.a.trim() }); UI.toast('Annonce mise à jour.', 'ok'); } }); }
  function securityModal() { UI.formModal({ title: 'Identifiants administrateur', size: 'sm', fields: [{ name: 'email', label: 'Email', type: 'email', req: true, def: (JSON.parse(localStorage.getItem('sgv1_global') || '{}').adminEmail) || SG_CONFIG.admin.email }, { name: 'pw', label: 'Nouveau mot de passe', type: 'password', hint: 'Au moins 8 caractères.', req: true }], onSubmit: async v => { if (v.pw.length < 8) { UI.toast('Au moins 8 caractères.', 'err'); return false; } SG.setGlobal({ adminEmail: v.email.trim(), adminPw: await SG.hash(v.pw) }); UI.toast('Identifiants modifiés.', 'ok'); } }); }
  function exportCsv() { UI.csv('ecoles-school-g.csv', [['École', 'Directeur', 'Email', 'Téléphone', 'Ville', 'Statut', 'Formule', 'Inscrit le', 'Fin essai', 'Abonné jusqu\'au'], ...SG.schools().map(s => [s.name, s.director, s.email, s.phone, s.city, SG.STATUS[SG.status(s)][0], s.plan, fdate(s.createdAt), fdate(s.trialEnd), fdate(s.paidUntil)])]); }

  /* ---------- rendu ---------- */
  function rows() {
    const q = ST.q.toLowerCase().trim();
    return SG.schools().filter(s => (!ST.f || SG.status(s) === ST.f) && (!q || (s.name + s.email + s.phone + s.director + s.code).toLowerCase().includes(q))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  function schoolActions(s) {
    const st = SG.status(s); const b = (a, ico, t, danger) => `<button class="btn btn-ghost btn-sm btn-icon" data-a="${a}" data-id="${s.id}" title="${t}" aria-label="${t}" ${danger ? 'style="color:var(--red)"' : ''}>${ic(ico, 16)}</button>`;
    return `<div class="acts">${b('detail', 'eye', 'Détails')}${b('view', 'school', 'Ouvrir l\'espace de l\'école')}<button class="btn btn-primary btn-sm" data-a="pay" data-id="${s.id}">Paiement</button>${b('edit', 'edit', 'Modifier')}${st === 'trial' ? `<button class="btn btn-ghost btn-sm" data-a="cancelTrial" data-id="${s.id}">Annuler l'essai</button>` : ''}${st === 'banned' ? `<button class="btn btn-ghost btn-sm" data-a="unban" data-id="${s.id}">Débannir</button>` : `<button class="btn btn-danger btn-sm" data-a="ban" data-id="${s.id}">Bannir</button>`}${s.blocked ? `<button class="btn btn-ghost btn-sm" data-a="unblock" data-id="${s.id}">Débloquer</button>` : (st !== 'banned' ? `<button class="btn btn-ghost btn-sm" data-a="block" data-id="${s.id}">Bloquer</button>` : '')}</div>`;
  }
  function drawList() {
    const box = $('list'); if (!box) return; const l = rows();
    box.innerHTML = l.length ? `<table class="tbl"><thead><tr><th>École</th><th>Contact</th><th>Statut</th><th>Reste</th><th>Inscrite</th><th></th></tr></thead><tbody>${l.map(s => { const st = SG.status(s); return `<tr><td><b>${esc(s.name)}</b><br><small class="muted">${esc(s.director)} · code ${esc(s.code)}</small></td><td>${esc(s.email)}<br><small class="muted">${esc(s.phone)}</small></td><td>${badge(SG.STATUS[st][0], SG.STATUS[st][1])}<br><small class="muted">${esc(s.plan)}</small></td><td>${st === 'trial' || st === 'active' ? SG.daysLeft(s) + ' j' : '—'}</td><td>${fdate(s.createdAt)}</td><td>${schoolActions(s)}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>Aucune école</h4><p>${SG.schools().length ? 'Aucun résultat pour ce filtre.' : 'Les écoles inscrites apparaîtront ici.'}</p></div>`;
  }
  function render() {
    const S = stats(); const g = SG.global();
    const nav = [['dash', 'Vue d\'ensemble', 'grid'], ['schools', 'Écoles', 'school'], ['pays', 'Paiements', 'wallet'], ['logs', 'Journal', 'list'], ['settings', 'Réglages', 'set']];
    let body = '';
    if (ST.tab === 'dash') body = `<div class="kpis"><div class="kpi"><small>Écoles inscrites</small><b>${S.sch.length}</b><span>${S.students} élève(s) au total</span></div><div class="kpi g"><small>Abonnées actives</small><b>${S.by.active}</b><span>Conversion : ${S.conv} %</span></div><div class="kpi o"><small>En essai gratuit</small><b>${S.by.trial}</b><span>${S.by.expired} essai(s) expiré(s)</span></div><div class="kpi r"><small>Bloquées ou bannies</small><b>${S.by.blocked + S.by.banned}</b></div></div>
      <div class="kpis"><div class="kpi g"><small>Revenus du mois</small><b>${money(S.month)}</b></div><div class="kpi"><small>Revenus totaux</small><b>${money(S.total)}</b></div><div class="kpi o"><small>Paiements validés</small><b>${S.subs.length}</b></div><div class="kpi"><small>Prix moyen</small><b>${money(S.subs.length ? S.total / S.subs.length : 0)}</b></div></div>
      <div class="g21" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Inscriptions (barre orange) et revenus en milliers de FCFA (barre marine)</h3></div><div class="cb">${UI.bars(S.chart, { h: 190 })}</div></div>
      <div class="card"><div class="ch"><h3>Répartition</h3></div><div class="cb">${[['Abonnées', S.by.active, 'ok'], ['En essai', S.by.trial, 'info'], ['Expirées', S.by.expired, 'warn'], ['Bloquées', S.by.blocked, 'bad'], ['Bannies', S.by.banned, 'bad']].map(([l, n, k]) => `<div class="row"><span>${l}</span>${badge(n, k)}</div>`).join('')}</div></div></div>
      <div class="card"><div class="ch"><h3>Dernières inscriptions</h3><button class="btn btn-ghost btn-sm" data-a="tab" data-id="schools">Tout voir</button></div><div class="tw">${S.sch.length ? `<table class="tbl"><tbody>${S.sch.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(s => `<tr><td><b>${esc(s.name)}</b><br><small class="muted">${esc(s.email)}</small></td><td>${badge(SG.STATUS[SG.status(s)][0], SG.STATUS[SG.status(s)][1])}</td><td>${fdate(s.createdAt)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><h4>Aucune école pour l\'instant</h4><p>Les inscriptions à l\'essai gratuit apparaîtront ici.</p></div>'}</div></div>`;
    else if (ST.tab === 'schools') body = `<div class="tools"><div class="sr"><span style="position:absolute"></span><input type="search" id="q" placeholder="Rechercher une école, email, téléphone, code" value="${esc(ST.q)}"></div><select id="f"><option value="">Tous les statuts</option>${Object.entries(SG.STATUS).map(([k, v]) => `<option value="${k}" ${ST.f === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><button class="btn btn-ghost" data-a="csv">${ic('dl', 16)}Exporter CSV</button></div><div class="card flat"><div class="tw" id="list"></div></div>`;
    else if (ST.tab === 'pays') { const all = SG.subs(); body = `<div class="card flat"><div class="tw">${all.length ? `<table class="tbl"><thead><tr><th>Date</th><th>École</th><th>Formule</th><th>Mode</th><th class="r">Montant</th><th>État</th><th></th></tr></thead><tbody>${all.map(x => `<tr><td>${fdate(x.date)}</td><td><b>${esc(x.schoolName)}</b></td><td>${esc(x.plan)} · ${x.months} mois</td><td>${esc(x.method)}${x.ref ? '<br><small class="muted">' + esc(x.ref) + '</small>' : ''}</td><td class="r"><b>${money(x.amount)}</b></td><td>${badge(x.status, x.status === 'validé' ? 'ok' : 'bad')}</td><td class="r">${x.status === 'validé' ? `<button class="btn btn-danger btn-sm" data-a="refund" data-id="${x.id}">Annuler</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><h4>Aucun paiement</h4><p>Enregistrez un paiement depuis la liste des écoles.</p></div>'}</div></div>`; }
    else if (ST.tab === 'logs') { const l = SG.logs(); body = `<div class="card"><div class="cb" style="padding-top:6px;padding-bottom:6px">${l.map(x => `<div class="row"><span>${esc(x.m)}</span><small class="muted nowrap">${new Date(x.t).toLocaleString('fr-FR')}</small></div>`).join('') || '<div class="empty"><h4>Journal vide</h4></div>'}</div></div>`; }
    else body = `<div class="g2"><div class="card"><div class="ch"><h3>Tarifs et essai</h3><button class="btn btn-primary btn-sm" data-a="plans">Modifier</button></div><div class="cb"><div class="row"><span>Durée de l'essai</span><b>${g.trialDays} jours</b></div>${g.plans.map(p => `<div class="row"><span>${esc(p.name)}</span><b>${money(p.price)} / ${p.months} mois</b></div>`).join('')}<div class="row"><span>WhatsApp</span><b>${esc(g.contactWa)}</b></div></div></div>
      <div class="card"><div class="ch"><h3>Annonce globale</h3><button class="btn btn-primary btn-sm" data-a="announce">Modifier</button></div><div class="cb"><p>${esc(g.announcement) || '<span class="muted">Aucune annonce.</span>'}</p></div></div>
      <div class="card"><div class="ch"><h3>Sécurité</h3><button class="btn btn-primary btn-sm" data-a="security">Changer les identifiants</button></div><div class="cb"><p class="small muted">Changez dès maintenant l'email et le mot de passe par défaut du fichier <span class="code">js/config.js</span>.</p></div></div>
      <div class="card"><div class="ch"><h3>Sauvegarde</h3><button class="btn btn-ghost btn-sm" data-a="backup">Exporter</button></div><div class="cb"><p class="small muted">Exporte toutes les données de ce navigateur (écoles, abonnements, journal).</p></div></div></div>`;
    root.innerHTML = `<div class="shell"><aside class="side" id="side"><div class="side-brand"><div class="lg">G</div><div><b>School-G</b><small>Administration</small></div></div><nav>${nav.map(([k, l, i]) => `<a class="it ${ST.tab === k ? 'on' : ''}" href="#" data-a="tab" data-id="${k}">${ic(i, 18)}<span>${l}</span></a>`).join('')}</nav><div class="side-foot"><a href="#" data-a="logout">${ic('out', 16)}Se déconnecter</a><a href="index.html">${ic('arrow', 16)}Retour au site</a></div></aside><div class="scrim" id="scrim"></div>
      <div class="main"><header class="top"><button class="mb" id="mb" aria-label="Menu">${ic('menu', 24)}</button><div class="tt">${nav.find(n => n[0] === ST.tab)[1]}</div><div class="sp"></div><div class="dt">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="av">A</div></header><main id="view">${body}</main></div></div>`;
    const side = $('side'), scrim = $('scrim'); const tog = on => { side.classList.toggle('open', on); scrim.classList.toggle('on', on); };
    $('mb').onclick = () => tog(true); scrim.onclick = () => tog(false); side.addEventListener('click', e => { if (e.target.closest('a.it')) tog(false); });
    drawList();
  }
  function boot() { if (SG.adminOk()) render(); else loginView(); }
  boot();
})();
