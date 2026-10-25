/* School-G : panel administrateur (propriétaire du SaaS).
   Accès : connexion Google ou email + mot de passe, uniquement pour l'email administrateur (config.js + firestore.rules). */
(function () {
  'use strict';
  const { esc, money, fdate, ic, today, badge } = UI;
  const root = document.getElementById('root');
  const ST = { q: '', f: '', tab: 'dash' };
  const RO_TABS = new Set(['site', 'admins', 'settings']);
  const TABPERM = { dash: 'dash', schools: 'schools', prospects: 'prospects', an: 'an', pays: 'pays', logs: 'logs' };
  const denied = tab => !!TABPERM[tab] && !SG.can(TABPERM[tab]);
  const RO_OK = new Set(['tab', 'logout', 'csv', 'refresh', 'view', 'detail', 'anref', 'anper']);
  const DATA = { schools: [], subs: [], logs: [], msgs: [], refs: [], admins: [], visits: [], sess: [], online: [] };
  const $ = id => document.getElementById(id);
  const G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

  /* ---------- connexion ---------- */
  function loginView(msg, kind) {
    root.innerHTML = `<div class="lock"><div class="box" style="text-align:left"><div class="ic" style="margin:0 0 14px">${ic('shield', 28)}</div><h1 style="margin-top:0">Administration</h1><p>Accès réservé au propriétaire de School-G.</p>
      <div id="msg" style="display:${msg ? 'block' : 'none'};background:${kind === 'ok' ? 'var(--green-s)' : 'var(--red-s)'};color:${kind === 'ok' ? 'var(--green)' : 'var(--red)'};padding:10px 12px;border-radius:6px;font-size:14px;margin-bottom:14px">${esc(msg || '')}</div>
      <button class="btn btn-ghost btn-lg" id="g" style="width:100%;gap:10px">${G}Continuer avec Google</button>
      <div style="display:flex;align-items:center;gap:12px;color:var(--mute);font-size:12.5px;margin:16px 0"><span style="flex:1;height:1px;background:var(--line2)"></span>ou<span style="flex:1;height:1px;background:var(--line2)"></span></div>
      <form class="frm" id="f" novalidate><div class="fld"><label>Email</label><input type="email" name="email" autocomplete="username" required></div><div class="fld"><label>Mot de passe</label><input type="password" name="pw" autocomplete="current-password" required></div><div class="fld"><button class="btn btn-navy btn-lg" style="width:100%">Se connecter</button></div></form>
      <p class="small" style="margin-top:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><button class="btn-link" id="mk" type="button" style="background:none;border:0;color:var(--orange-d);font-weight:600;padding:0">Première connexion : créer le compte</button><button class="btn-link" id="fg" type="button" style="background:none;border:0;color:var(--orange-d);font-weight:600;padding:0">Mot de passe oublié</button><a href="index.html" class="muted">Retour au site</a></p></div></div>`;
    const say = (m, k) => { const e = $('msg'); e.textContent = m; e.style.display = 'block'; e.style.background = k === 'ok' ? 'var(--green-s)' : 'var(--red-s)'; e.style.color = k === 'ok' ? 'var(--green)' : 'var(--red)'; };
    const check = async () => {
      const u = SG.user; if (!u) return;
      if (u.email && !u.emailVerified) { try { await SG.sendVerification(); } catch (e) { } await SG.logout(); return say('Email non vérifié : un lien de vérification vient d\'être envoyé à ' + u.email + '. Cliquez dessus, puis reconnectez-vous.', 'ok'); }
      await SG.loadRole(); if (SG.role) return boot();
      await SG.logout(); say('Ce compte n\'est pas administrateur. Demandez à l\'administrateur principal de vous inviter avec cet email.');
    };
    $('g').onclick = async () => { try { const u = await SG.loginGoogle(); if (u) await check(); } catch (x) { say(SG.errMsg(x)); } };
    $('f').onsubmit = async e => { e.preventDefault(); const v = UI.read($('f')); if (!v.email || !v.pw) return say('Renseignez votre email et votre mot de passe.'); try { await SG.loginEmail(v.email, v.pw); await check(); } catch (x) { say(SG.errMsg(x)); } };
    $('fg').onclick = async () => {
      const em = (UI.read($('f')).email || '').trim();
      if (!em) return say('Saisissez votre email ci-dessus, puis cliquez sur « Mot de passe oublié ».');
      try { await SG.resetPassword(em); say('Email envoyé à ' + em + ' : cliquez sur le lien pour choisir votre mot de passe (vérifiez aussi les spams).', 'ok'); } catch (x) { say(SG.errMsg(x)); }
    };
    $('mk').onclick = async () => {
      const v = UI.read($('f')); if (!v.email || !v.pw) return say('Saisissez votre email et le mot de passe voulu, puis cliquez à nouveau.');
      if (v.pw.length < 8) return say('Au moins 8 caractères.');
      try { await SG.signupEmail(v.email, v.pw); await SG.sendVerification(); await SG.logout(); say('Compte créé. Un email de vérification a été envoyé : cliquez sur le lien, puis connectez-vous.', 'ok'); } catch (x) { say(SG.errMsg(x)); }
    };
  }

  /* ---------- données ---------- */
  async function load(what) {
    if (!what || what === 'schools') DATA.schools = SG.isAdmin() || SG.can('schools') || SG.can('prospects') || SG.can('dash') || SG.can('view') ? await SG.schools() : [];
    if (!what || what === 'subs') DATA.subs = await SG.subs().catch(() => []);
    if (!what || what === 'admins') { if (SG.isAdmin()) DATA.admins = await SG.listAdmins().catch(() => []); }
    if (!what || what === 'visits') DATA.visits = await SG.visits().catch(() => []);
    if (!what || what === 'refs') DATA.refs = await SG.allReferrals().catch(() => []);
    if (what === 'an') { DATA.sess = await SG.sessions(90).catch(() => []); DATA.online = await SG.onlineNow().catch(() => []); }
    if (what === 'logs') DATA.logs = await SG.logs().catch(() => []);
    if (what === 'msgs') DATA.msgs = await SG.allMessages().catch(() => []);
  }
  const stats = () => {
    const sch = DATA.schools, subs = DATA.subs.filter(s => s.status === 'validé');
    const by = { active: 0, trial: 0, expired: 0, blocked: 0, banned: 0 }; sch.forEach(s => by[SG.status(s)]++);
    const ym = today().slice(0, 7);
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    return {
      sch, subs, by, students: sch.reduce((a, s) => a + ((s.stats && s.stats.students) || 0), 0), total: subs.reduce((a, s) => a + s.amount, 0), month: subs.filter(s => s.date.startsWith(ym)).reduce((a, s) => a + s.amount, 0),
      conv: sch.length ? Math.round(by.active / sch.length * 100) : 0,
      chart: months.map(m => ({ label: UI.MONTHS[+m.slice(5) - 1].slice(0, 4), v: [sch.filter(s => (s.createdAt || '').startsWith(m)).length, subs.filter(s => s.date.startsWith(m)).reduce((a, s) => a + s.amount, 0) / 1000] }))
    };
  };

  /* ---------- visites du site ---------- */
  function visitsHtml() {
    const v = DATA.visits, by = {}; v.forEach(x => { by[x.day] = x; });
    const iso = k => { const d = new Date(); d.setUTCDate(d.getUTCDate() - k); return d.toISOString().slice(0, 10); };
    const sum = (k, f) => { let t = 0; for (let i = 0; i < k; i++) t += (by[iso(i)] || {})[f] || 0; return t; };
    const tot = v.reduce((a, x) => a + x.n, 0), uni = v.reduce((a, x) => a + x.u, 0);
    const chart = []; for (let i = 13; i >= 0; i--) { const d = iso(i), x = by[d] || { n: 0, u: 0 }; chart.push({ label: d.slice(8) + '/' + d.slice(5, 7), v: [x.n, x.u] }); }
    return `<div class="kpis"><div class="kpi o"><small>Visites aujourd'hui</small><b>${sum(1, 'n')}</b><span>${sum(1, 'u')} nouveau(x) visiteur(s)</span></div><div class="kpi"><small>Visites sur 7 jours</small><b>${sum(7, 'n')}</b><span>${sum(7, 'u')} visiteur(s) uniques</span></div><div class="kpi"><small>Visites sur 30 jours</small><b>${sum(30, 'n')}</b><span>${sum(30, 'u')} visiteur(s) uniques</span></div><div class="kpi g"><small>Visites totales du site</small><b>${tot}</b><span>${uni} visiteur(s) uniques</span></div></div>
    <div class="card" style="margin-bottom:20px"><div class="ch"><h3>Visites du site sur 14 jours (barre orange : visites, barre marine : nouveaux visiteurs)</h3></div><div class="cb">${tot ? UI.bars(chart, { h: 150 }) : '<p class="muted small">Aucune visite enregistrée pour le moment. Le compteur démarre avec la page d\'accueil publique, sans connexion requise.</p>'}</div></div>`;
  }

  /* ---------- actions ---------- */
  /* Emails et numéros masqués par défaut (étoiles), pour tout le monde. Bouton œil : l'administrateur principal peut afficher
     (puis re-masquer) ; un administrateur invité reçoit « Accès interdit ». Tout se re-masque seul après 30 secondes. */
  const maskEmail = e => { e = String(e || ''); if (!e) return e; const l = e.split('@')[0], t = (e.split('@')[1] || '').split('.').pop(); return (l[0] || '') + '*****@*****' + (t ? '.' + t : ''); };
  const maskPhone = p => String(p || '') ? '** ** ** **' : '';
  const maskName = n => { n = String(n || '').trim(); return n ? n[0] + '*****' : n; };
  /* Prospects (écoles en essai ou expirées) : nom de l'école et du directeur masqués pour tout le monde, comme les emails. */
  const isProspect = s => { const st = SG.status(s); return st === 'trial' || st === 'expired'; };
  const nameOf = s => isProspect(s) ? mkCell('n', s, s.name, maskName) : esc(s.name);
  const dirOf = s => isProspect(s) ? mkCell('d', s, s.director, maskName) : esc(s.director);
  const plainName = s => SG.isAdmin() || !isProspect(s) ? s.name : maskName(s.name);
  const MK = { shown: new Set(), vals: {}, timer: null };
  const eyeBtn = (k, on) => `<button type="button" data-a="reveal" data-id="${k}" title="${on ? 'Masquer' : 'Afficher'}" aria-label="${on ? 'Masquer' : 'Afficher'}" style="background:none;border:0;padding:0 0 0 6px;color:var(--mute);cursor:pointer;vertical-align:middle">${ic(on ? 'eyeoff' : 'eye', 15)}</button>`;
  const mkCell = (kind, s, val, fn) => { if (!val) return ''; const k = kind + ':' + s.id; MK.vals[k] = [val, fn]; const on = SG.isAdmin() && MK.shown.has(k); return `<span data-mk="${k}">${esc(on ? val : fn(val))}</span>${eyeBtn(k, on)}`; };
  const cEmail = s => mkCell('e', s, s.email, maskEmail);
  const cPhone = s => mkCell('p', s, s.phone, maskPhone);
  const paintMasks = () => document.querySelectorAll('[data-mk]').forEach(sp => { const k = sp.dataset.mk, v = MK.vals[k]; if (!v) return; const on = MK.shown.has(k); sp.textContent = on ? v[0] : v[1](v[0]); const b = sp.nextElementSibling; if (b && b.dataset.a === 'reveal') b.innerHTML = ic(on ? 'eyeoff' : 'eye', 15); });
  const A = {};
  const run = async (fn, okMsg) => { try { await fn(); await load('schools'); if (okMsg) UI.toast(okMsg, 'ok'); render(); } catch (e) { UI.toast(SG.errMsg(e), 'err'); } };
  const byId = id => DATA.schools.find(s => s.id === id);
  A.view = id => { window.open('app.html?view=' + encodeURIComponent(id), '_blank'); SG.log('Consultation de l\'école ' + byId(id).name); };
  A.ban = id => { const s = byId(id); UI.confirm(`Bannir <b>${esc(s.name)}</b> ? L'école et les parents ne pourront plus se connecter.`, () => run(async () => { await SG.updateSchool(id, { banned: true }); SG.log('Bannissement : ' + s.name); }, 'École bannie.'), { danger: true, yes: 'Bannir' }); };
  A.unban = id => run(async () => { await SG.updateSchool(id, { banned: false }); SG.log('Débannissement : ' + byId(id).name); }, 'École débannie.');
  A.block = id => { const s = byId(id); UI.confirm(`Bloquer l'accès de <b>${esc(s.name)}</b> ? Vous pourrez le débloquer à tout moment.`, () => run(async () => { await SG.updateSchool(id, { blocked: true }); SG.log('Blocage : ' + s.name); }, 'École bloquée.'), { danger: true, yes: 'Bloquer' }); };
  A.unblock = id => run(async () => { await SG.updateSchool(id, { blocked: false }); SG.log('Déblocage : ' + byId(id).name); }, 'École débloquée.');
  A.cancelTrial = id => { const s = byId(id); UI.confirm(`Annuler l'essai gratuit de <b>${esc(s.name)}</b> ? L'accès sera bloqué jusqu'au paiement.`, () => run(async () => { await SG.updateSchool(id, { trialCancelled: true }); SG.log('Essai annulé : ' + s.name); }, 'Essai annulé.'), { danger: true, yes: 'Annuler l\'essai' }); };
  A.extend = id => UI.formModal({ title: 'Prolonger l\'essai', size: 'sm', fields: [{ name: 'days', label: 'Jours à ajouter', type: 'number', min: 1, def: 7 }], onSubmit: v => { const s = byId(id); const base = s.trialEnd && new Date(s.trialEnd) > Date.now() ? new Date(s.trialEnd) : new Date(); run(async () => { await SG.updateSchool(id, { trialEnd: new Date(base.getTime() + (+v.days) * 864e5).toISOString(), trialCancelled: false }); SG.log('Essai prolongé : ' + s.name); }, 'Essai prolongé.'); } });
  A.pay = id => {
    const g = SG.global(); const s = byId(id);
    UI.formModal({
      title: 'Enregistrer un paiement : ' + esc(s.name), fields: [{ name: 'plan', label: 'Formule', type: 'select', options: g.plans.map(p => [p.id, p.name + ' · ' + SG.planPrice(p)]) }, { name: 'amount', label: 'Montant reçu (FCFA)', type: 'number', min: 0, def: g.plans[0].price == null ? '' : g.plans[0].price, cls: 'half' }, { name: 'months', label: 'Durée (mois)', type: 'number', min: 1, def: g.plans[0].months, cls: 'half' }, { name: 'method', label: 'Mode de paiement', type: 'select', options: ['Orange Money', 'Moov Money', 'Espèces', 'Virement', 'Autre'], cls: 'half' }, { name: 'ref', label: 'Référence', cls: 'half' }, { name: 'note', label: 'Note' }],
      submit: 'Enregistrer et activer', onSubmit: v => { const p = g.plans.find(x => x.id === v.plan); run(async () => { await SG.recordSub(id, { plan: p ? p.name : 'Abonnement', amount: v.amount, months: +v.months || 1, method: v.method, ref: v.ref, note: v.note }); await load('subs'); }, 'Abonnement activé.'); },
      after: el => { const f = el.querySelector('form'); f.querySelector('[name=plan]').addEventListener('change', e => { const p = g.plans.find(x => x.id === e.target.value); if (p) { f.querySelector('[name=amount]').value = p.price == null ? '' : p.price; f.querySelector('[name=months]').value = p.months; } }); }
    });
  };
  A.edit = id => {
    const s = byId(id);
    UI.formModal({
      title: 'Modifier : ' + esc(s.name), size: 'lg', fields: [{ name: 'name', label: 'École', req: true, cls: 'half' }, { name: 'director', label: 'Directeur', cls: 'half' }, { name: 'phone', label: 'Téléphone', cls: 'half' }, { name: 'city', label: 'Ville', cls: 'half' }, { name: 'plan', label: 'Formule affichée', cls: 'half' }, { name: 'trialEnd', label: 'Fin de l\'essai', type: 'date', def: (s.trialEnd || '').slice(0, 10), cls: 'half' }, { name: 'paidUntil', label: 'Abonnement jusqu\'au', type: 'date', def: (s.paidUntil || '').slice(0, 10), cls: 'half', hint: 'Videz pour retirer l\'abonnement.' }, { name: 'notes', label: 'Notes internes', type: 'textarea', rows: 3 }], values: s,
      onSubmit: v => run(async () => { await SG.updateSchool(id, { name: v.name, director: v.director, phone: v.phone, city: v.city, plan: v.plan, notes: v.notes, trialEnd: v.trialEnd ? new Date(v.trialEnd + 'T23:59:00').toISOString() : s.trialEnd, paidUntil: v.paidUntil ? new Date(v.paidUntil + 'T23:59:00').toISOString() : null }); SG.log('Modification : ' + v.name); }, 'École modifiée.')
    });
  };
  A.reset = id => { const s = byId(id); UI.confirm(`Envoyer un email de réinitialisation du mot de passe à <b>${esc(maskEmail(s.email))}</b> ?`, () => SG.resetPassword(s.email).then(() => UI.toast('Email envoyé.', 'ok')).catch(e => UI.toast(SG.errMsg(e), 'err')), { yes: 'Envoyer' }); };
  A.detail = id => {
    const s = byId(id), st = SG.status(s), subs = DATA.subs.filter(x => x.schoolId === id), k = s.stats || {};
    UI.modal({
      title: nameOf(s), size: 'lg', body: `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">${badge(SG.STATUS[st][0], SG.STATUS[st][1])}<span class="code">Code ${esc(s.code)}</span>${badge(esc(s.plan), 'info')}</div>
      <div class="g2"><dl class="kv"><dt>Directeur</dt><dd>${dirOf(s)}</dd><dt>Email</dt><dd>${cEmail(s)}</dd><dt>Téléphone</dt><dd>${cPhone(s)}</dd><dt>Ville</dt><dd>${esc(s.city || '—')}</dd><dt>Inscrit le</dt><dd>${fdate(s.createdAt)}</dd><dt>Fin d'essai</dt><dd>${fdate(s.trialEnd)}</dd><dt>Abonné jusqu'au</dt><dd>${fdate(s.paidUntil) || '—'}</dd></dl>
      <dl class="kv"><dt>Élèves</dt><dd>${k.students || 0}</dd><dt>Classes</dt><dd>${k.classes || 0}</dd><dt>Professeurs</dt><dd>${k.teachers || 0}</dd><dt>Encaissé par l'école</dt><dd>${money(k.revenue || 0)}</dd><dt>Notes internes</dt><dd>${esc(s.notes || '—')}</dd></dl></div>
      <h4 style="margin:18px 0 8px;font-size:16px">Abonnements payés</h4>${subs.length ? `<div class="tw"><table class="tbl"><tbody>${subs.map(x => `<tr><td>${fdate(x.date)}</td><td>${esc(x.plan)} · ${x.months} mois</td><td>${esc(x.method)}</td><td class="r"><b>${money(x.amount)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Aucun paiement.</p>'}`
    });
  };
  A.refund = id => { const x = DATA.subs.find(q => q.id === id); UI.confirm(`Annuler le paiement de ${money(x.amount)} de <b>${esc(x.schoolName)}</b> ? L'abonnement sera ramené à sa date précédente.`, () => run(async () => { await SG.refundSub(x); await load('subs'); }, 'Paiement annulé.'), { danger: true, yes: 'Annuler le paiement' }); };

  /* ---------- prospects et parrainages ---------- */
  const DAY = 864e5;
  function prospects() {
    const g = SG.global(), out = [];
    DATA.schools.forEach(s => {
      const st = SG.status(s); if (st === 'active' || st === 'banned' || st === 'blocked') return;
      const k = s.stats || {}, age = (Date.now() - new Date(s.createdAt || Date.now())) / DAY, left = SG.daysLeft(s);
      let why = '', pr = 0;
      if (st === 'expired') { why = 'Essai terminé, pas abonné'; pr = 3; }
      else if (left <= 2) { why = 'Essai bientôt terminé (' + Math.max(left, 0) + ' j)'; pr = 2; }
      else if (!(k.students > 0) && age >= 3) { why = 'Aucun élève ajouté depuis ' + Math.floor(age) + ' jours'; pr = 1; }
      if (why) out.push({ s, why, pr, st });
    });
    return out.sort((a, b) => b.pr - a.pr);
  }
  const waMsg = (p) => { const g = SG.global(), s = p.s; return p.st === 'expired'
    ? `Bonjour ${s.director}, c'est ${'Boulka'} de School-G. Votre essai gratuit pour ${s.name} est terminé. Avez-vous eu le temps de tester ? Je peux vous aider à vous abonner et à garder toutes vos données.`
    : p.pr === 2 ? `Bonjour ${s.director}, c'est Boulka de School-G. Votre essai gratuit pour ${s.name} se termine bientôt. Souhaitez-vous qu'on fasse le point ensemble pour continuer sans interruption ?`
    : `Bonjour ${s.director}, c'est Boulka de School-G. J'ai vu que vous avez créé le compte de ${s.name}. Avez-vous besoin d'aide pour ajouter vos élèves et démarrer ? Je suis disponible pour vous guider.`; };
  A.wa = id => { const s = byId(id); SG.updateSchool(id, { crm: Object.assign({}, s.crm, { last: Date.now(), n: ((s.crm || {}).n || 0) + 1 }) }).then(() => { SG.log('Relance WhatsApp : ' + s.name); }).catch(() => { }); };
  A.note = id => { const s = byId(id), c = s.crm || {}; UI.formModal({ title: 'Suivi : ' + esc(s.name), size: 'sm', fields: [{ name: 'note', label: 'Note de suivi', type: 'textarea', rows: 3, def: c.note || '' }], submit: 'Enregistrer', onSubmit: v => run(async () => { await SG.updateSchool(id, { crm: Object.assign({}, c, { note: v.note.trim(), last: c.last || Date.now() }) }); }, 'Suivi enregistré.') }); };
  A.grant = id => { const r = DATA.refs.find(x => x.id === id), p = DATA.schools.find(x => x.code === r.code); if (!p) return UI.toast('École marraine introuvable.', 'err');
    UI.confirm(`Offrir <b>1 mois</b> à <b>${esc(p.name)}</b> pour avoir parrainé <b>${esc(r.name)}</b> ?`, () => run(async () => { await SG.grantReferral(r.id, p); SG.log('Parrainage : 1 mois offert à ' + p.name); await load('refs'); }, '1 mois offert au parrain.'), { yes: 'Offrir 1 mois' }); };
  function prospectsBody() {
    const P = prospects();
    const sub = s => SG.status(s) === 'active';
    const R = DATA.refs.map(r => { const filleul = DATA.schools.find(x => x.id === r.id), marraine = DATA.schools.find(x => x.code === r.code); return { r, filleul, marraine }; });
    return `<div class="card" style="margin-bottom:20px"><div class="ch"><h3>Prospects à relancer (${P.length})</h3></div><div class="tw">${P.length ? `<table class="tbl"><thead><tr><th>École</th><th>Raison</th><th>Dernier suivi</th><th></th></tr></thead><tbody>${P.map(p => { const c = p.s.crm || {}; return `<tr><td><b>${nameOf(p.s)}</b><br><small class="muted">${dirOf(p.s)} · ${cPhone(p.s)}</small></td><td>${badge(esc(p.why), p.pr === 3 ? 'bad' : p.pr === 2 ? 'warn' : 'info')}</td><td>${c.last ? fdate(new Date(c.last).toISOString()) + ' · ' + (c.n || 1) + ' relance(s)' : '<span class="muted">Jamais contactée</span>'}${c.note ? '<br><small class="muted">' + esc(c.note) + '</small>' : ''}</td><td><div class="acts"><a class="btn btn-primary btn-sm" target="_blank" rel="noopener" data-a="wa" data-id="${p.s.id}" href="${SG.isAdmin() ? SG.waLink(p.s.phone, waMsg(p)) : '#'}">Relancer sur WhatsApp</a><button class="btn btn-ghost btn-sm" data-a="note" data-id="${p.s.id}">Note</button></div></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty"><h4>Aucun prospect à relancer</h4><p>Les écoles inactives ou en fin d\'essai apparaîtront ici.</p></div>'}</div></div>
    <div class="card"><div class="ch"><h3>Parrainages (${R.length})</h3></div><div class="tw">${R.length ? `<table class="tbl"><thead><tr><th>Filleule</th><th>Marraine</th><th>Statut du filleul</th><th></th></tr></thead><tbody>${R.map(({ r, filleul, marraine }) => `<tr><td><b>${filleul ? nameOf(filleul) : esc(SG.isAdmin() ? r.name : maskName(r.name))}</b><br><small class="muted">${fdate(new Date(r.createdAtMs).toISOString())}</small></td><td>${marraine ? nameOf(marraine) : '<span class="muted">Code ' + esc(r.code) + '</span>'}</td><td>${filleul ? badge(SG.STATUS[SG.status(filleul)][0], SG.STATUS[SG.status(filleul)][1]) : ''}</td><td>${r.rewarded ? badge('1 mois offert', 'ok') : filleul && marraine ? `<button class="btn btn-primary btn-sm" data-a="grant" data-id="${r.id}">Offrir 1 mois au parrain</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><h4>Aucun parrainage</h4></div>'}</div></div>`;
  }

  /* ---------- administrateurs invités (lecture seule) ---------- */
  const adminUrl = () => location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + 'admin.html';
  const effPerm = (x, k) => { const m = x.perms || {}, d = SG._defaults || {}; return k in m ? m[k] === true : (k in d ? d[k] === true : true); };
  const permBadge = x => { const n = SG.PERMS.filter(([k]) => !effPerm(x, k)).length; return n ? badge(n + ' accès refusé(s)', 'warn') : badge('Tous les accès', 'ok'); };
  function permsDefaultCard() {
    const d = SG._defaults || {};
    return `<div class="card" style="margin-bottom:16px"><div class="ch"><h3>Accès de tous les administrateurs invités</h3></div><div class="cb"><p class="muted small" style="margin-bottom:12px">Cochez ce que vos administrateurs invités peuvent consulter. Ce réglage s'applique à tous, sauf à ceux pour qui vous avez réglé un accès particulier avec le bouton « Accès » de leur ligne.</p>
      <form id="f-pdef" class="frm" novalidate>${SG.PERMS.map(([k, l]) => `<label style="display:flex;gap:10px;align-items:center;padding:7px 0;cursor:pointer"><input type="checkbox" name="${k}" ${k in d ? (d[k] === true ? 'checked' : '') : 'checked'}> <span>${l}</span></label>`).join('')}
      <div style="margin-top:12px"><button class="btn btn-primary" type="button" data-a="saveDef">Enregistrer les accès généraux</button></div></form></div></div>`;
  }
  A.saveDef = async () => { const f = $('f-pdef'), p = {}; SG.PERMS.forEach(([k]) => { p[k] = !!f.elements[k].checked; }); try { await SG.setDefaultPerms(p); SG._defaults = p; SG.log('Accès généraux des administrateurs modifiés'); UI.toast('Accès généraux enregistrés.', 'ok'); render(); } catch (e) { UI.toast(SG.errMsg(e), 'err'); } };
  A.permAdm = email => {
    const x = DATA.admins.find(a => a.email === email); if (!x) return; const m = x.perms || {}, d = SG._defaults || {};
    const dl = k => (k in d ? d[k] === true : true) ? 'autorisé' : 'refusé';
    const md = UI.modal({ title: 'Accès de ' + esc(x.name || x.email), size: 'sm', body: `<p class="muted small" style="margin-bottom:12px">Pour chaque section, choisissez : suivre le réglage général, autoriser ou refuser pour cette personne seulement.</p><form id="f-padm" class="frm" novalidate>${SG.PERMS.map(([k, l]) => `<div class="fld"><label>${l}</label><select name="${k}"><option value="">Selon le réglage général (${dl(k)})</option><option value="1" ${m[k] === true ? 'selected' : ''}>Autorisé</option><option value="0" ${m[k] === false ? 'selected' : ''}>Refusé</option></select></div>`).join('')}<div class="fld"><button class="btn btn-primary" type="submit">Enregistrer</button></div></form>` });
    const f = md.el.querySelector('#f-padm'); f.onsubmit = async ev => { ev.preventDefault(); const p = {}; SG.PERMS.forEach(([k]) => { const v = f.elements[k].value; if (v !== '') p[k] = v === '1'; }); try { await SG.setAdminPerms(email, p); x.perms = p; SG.log('Accès modifiés : ' + email); md.close(); UI.toast('Accès enregistrés.', 'ok'); render(); } catch (e) { UI.toast(SG.errMsg(e), 'err'); } };
  };
  function adminsBody() {
    return `<div class="card" style="margin-bottom:16px"><div class="ch"><h3>Inviter un administrateur</h3></div><div class="cb"><p class="muted small" style="margin-bottom:14px">Un administrateur invité peut seulement consulter : écoles, paiements, prospects, journal, et ouvrir l'espace d'une école en lecture seule. Il ne peut rien modifier, ni bannir, ni bloquer, ni encaisser, ni changer le site.</p>
      <form class="frm" id="f-adm" novalidate><div class="fld half"><label>Nom</label><input type="text" name="name" placeholder="Ex : Léo"></div><div class="fld half"><label>Email (Gmail de préférence)</label><input type="email" name="email" placeholder="leo@gmail.com" required></div><div class="fld"><button class="btn btn-primary" data-a="addAdmin" type="button">Ajouter cet administrateur</button></div></form></div></div>
      ${permsDefaultCard()}
      <div class="card"><div class="ch"><h3>Administrateurs (${DATA.admins.length + 1})</h3></div><div class="cb"><div class="row"><span><b>${esc(SG_CONFIG.adminEmail)}</b> <small class="muted">· administrateur principal</small></span>${badge('Tous les droits', 'ok')}</div>
      ${DATA.admins.map(x => `<div class="row" style="gap:10px;flex-wrap:wrap"><span><b>${esc(x.name || x.email)}</b> <small class="muted">· ${esc(x.email)}</small></span><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${badge('Lecture seule', 'info')}${permBadge(x)}<button class="btn btn-ghost btn-sm" data-a="permAdm" data-id="${esc(x.email)}">Accès</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${SG.waLink('', 'Bonjour' + (x.name ? ' ' + x.name : '') + ', je t\'ai ajouté comme administrateur (lecture seule) de School-G. Ouvre ' + adminUrl() + ' et connecte-toi avec Google avec l\'adresse ' + x.email + '.')}">Envoyer l'invitation</a><button class="btn btn-ghost btn-sm" data-a="delAdmin" data-id="${esc(x.email)}">Retirer</button></span></div>`).join('') || '<p class="muted small" style="margin-top:10px">Aucun administrateur invité pour le moment.</p>'}
      <p class="small muted" style="margin-top:14px">La personne ouvre <span class="code">${esc(adminUrl())}</span> et se connecte avec Google, avec exactement l'email indiqué ci-dessus. Elle n'a pas besoin des codes d'accès.</p></div></div>`;
  }
  A.addAdmin = async () => { const v = UI.read($('f-adm')); try { await SG.addAdmin(v.email, v.name); DATA.admins = await SG.listAdmins(); SG.log('Administrateur invité : ' + v.email); UI.toast('Administrateur ajouté.', 'ok'); render(); } catch (e) { UI.toast(e.message && !e.code ? e.message : SG.errMsg(e), 'err'); } };
  A.delAdmin = email => UI.confirm(`Retirer l'accès de <b>${esc(email)}</b> ? Il ne pourra plus ouvrir le panel.`, async () => { try { await SG.removeAdmin(email); DATA.admins = await SG.listAdmins(); SG.log('Administrateur retiré : ' + email); UI.toast('Accès retiré.', 'ok'); render(); } catch (e) { UI.toast(SG.errMsg(e), 'err'); } }, { danger: true, yes: 'Retirer' });

  /* ---------- modifier le site en direct (verrouillé par un second code) ---------- */
  function askSiteCode(then) {
    const m = UI.modal({ title: 'Modifier le site en live', size: 'sm', body: `<div style="text-align:center;margin-bottom:12px;color:var(--orange-d)">${ic('lock', 28)}</div><p style="margin-bottom:12px">Cette section est protégée. Saisissez le code à 4 chiffres.</p><div id="sce" style="display:none;background:var(--red-s);color:var(--red);padding:10px 12px;border-radius:6px;font-size:14px;margin-bottom:12px"></div><form id="scf" class="frm"><div class="fld"><input type="password" name="c" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="Code" style="text-align:center;letter-spacing:.4em;font-size:20px"></div><div class="fld"><button class="btn btn-navy btn-lg" style="width:100%">Déverrouiller</button></div></form>`, actions: [] });
    const f = m.el.querySelector('#scf'); setTimeout(() => f.c.focus(), 50);
    f.onsubmit = async e => { e.preventDefault(); const r = await SG.checkSiteCode(f.c.value); if (r === true) { m.close(); if (then) return then(); ST.tab = 'site'; render(); await loadSiteTab(); render(); } else { const x = m.el.querySelector('#sce'); x.textContent = r; x.style.display = 'block'; f.c.value = ''; f.c.focus(); } };
  }
  /* ---------- modifier le site en direct ---------- */
  const KIND = { H1: 'Titre principal', H2: 'Titre', H3: 'Sous-titre', H4: 'Sous-titre', P: 'Paragraphe', A: 'Bouton ou lien', BUTTON: 'Bouton', LI: 'Liste', SUMMARY: 'Question', SPAN: 'Texte', B: 'Texte', SMALL: 'Texte', DIV: 'Texte' };
  const flat = h => String(h == null ? '' : h).replace(/\s+/g, ' ').trim();
  async function loadSiteTab() {
    ST.siteErr = '';
    try {
      const r = await fetch('index.html?v=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('Page d\'accueil introuvable.');
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html'); const fields = [], secs = [], defs = {};
      doc.querySelectorAll('[data-secid]').forEach(sec => { secs.push({ id: sec.dataset.secid, name: sec.dataset.sec || sec.dataset.secid }); });
      doc.querySelectorAll('[data-ed]').forEach(el => { const sec = el.closest('[data-secid]'); const f = { key: el.dataset.ed, def: flat(el.innerHTML), tag: el.tagName, sid: sec ? sec.dataset.secid : '' }; defs[f.key] = f.def; fields.push(f); });
      const md = doc.querySelector('meta[name=description]'); defs['meta-title'] = flat(doc.title); defs['meta-desc'] = flat(md ? md.getAttribute('content') : '');
      ST.site = { fields, secs, defs }; ST.siteCur = await SG.loadSite();
    } catch (e) { ST.siteErr = e.message || 'Chargement impossible.'; }
  }
  function siteBody() {
    const g = SG.global(), S = ST.site, cur = ST.siteCur || { texts: {}, hidden: {} };
    if (ST.siteErr) return `<div class="card"><div class="cb"><p>${esc(ST.siteErr)}</p></div></div>`;
    if (!S) return `<div class="card"><div class="cb"><p class="muted">Chargement du contenu du site…</p></div></div>`;
    const val = k => cur.texts[k] != null && String(cur.texts[k]).trim() !== '' ? cur.texts[k] : S.defs[k];
    const field = (k, label, big) => `<div class="fld" style="margin-bottom:12px"><label style="display:flex;justify-content:space-between;gap:8px"><span>${esc(label)}</span><button type="button" class="btn-link" data-a="siteReset" data-id="${esc(k)}" style="background:none;border:0;color:var(--orange-d);font-size:12.5px;padding:0">Rétablir</button></label><textarea data-k="${esc(k)}" rows="${big || Math.min(6, Math.max(1, Math.ceil(String(val(k)).length / 70)))}" placeholder="${esc(S.defs[k])}">${esc(val(k))}</textarea></div>`;
    const grp = S.secs.map(sec => { const fs = S.fields.filter(f => f.sid === sec.id); if (!fs.length) return ''; const fixed = sec.id === 'nav' || sec.id === 'footer';
      return `<details class="card" style="margin-bottom:12px"><summary class="ch" style="cursor:pointer;list-style:none"><h3>${esc(sec.name)}</h3><small class="muted">${fs.length} texte(s)</small></summary><div class="cb">${fixed ? '' : `<label class="chk" style="margin-bottom:14px"><input type="checkbox" data-h="${esc(sec.id)}" ${cur.hidden[sec.id] ? '' : 'checked'}><span>Afficher cette section sur le site</span></label>`}${fs.map(f => field(f.key, (KIND[f.tag] || 'Texte') + ' · ' + f.key)).join('')}</div></details>`; }).join('');
    const plans = g.plans.map(p => `<div class="row"><span>${esc(p.name)}</span><b>${esc(SG.planPrice(p))}${SG.planOnRequest(p) ? '' : ' / ' + (p.months >= 600 ? 'paiement unique' : p.months + ' mois')}</b></div>`).join('');
    const inp = (n, l, v, o = {}) => `<div class="fld ${o.cls || ''}"><label>${l}</label><input type="${o.type || 'text'}" name="${n}" value="${esc(v == null ? '' : v)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}></div>`;
    const planForm = g.plans.map((p, i) => `<div style="border:1px solid var(--line2);border-radius:8px;padding:14px;margin-bottom:12px"><b style="display:block;margin-bottom:10px">Formule ${i + 1}${SG.planOnRequest(p) ? ' (sur demande)' : ''}</b><div class="frm">${inp('n' + i, 'Nom', p.name, { cls: 'half' })}${inp('p' + i, 'Prix en FCFA (vide = sur demande)', p.price, { cls: 'half', type: 'number', ph: 'Sur demande' })}${inp('m' + i, 'Durée en mois (1200 = à vie)', p.months, { cls: 'half', type: 'number' })}${inp('d' + i, 'Description affichée sous le prix', p.desc || '', { cls: 'half' })}</div></div>`).join('');
    return `<div class="card" style="margin-bottom:12px"><div class="ch"><h3>Tarifs, essai et contacts</h3><button class="btn btn-primary btn-sm" data-a="savePlans">Enregistrer les tarifs</button></div><div class="cb" id="planbox"><div class="frm" style="margin-bottom:12px">${inp('trialDays', 'Durée de l\'essai (jours)', g.trialDays, { cls: 'third', type: 'number' })}${inp('contactWa', 'WhatsApp de contact', g.contactWa, { cls: 'third' })}${inp('contactMail', 'Email de contact', g.contactMail, { cls: 'third' })}</div>${planForm}<div class="fld"><label>Avantages affichés sous chaque tarif (un par ligne)</label><textarea name="feats" rows="5">${esc((g.planFeats && g.planFeats.length ? g.planFeats : DEFAULT_FEATS).join('\n'))}</textarea></div></div></div>
    <details class="card" style="margin-bottom:12px"><summary class="ch" style="cursor:pointer;list-style:none"><h3>Titre de l'onglet et description Google</h3></summary><div class="cb">${field('meta-title', 'Titre affiché dans l\'onglet du navigateur')}${field('meta-desc', 'Description pour Google', 3)}</div></details>
    <p class="muted small" style="margin:14px 0 10px">Cliquez sur une section pour modifier ses textes. Vous pouvez garder <span class="code">&lt;em&gt;mot&lt;/em&gt;</span> ou <span class="code">&lt;b&gt;mot&lt;/b&gt;</span> pour mettre un mot en valeur. Après « Publier », le site change tout de suite, sans rechargement.</p>
    ${grp}
    <div style="position:sticky;bottom:0;background:var(--bg,#fff);padding:12px 0;display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line2)"><button class="btn btn-primary btn-lg" data-a="sitePublish">Publier les modifications</button><a class="btn btn-ghost btn-lg" href="index.html" target="_blank" rel="noopener">Voir le site</a></div>`;
  }
  A.siteReset = k => { const t = document.querySelector('textarea[data-k="' + k + '"]'); if (t && ST.site) t.value = ST.site.defs[k] || ''; };
  A.unlockSite = () => askSiteCode();
  A.savePlans = async () => {
    if (!SG.siteCodeOk()) return askSiteCode();
    const g = SG.global(), box = $('planbox'); if (!box) return; const v = n => { const e = box.querySelector('[name="' + n + '"]'); return e ? e.value : ''; };
    const plans = g.plans.map((p, i) => ({ ...p, name: v('n' + i).trim() || p.name, price: v('p' + i).trim() === '' ? null : +v('p' + i), months: +v('m' + i) || 1, desc: v('d' + i).trim() }));
    try { await SG.setGlobal({ trialDays: +v('trialDays') || 7, contactWa: v('contactWa').trim(), contactMail: v('contactMail').trim(), plans, planFeats: v('feats').split('\n').map(x => x.trim()).filter(Boolean) }); SG.log('Tarifs modifiés'); UI.toast('Tarifs enregistrés : le site est à jour.', 'ok'); } catch (e) { UI.toast(SG.errMsg(e), 'err'); }
  };
  A.sitePublish = async () => {
    if (!SG.siteCodeOk()) return askSiteCode();
    const S = ST.site; if (!S) return; const texts = {}, hidden = {};
    document.querySelectorAll('textarea[data-k]').forEach(t => { const v = t.value.trim(); if (v && flat(v) !== S.defs[t.dataset.k]) texts[t.dataset.k] = v; });
    document.querySelectorAll('input[data-h]').forEach(c => { if (!c.checked) hidden[c.dataset.h] = true; });
    try { await SG.saveSite({ texts, hidden }); ST.siteCur = { texts, hidden }; SG.log('Site modifié (' + Object.keys(texts).length + ' texte(s))'); UI.toast('Site mis à jour : les visiteurs le voient déjà.', 'ok'); } catch (e) { UI.toast(SG.errMsg(e), 'err'); }
  };

  A.reveal = k => {
    if (MK.shown.has(k)) MK.shown.delete(k); else MK.shown.add(k);
    paintMasks(); clearTimeout(MK.timer); if (MK.shown.size) MK.timer = setTimeout(() => { MK.shown.clear(); paintMasks(); }, 30000);
  };
  A.sendMsg = async () => {
    const f = $('f-msg'), v = UI.read(f); if (!v.title.trim() || !v.body.trim()) return UI.toast('Renseignez le titre et le message.', 'err');
    const sc = v.target === 'all' ? null : byId(v.target);
    UI.confirm(v.target === 'all' ? `Envoyer ce message à <b>toutes les écoles</b> (${DATA.schools.length}) ?` : `Envoyer ce message à <b>${esc(sc ? sc.name : '')}</b> ?`, async () => {
      try { await SG.sendMessage({ target: v.target, targetName: sc ? sc.name : '', title: v.title, body: v.body }); await load('msgs'); render(); UI.toast('Message envoyé.', 'ok'); } catch (x) { UI.toast(SG.errMsg(x), 'err'); }
    }, { yes: 'Envoyer' });
  };
  A.delMsg = id => UI.confirm('Supprimer ce message ? Il disparaîtra aussi chez les écoles.', async () => { try { await SG.deleteMessage(id); await load('msgs'); render(); UI.toast('Message supprimé.', 'ok'); } catch (x) { UI.toast(SG.errMsg(x), 'err'); } }, { danger: true, yes: 'Supprimer' });

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a;
    if (!SG.isAdmin() && (!RO_OK.has(a) || (a === 'tab' && RO_TABS.has(el.dataset.id)))) { e.preventDefault(); return UI.toast('Accès interdit par l\'administrateur.', 'err'); }
    if (a === 'tab' && denied(el.dataset.id)) { e.preventDefault(); return UI.toast('Accès interdit par l\'administrateur.', 'err'); }
    if (a === 'view' && !SG.isAdmin() && (!SG.can('view') || isProspect(byId(el.dataset.id) || {}))) { e.preventDefault(); return UI.toast('Accès interdit par l\'administrateur.', 'err'); }
    if (a === 'tab') { e.preventDefault(); if (ST.tab === 'site' && el.dataset.id !== 'site') SG.siteCodeClear(); if (el.dataset.id === 'site' && !SG.siteCodeOk()) return askSiteCode(); ST.tab = el.dataset.id; if (ST.tab === 'logs') await load('logs'); if (ST.tab === 'an') { ST.tab = 'an'; render(); await load('an'); } if (ST.tab === 'settings') await load('msgs'); if (ST.tab === 'admins') { DATA.admins = await SG.listAdmins().catch(() => []); } if (ST.tab === 'site') { render(); await loadSiteTab(); } render(); return; }
    if (a === 'logout') { e.preventDefault(); await SG.logout(); loginView(); return; }
    if (a === 'csv') return exportCsv();
    if (a === 'plans') return SG.siteCodeOk() ? plansModal() : askSiteCode(plansModal);
    if (a === 'announce') return announceModal();
    if (a === 'anref') { UI.toast('Actualisation…', 'ok'); await load('an'); render(); return; }
    if (a === 'anper') { ST.anDays = +el.dataset.id; render(); return; }
    if (a === 'refresh') { await load(); render(); return; }
    const f = A[a]; if (f) f(el.dataset.id);
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { ST.q = e.target.value; drawList(); } });
  document.addEventListener('change', e => { if (e.target.id === 'f') { ST.f = e.target.value; drawList(); } });

  const DEFAULT_FEATS = ['Tous les modules inclus', 'Élèves et professeurs illimités', 'Espace parents inclus', 'Mises à jour incluses', 'Assistance par WhatsApp'];
  function plansModal() {
    const g = SG.global(); const plans = g.plans.map(p => ({ ...p }));
    UI.formModal({
      title: 'Tarifs et paramètres', size: 'lg', fields: [{ name: 'trialDays', label: 'Durée de l\'essai (jours)', type: 'number', min: 1, def: g.trialDays, cls: 'half' }, { name: 'contactWa', label: 'WhatsApp de contact', def: g.contactWa, cls: 'half' }, { name: 'contactMail', label: 'Email de contact', def: g.contactMail }, ...plans.flatMap((p, i) => [{ name: 'n' + i, label: 'Formule ' + (i + 1) + ' : nom', def: p.name, cls: 'third' }, { name: 'p' + i, label: 'Prix (FCFA, vide = sur demande)', type: 'number', def: p.price == null ? '' : p.price, cls: 'third' }, { name: 'm' + i, label: p.months >= 600 ? 'Mois (1200 = à vie)' : 'Mois', type: 'number', def: p.months, cls: 'third' }, { name: 'd' + i, label: 'Description affichée', def: p.desc || '' }]), { name: 'feats', label: 'Avantages affichés sous chaque tarif (un par ligne)', type: 'textarea', rows: 5, def: (g.planFeats && g.planFeats.length ? g.planFeats : DEFAULT_FEATS).join('\n') }],
      onSubmit: v => SG.setGlobal({ trialDays: +v.trialDays || 7, contactWa: v.contactWa, contactMail: v.contactMail, plans: plans.map((p, i) => ({ ...p, name: v['n' + i], price: String(v['p' + i] == null ? '' : v['p' + i]).trim() === '' ? null : +v['p' + i], months: +v['m' + i] || 1, desc: v['d' + i] || '' })), planFeats: String(v.feats || '').split('\n').map(x => x.trim()).filter(Boolean) }).then(() => { UI.toast('Paramètres enregistrés.', 'ok'); render(); }).catch(x => UI.toast(SG.errMsg(x), 'err'))
    });
  }
  function announceModal() { const g = SG.global(); UI.formModal({ title: 'Annonce affichée à toutes les écoles', fields: [{ name: 'a', label: 'Message (vide pour retirer)', type: 'textarea', rows: 3, def: g.announcement }], onSubmit: v => SG.setGlobal({ announcement: v.a.trim() }).then(() => { UI.toast('Annonce mise à jour.', 'ok'); render(); }).catch(x => UI.toast(SG.errMsg(x), 'err')) }); }
  function exportCsv() { UI.csv('ecoles-school-g.csv', [['École', 'Directeur', 'Email', 'Téléphone', 'Ville', 'Statut', 'Formule', 'Inscrit le', 'Fin essai', 'Abonné jusqu\'au', 'Élèves'], ...DATA.schools.map(s => [plainName(s), SG.isAdmin() || !isProspect(s) ? s.director : maskName(s.director), SG.isAdmin() ? s.email : maskEmail(s.email), SG.isAdmin() ? s.phone : maskPhone(s.phone), s.city, SG.STATUS[SG.status(s)][0], s.plan, fdate(s.createdAt), fdate(s.trialEnd), fdate(s.paidUntil), (s.stats && s.stats.students) || 0])]); }

  /* ---------- rendu ---------- */
  function rows() {
    const q = ST.q.toLowerCase().trim();
    return DATA.schools.filter(s => (!ST.f || SG.status(s) === ST.f) && (!q || ((SG.isAdmin() ? s.name + s.email + s.phone + s.director + s.code : (isProspect(s) ? '' : s.name + s.director + s.code))).toLowerCase().includes(q))).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
  function schoolActions(s) {
    const st = SG.status(s); const b = (a, ico, t) => `<button class="btn btn-ghost btn-sm btn-icon" data-a="${a}" data-id="${s.id}" title="${t}" aria-label="${t}">${ic(ico, 16)}</button>`;
    return `<div class="acts">${b('detail', 'eye', 'Détails')}${b('view', 'school', 'Ouvrir l\'espace de l\'école')}<button class="btn btn-primary btn-sm" data-a="pay" data-id="${s.id}">Paiement</button>${b('edit', 'edit', 'Modifier')}${st === 'trial' ? `<button class="btn btn-ghost btn-sm" data-a="cancelTrial" data-id="${s.id}">Annuler l'essai</button>` : ''}${st === 'expired' || st === 'trial' ? `<button class="btn btn-ghost btn-sm" data-a="extend" data-id="${s.id}">Prolonger</button>` : ''}${st === 'banned' ? `<button class="btn btn-ghost btn-sm" data-a="unban" data-id="${s.id}">Débannir</button>` : `<button class="btn btn-danger btn-sm" data-a="ban" data-id="${s.id}">Bannir</button>`}${s.blocked ? `<button class="btn btn-ghost btn-sm" data-a="unblock" data-id="${s.id}">Débloquer</button>` : (st !== 'banned' ? `<button class="btn btn-ghost btn-sm" data-a="block" data-id="${s.id}">Bloquer</button>` : '')}</div>`;
  }
  /* Lecture seule : on retire tous les boutons d'action (hors consultation). */
  function stripRO() {
    if (SG.isAdmin()) return;
    const b = document.querySelector('.main .top .sp'); if (b && !document.getElementById('roTag')) b.insertAdjacentHTML('afterend', '<span id="roTag" style="margin-right:12px">' + badge('Lecture seule', 'info') + '</span>');
  }
  function drawList() {
    const box = $('list'); if (!box) return; const l = rows();
    box.innerHTML = l.length ? `<table class="tbl"><thead><tr><th>École</th><th>Contact</th><th>Statut</th><th>Reste</th><th class="c">Élèves</th><th>Inscrite</th><th></th></tr></thead><tbody>${l.map(s => { const st = SG.status(s); return `<tr><td><b>${nameOf(s)}</b><br><small class="muted">${dirOf(s)} · code ${isProspect(s) && !SG.isAdmin() ? '******' : esc(s.code)}</small></td><td>${cEmail(s)}<br><small class="muted">${cPhone(s)}</small></td><td>${badge(SG.STATUS[st][0], SG.STATUS[st][1])}<br><small class="muted">${esc(s.plan)}</small></td><td>${st === 'trial' || st === 'active' ? SG.daysLeft(s) + ' j' : '—'}</td><td class="c">${(s.stats && s.stats.students) || 0}</td><td>${fdate(s.createdAt)}</td><td>${schoolActions(s)}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty"><h4>Aucune école</h4><p>${DATA.schools.length ? 'Aucun résultat pour ce filtre.' : 'Les écoles inscrites apparaîtront ici.'}</p></div>`;
    stripRO();
  }

  /* ---------- données analytiques ---------- */
  const TZC = { 'Africa/Bamako': 'Mali', 'Africa/Abidjan': 'Côte d\'Ivoire', 'Africa/Dakar': 'Sénégal', 'Africa/Ouagadougou': 'Burkina Faso', 'Africa/Conakry': 'Guinée', 'Africa/Niamey': 'Niger', 'Africa/Lome': 'Togo', 'Africa/Porto-Novo': 'Bénin', 'Africa/Douala': 'Cameroun', 'Africa/Libreville': 'Gabon', 'Africa/Kinshasa': 'RD Congo', 'Africa/Lubumbashi': 'RD Congo', 'Africa/Brazzaville': 'Congo', 'Africa/Algiers': 'Algérie', 'Africa/Tunis': 'Tunisie', 'Africa/Casablanca': 'Maroc', 'Africa/Nouakchott': 'Mauritanie', 'Africa/Ndjamena': 'Tchad', 'Africa/Bangui': 'Centrafrique', 'Africa/Lagos': 'Nigeria', 'Africa/Accra': 'Ghana', 'Africa/Freetown': 'Sierra Leone', 'Africa/Monrovia': 'Libéria', 'Africa/Banjul': 'Gambie', 'Africa/Cairo': 'Égypte', 'Africa/Nairobi': 'Kenya', 'Africa/Johannesburg': 'Afrique du Sud', 'Africa/Antananarivo': 'Madagascar', 'Indian/Antananarivo': 'Madagascar', 'Indian/Mauritius': 'Maurice', 'Europe/Paris': 'France', 'Europe/Brussels': 'Belgique', 'Europe/Zurich': 'Suisse', 'Europe/London': 'Royaume-Uni', 'Europe/Madrid': 'Espagne', 'Europe/Rome': 'Italie', 'Europe/Berlin': 'Allemagne', 'America/Montreal': 'Canada', 'America/Toronto': 'Canada', 'America/New_York': 'États-Unis', 'America/Chicago': 'États-Unis', 'America/Los_Angeles': 'États-Unis', 'Asia/Dubai': 'Émirats', 'Asia/Riyadh': 'Arabie saoudite' };
  const fmtDur = sec => { sec = Math.round(sec || 0); if (sec < 60) return sec + ' s'; const m = Math.floor(sec / 60), r = sec % 60; if (m < 60) return m + ' min' + (r ? ' ' + String(r).padStart(2, '0') + ' s' : ''); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
  function anHtml(dashHtml) {
    const days = ST.anDays || 30, iso = k => { const d = new Date(); d.setUTCDate(d.getUTCDate() - k); return d.toISOString().slice(0, 10); };
    const since = iso(days - 1), L = DATA.sess.filter(x => x.day >= since), n = L.length;
    const per = `<div class="pills" style="margin-bottom:0">${[7, 30, 90].map(d => `<button class="${days === d ? 'on' : ''}" data-a="anper" data-id="${d}">${d} jours</button>`).join('')}</div>`;
    const bar = `<div class="tools" style="justify-content:space-between;align-items:center">${per}<div style="display:flex;gap:12px;align-items:center"><span class="badge ok" id="onl" style="display:inline-flex;gap:6px;align-items:center">${DATA.online.length} en ligne maintenant</span><button class="btn btn-ghost" data-a="anref">${ic('refresh', 16)}Actualiser</button></div></div>`;
    const head = t => `<h3 style="margin:26px 0 12px;font-size:18px">${t}</h3>`;
    if (!n) return bar + `<div class="card"><div class="cb"><p class="muted">Aucune session enregistrée sur cette période. Les données arrivent dès que quelqu'un ouvre le site, sans connexion requise (vos propres appareils, une fois connecté à l'administration, ne sont pas comptés).</p></div></div>` + head('Activité des écoles et revenus') + dashHtml();
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, med = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
    const durs = L.map(x => +x.dur || 0), vis = new Set(L.map(x => x.vid)).size, newN = L.filter(x => !x.ret).length, bounce = L.filter(x => (+x.pages || 1) <= 1 && (+x.dur || 0) < 10).length, tot = durs.reduce((a, b) => a + b, 0);
    const tod = L.filter(x => x.day === iso(0)).length;
    const kp = (l, v, sub, c) => `<div class="kpi ${c || ''}"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const kpis = `<div class="kpis">${kp('Sessions', n, tod + ' aujourd\'hui', 'o')}${kp('Visiteurs uniques', vis, newN + ' nouveau(x) · ' + (n - newN) + ' de retour')}${kp('Temps actif moyen', fmtDur(avg(durs)), 'médiane ' + fmtDur(med(durs)), 'g')}${kp('Temps actif total', fmtDur(tot), '')}</div><div class="kpis">${kp('Pages par session', avg(L.map(x => +x.pages || 1)).toFixed(1), '')}${kp('Taux de rebond', Math.round(bounce / n * 100) + ' %', 'une page, moins de 10 s')}${kp('Visiteurs de retour', Math.round((n - newN) / n * 100) + ' %', '')}${kp('Application installée', Math.round(L.filter(x => x.pwa).length / n * 100) + ' %', 'ouverte depuis l\'écran d\'accueil')}</div>`;
    const dayChart = []; const span = Math.min(days, 30); for (let i = span - 1; i >= 0; i--) { const d = iso(i), ss = L.filter(x => x.day === d); dayChart.push({ label: d.slice(8) + '/' + d.slice(5, 7), v: [ss.length, new Set(ss.map(x => x.vid)).size] }); }
    const hrs = []; for (let h = 0; h < 24; h++) hrs.push({ label: h + 'h', v: [L.filter(x => x.hr === h).length] });
    const dist = (title, fn, o = {}) => { const m = {}; L.forEach(x => { const k = fn(x); if (k == null || k === '') return; m[k] = (m[k] || 0) + 1; }); let e = Object.entries(m).sort((a, b) => b[1] - a[1]); const top = e.slice(0, o.max || 8); const mx = Math.max(1, ...top.map(x => x[1]));
      return `<div class="card"><div class="ch"><h3>${title}</h3></div><div class="cb">${top.length ? top.map(([k, c]) => `<div style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;font-size:13.5px;gap:10px"><span>${esc(k)}</span><b>${c} <small class="muted">· ${Math.round(c / n * 100)} %</small></b></div><div style="height:6px;background:var(--line,#e8e4dc);margin-top:4px"><i style="display:block;height:100%;width:${Math.round(c / mx * 100)}%;background:${o.c || 'var(--orange)'}"></i></div></div>`).join('') : '<p class="muted small">Aucune donnée.</p>'}${e.length > top.length ? `<small class="muted">et ${e.length - top.length} autre(s)</small>` : ''}</div></div>`; };
    const bucket = s => s < 10 ? '1. Moins de 10 s' : s < 30 ? '2. 10 à 30 s' : s < 60 ? '3. 30 s à 1 min' : s < 300 ? '4. 1 à 5 min' : s < 900 ? '5. 5 à 15 min' : '6. Plus de 15 min';
    const durDist = (() => { const m = {}; L.forEach(x => { const k = bucket(+x.dur || 0); m[k] = (m[k] || 0) + 1; }); const e = Object.keys(m).sort(); const mx = Math.max(1, ...Object.values(m)); return `<div class="card"><div class="ch"><h3>Temps passé par session</h3></div><div class="cb">${e.map(k => `<div style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${esc(k.slice(3))}</span><b>${m[k]} <small class="muted">· ${Math.round(m[k] / n * 100)} %</small></b></div><div style="height:6px;background:var(--line,#e8e4dc);margin-top:4px"><i style="display:block;height:100%;width:${Math.round(m[k] / mx * 100)}%;background:var(--navy)"></i></div></div>`).join('')}</div></div>`; })();
    const byDev = (() => { const m = {}; L.forEach(x => { (m[x.dev] = m[x.dev] || []).push(+x.dur || 0); }); return `<div class="card"><div class="ch"><h3>Temps actif moyen par appareil</h3></div><div class="cb">${Object.entries(m).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => `<div class="row"><span>${esc(k)} <small class="muted">· ${a.length} session(s)</small></span><b>${fmtDur(avg(a))}</b></div>`).join('')}</div></div>`; })();
    const fun = [['Page d\'accueil', 's_i'], ['Page de connexion', 's_l'], ['Espace direction', 's_a'], ['Espace parent', 's_p'], ['Espace enseignant', 's_t']].map(([l, f]) => [l, L.filter(x => x[f]).length]);
    const funnel = `<div class="card"><div class="ch"><h3>Pages et espaces visités</h3></div><div class="cb">${fun.map(([l, c]) => `<div style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${l}</span><b>${c} <small class="muted">· ${Math.round(c / n * 100)} % des sessions</small></b></div><div style="height:6px;background:var(--line,#e8e4dc);margin-top:4px"><i style="display:block;height:100%;width:${Math.round(c / n * 100)}%;background:var(--green,#2f8f5b)"></i></div></div>`).join('')}<p class="small muted" style="margin-top:6px">Parcours type : accueil, puis connexion, puis espace direction.</p></div></div>`;
    const rows = L.slice().sort((a, b) => (b.startMs || 0) - (a.startMs || 0)).slice(0, 40);
    const tbl = `<div class="card flat"><div class="ch"><h3>Dernières sessions</h3></div><div class="tw"><table class="tbl"><thead><tr><th>Début</th><th>Appareil</th><th>Système</th><th>Navigateur</th><th>Source</th><th>Pays</th><th>Parcours</th><th class="r">Pages</th><th class="r">Temps actif</th></tr></thead><tbody>${rows.map(x => `<tr><td class="nowrap">${new Date(x.startMs).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${x.ret ? '' : ' ' + badge('Nouveau', 'info')}</td><td>${esc(x.dev || '')}${x.model ? '<br><small class="muted">' + esc(x.model) + '</small>' : ''}</td><td>${esc(x.os || '')}</td><td>${esc(x.br || '')}</td><td>${esc(x.src || '')}</td><td>${esc(TZC[x.tz] || x.tz || '')}</td><td>${esc(x.entry || '')}${x.last && x.last !== x.entry ? ' → ' + esc(x.last) : ''}</td><td class="r">${x.pages || 1}</td><td class="r">${fmtDur(x.dur)}</td></tr>`).join('')}</tbody></table></div></div>`;
    const g2 = (...c) => `<div class="g2" style="margin-bottom:20px">${c.join('')}</div>`;
    return bar + head('Audience du site') + kpis
      + `<div class="g21" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Sessions par jour (orange) et visiteurs uniques (marine)${days > 30 ? ', 30 derniers jours' : ''}</h3></div><div class="cb">${UI.bars(dayChart, { h: 170 })}</div></div><div class="card"><div class="ch"><h3>Heure de visite</h3></div><div class="cb">${UI.bars(hrs, { h: 170 })}</div></div></div>`
      + head('Appareils et technologie') + g2(dist('Appareil', x => x.dev), dist('Système d\'exploitation', x => x.os)) + g2(dist('Navigateur', x => x.br), dist('Résolution d\'écran', x => x.sw, { c: 'var(--navy)' })) + g2(dist('Modèle de téléphone', x => x.model, { c: 'var(--navy)' }), dist('Connexion réseau', x => ({ '4g': '4G', '3g': '3G', '2g': '2G', 'slow-2g': '2G lente' }[x.net] || x.net), { c: 'var(--navy)' }))
      + head('Origine des visiteurs') + g2(dist('Source du trafic', x => x.src), dist('Pays (selon le fuseau horaire)', x => TZC[x.tz] || x.tz, { c: 'var(--navy)' })) + g2(dist('Langue du navigateur', x => (x.lang || '').toLowerCase()), dist('Page d\'entrée', x => x.entry, { c: 'var(--navy)' }))
      + head('Comportement') + g2(durDist, byDev) + g2(funnel, dist('Page de sortie', x => x.last, { c: 'var(--navy)' })) + g2(dist('Nouveaux ou de retour', x => x.ret ? 'De retour' : 'Nouveau visiteur'), dist('Thème de l\'appareil', x => x.dark ? 'Mode sombre' : 'Mode clair', { c: 'var(--navy)' }))
      + head('Sessions récentes') + tbl
      + `<p class="small muted" style="margin:14px 0 0">Données anonymes : aucune adresse IP ni information personnelle. Le temps actif ne compte que les moments où l'onglet est visible et utilisé. Le pays est déduit du fuseau horaire de l'appareil. ${DATA.sess.length >= 4000 ? 'Affichage limité aux 4 000 sessions les plus récentes.' : ''}</p>`
      + head('Activité des écoles et revenus') + dashHtml();
  }

  function render() {
    const S = stats(); const g = SG.global();
    const nav = [['dash', 'Vue d\'ensemble', 'grid'], ['schools', 'Écoles', 'school'], ['prospects', 'Prospects' + (prospects().length ? ' (' + prospects().length + ')' : ''), 'users'], ['an', 'Données analytiques', 'chart'], ['pays', 'Paiements', 'wallet'], ['logs', 'Journal', 'list'], ['site', 'Modifier le site en live', 'edit'], ['admins', 'Administrateurs', 'shield'], ['settings', 'Réglages', 'set']];
    let body = '';
    if (!nav.some(n => n[0] === ST.tab)) ST.tab = 'dash';
    const dashHtml = () => `<div class="kpis"><div class="kpi"><small>Écoles inscrites</small><b>${S.sch.length}</b><span>${S.students} élève(s) au total</span></div><div class="kpi g"><small>Abonnées actives</small><b>${S.by.active}</b><span>Conversion : ${S.conv} %</span></div><div class="kpi o"><small>En essai gratuit</small><b>${S.by.trial}</b><span>${S.by.expired} essai(s) expiré(s)</span></div><div class="kpi r"><small>Bloquées ou bannies</small><b>${S.by.blocked + S.by.banned}</b></div></div>
      <div class="kpis"><div class="kpi g"><small>Revenus du mois</small><b>${money(S.month)}</b></div><div class="kpi"><small>Revenus totaux</small><b>${money(S.total)}</b></div><div class="kpi o"><small>Paiements validés</small><b>${S.subs.length}</b></div><div class="kpi"><small>Prix moyen</small><b>${money(S.subs.length ? S.total / S.subs.length : 0)}</b></div></div>
      ${visitsHtml()}
      <div class="g21" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Inscriptions (barre orange) et revenus en milliers de FCFA (barre marine)</h3></div><div class="cb">${UI.bars(S.chart, { h: 190 })}</div></div>
      <div class="card"><div class="ch"><h3>Répartition</h3></div><div class="cb">${[['Abonnées', S.by.active, 'ok'], ['En essai', S.by.trial, 'info'], ['Expirées', S.by.expired, 'warn'], ['Bloquées', S.by.blocked, 'bad'], ['Bannies', S.by.banned, 'bad']].map(([l, n, k]) => `<div class="row"><span>${l}</span>${badge(n, k)}</div>`).join('')}</div></div></div>
      <div class="card"><div class="ch"><h3>Dernières inscriptions</h3><button class="btn btn-ghost btn-sm" data-a="tab" data-id="schools">Tout voir</button></div><div class="tw">${S.sch.length ? `<table class="tbl"><tbody>${S.sch.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6).map(s => `<tr><td><b>${nameOf(s)}</b><br><small class="muted">${cEmail(s)}</small></td><td>${badge(SG.STATUS[SG.status(s)][0], SG.STATUS[SG.status(s)][1])}</td><td>${fdate(s.createdAt)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><h4>Aucune école pour l\'instant</h4><p>Les inscriptions à l\'essai gratuit apparaîtront ici.</p></div>'}</div></div>`;
    if (denied(ST.tab)) body = `<div class="card"><div class="cb" style="text-align:center;padding:40px 20px"><div style="color:var(--orange-d);margin-bottom:10px">${ic('lock', 30)}</div><h3 style="margin-bottom:6px">Accès interdit par l'administrateur</h3><p class="muted">Cette section ne fait pas partie de vos accès. Choisissez une autre section dans le menu.</p></div></div>`;
    else if (ST.tab === 'dash') body = dashHtml();
    else if (ST.tab === 'an') body = anHtml(dashHtml);
    else if (ST.tab === 'schools') body = `<div class="tools"><div class="sr">${ic('search', 16)}<input type="search" id="q" placeholder="Rechercher une école, email, téléphone, code" value="${esc(ST.q)}"></div><select id="f"><option value="">Tous les statuts</option>${Object.entries(SG.STATUS).map(([k, v]) => `<option value="${k}" ${ST.f === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><button class="btn btn-ghost" data-a="csv">${ic('dl', 16)}Exporter CSV</button><button class="btn btn-ghost" data-a="refresh">${ic('refresh', 16)}Actualiser</button></div><div class="card flat"><div class="tw" id="list"></div></div>`;
    else if (ST.tab === 'prospects') body = prospectsBody();
    else if (ST.tab === 'admins') body = adminsBody();
    else if (ST.tab === 'site') body = SG.siteCodeOk() ? siteBody() : `<div class="card"><div class="cb"><p>Section verrouillée.</p><button class="btn btn-navy" data-a="unlockSite">Saisir le code</button></div></div>`;
    else if (ST.tab === 'pays') { const all = DATA.subs; body = `<div class="card flat"><div class="tw">${all.length ? `<table class="tbl"><thead><tr><th>Date</th><th>École</th><th>Formule</th><th>Mode</th><th class="r">Montant</th><th>État</th><th></th></tr></thead><tbody>${all.map(x => `<tr><td>${fdate(x.date)}</td><td><b>${esc(x.schoolName)}</b></td><td>${esc(x.plan)} · ${x.months} mois</td><td>${esc(x.method)}${x.ref ? '<br><small class="muted">' + esc(x.ref) + '</small>' : ''}</td><td class="r"><b>${money(x.amount)}</b></td><td>${badge(x.status, x.status === 'validé' ? 'ok' : 'bad')}</td><td class="r">${x.status === 'validé' ? `<button class="btn btn-danger btn-sm" data-a="refund" data-id="${x.id}">Annuler</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><h4>Aucun paiement</h4><p>Enregistrez un paiement depuis la liste des écoles.</p></div>'}</div></div>`; }
    else if (ST.tab === 'logs') body = `<div class="card"><div class="cb" style="padding-top:6px;padding-bottom:6px">${DATA.logs.map(x => `<div class="row"><span>${esc(x.m)}</span><small class="muted nowrap">${new Date(x.tMs).toLocaleString('fr-FR')}</small></div>`).join('') || '<div class="empty"><h4>Journal vide</h4></div>'}</div></div>`;
    else body = `<div class="g2"><div class="card"><div class="ch"><h3>Tarifs et essai</h3><button class="btn btn-primary btn-sm" data-a="plans">Modifier</button></div><div class="cb"><div class="row"><span>Durée de l'essai</span><b>${g.trialDays} jours</b></div>${g.plans.map(p => `<div class="row"><span>${esc(p.name)}</span><b>${SG.planPrice(p)}${SG.planOnRequest(p) ? '' : ' / ' + (p.months >= 600 ? 'paiement unique' : p.months + ' mois')}</b></div>`).join('')}<div class="row"><span>WhatsApp</span><b>${esc(g.contactWa)}</b></div></div></div>
      <div class="card"><div class="ch"><h3>Annonce globale</h3><button class="btn btn-primary btn-sm" data-a="announce">Modifier</button></div><div class="cb"><p>${esc(g.announcement) || '<span class="muted">Aucune annonce.</span>'}</p></div></div>
      <div class="card"><div class="ch"><h3>Compte administrateur</h3></div><div class="cb"><dl class="kv"><dt>Connecté</dt><dd>${esc((SG.user && SG.user.email) || '')}</dd></dl><p class="small muted" style="margin-top:10px">Seul l'email défini dans <span class="code">js/config.js</span> et <span class="code">firestore.rules</span> a accès à ce panneau.</p></div></div>
      <div class="card" style="grid-column:1/-1"><div class="ch"><h3>Message aux écoles</h3></div><div class="cb"><form class="frm" id="f-msg" novalidate><div class="fld"><label>Destinataire</label><select name="target"><option value="all">Toutes les écoles (${DATA.schools.length})</option>${DATA.schools.slice().sort((a, b) => a.name.localeCompare(b.name)).map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.city || s.email)}</option>`).join('')}</select></div><div class="fld"><label>Titre</label><input type="text" name="title" maxlength="120" placeholder="Ex : Nouvelle fonctionnalité disponible"></div><div class="fld"><label>Message</label><textarea name="body" rows="4" maxlength="2000" placeholder="Votre message : les directeurs le verront dans leur espace, avec une pastille sur la cloche."></textarea></div><div class="fld"><button class="btn btn-primary" data-a="sendMsg" type="button">Envoyer le message</button></div></form>
      <h4 style="margin:20px 0 6px;font-size:16px">Messages envoyés</h4>${DATA.msgs.length ? DATA.msgs.map(m => `<div class="row" style="align-items:flex-start"><span><b>${esc(m.title)}</b> <small class="muted">· ${m.target === 'all' ? 'Toutes les écoles' : esc(m.targetName || m.target)} · ${new Date(m.createdMs).toLocaleString('fr-FR')}</small><br><small>${esc(m.body)}</small></span><button class="btn btn-ghost btn-sm" data-a="delMsg" data-id="${esc(m.id)}">Supprimer</button></div>`).join('') : '<p class="muted small">Aucun message envoyé.</p>'}</div></div></div>`;
    root.innerHTML = `<div class="shell"><aside class="side" id="side"><div class="side-brand"><div class="lg">G</div><div><b>School-G</b><small>Administration</small></div></div><nav>${nav.map(([k, l, i]) => `<a class="it ${ST.tab === k ? 'on' : ''}" href="#" data-a="tab" data-id="${k}">${ic(i, 18)}<span>${l}</span></a>`).join('')}</nav><div class="side-foot"><a href="#" data-a="logout">${ic('out', 16)}Se déconnecter</a><a href="index.html">${ic('arrow', 16)}Retour au site</a></div></aside><div class="scrim" id="scrim"></div>
      <div class="main"><header class="top"><button class="mb" id="mb" aria-label="Menu">${ic('menu', 24)}</button><div class="tt">${nav.find(n => n[0] === ST.tab)[1].replace(/ \(\d+\)$/, '')}</div><div class="sp"></div><div class="dt">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="av">A</div></header><main id="view">${body}</main></div></div>`;
    const side = $('side'), scrim = $('scrim'); const tog = on => { side.classList.toggle('open', on); scrim.classList.toggle('on', on); };
    $('mb').onclick = () => tog(true); scrim.onclick = () => tog(false); side.addEventListener('click', e => { if (e.target.closest('a.it')) tog(false); });
    drawList(); stripRO();
  }

  function codeView(msg) {
    root.innerHTML = `<div class="lock"><div class="box"><div class="ic">${ic('lock', 28)}</div><h1>Code d'accès</h1><p>Saisissez le code d'accès administrateur pour continuer.</p><div id="cerr" style="display:${msg ? 'block' : 'none'};background:var(--red-s);color:var(--red);padding:10px 12px;border-radius:6px;font-size:14px;margin-bottom:14px">${esc(msg || '')}</div><form id="cf" class="frm"><div class="fld"><input type="password" name="code" autocomplete="off" placeholder="Code d'accès" autofocus></div><div class="fld"><button class="btn btn-navy btn-lg" style="width:100%">Valider</button></div></form><p class="small" style="margin-top:12px"><a href="#" id="cout" class="muted">Se déconnecter</a></p></div></div>`;
    $('cf').onsubmit = async e => { e.preventDefault(); const r = await SG.checkAdminCode($('cf').code.value); if (r === true) return boot(); codeView(r); };
    $('cout').onclick = async e => { e.preventDefault(); await SG.logout(); loginView(); };
  }

  async function boot() {
    const ld = UI.loading(root, { name: 'School-G', sub: 'Administration', msg: 'Vérification de l\'accès…' });
    await SG.ready(); const u = SG.user; ld.set(60, 'Chargement des écoles…');
    if (!u) return loginView();
    await SG.loadRole(); if (SG.isStaff()) { try { localStorage.setItem('sg_nocount', '1'); } catch (e) { } }
    if (!SG.isStaff()) { await SG.logout(); return loginView('Ce compte n\'est pas administrateur.'); }
    if (SG.isAdmin() && !SG.adminCodeOk()) return codeView();
    try { await load(); } catch (e) { return loginView('Lecture impossible : ' + SG.errMsg(e) + ' Vérifiez les règles Firestore et l\'email administrateur.'); }
    render(); liveStart();
  }
  /* Liste des écoles en direct : une nouvelle inscription ou un changement apparaît sans actualiser. */
  let liveOff = null, liveT = null;
  function liveStart() {
    if (liveOff) liveOff();
    liveOff = SG.watchSchools(l => {
      DATA.schools = l; clearTimeout(liveT);
      liveT = setTimeout(() => { if (!$('view') || ST.tab === 'site' || document.querySelector('.ov') || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return; render(); }, 250);
    });
  }
  setInterval(async () => { if (ST.tab !== 'an' || document.hidden) return; try { DATA.online = await SG.onlineNow(); const o = $('onl'); if (o) o.textContent = DATA.online.length + ' en ligne maintenant'; } catch (e) { } }, 30000);
  boot();
})();
