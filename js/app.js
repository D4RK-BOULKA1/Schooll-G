/* School-G : espace directeur, noyau (état, calculs, interface, routeur, tableau de bord) */
(function () {
  'use strict';
  const U = window.UI, SG = window.SG;
  const { esc, money, fdate, ic, uid, today, badge } = U;
  /* D est rempli au démarrage (A.boot) avec les données Firestore de l'école ; sa référence ne change jamais. */
  let school0 = null; const sess = { byAdmin: false };
  const D = {};
  const A = window.APP = { D, U, views: {}, acts: {}, ST: {}, sess };
  A.school = () => school0;
  A.save = () => SG.saveData(school0.id, D);
  A.pin = () => SG.pin();
  const sum = (arr, f) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
  A.sum = sum;

  /* ---------- noyau de calcul ---------- */
  A.cls = id => D.classes.find(c => c.id === id);
  A.stu = id => D.students.find(s => s.id === id);
  A.tch = id => D.teachers.find(t => t.id === id);
  A.name = s => s ? `${s.last.toUpperCase()} ${s.first}` : '—';
  A.active = () => D.students.filter(s => s.status !== 'radié');
  A.classOpts = () => D.classes.map(c => [c.id, c.name]);
  A.initials = s => ((s.first || '?')[0] + (s.last || '')[0]).toUpperCase();
  A.avatar = s => `<div class="av2">${s.photo ? `<img src="${s.photo}" alt="">` : esc(A.initials(s))}</div>`;
  A.tuition = s => { const c = A.cls(s.classId); return Math.max(0, (c ? +c.tuition || 0 : 0) - (+s.discount || 0)); };
  A.paidScol = sid => sum(D.payments.filter(p => p.studentId === sid && p.type === 'Scolarité' && p.status === 'validé'), p => p.amount);
  A.balance = s => Math.max(0, A.tuition(s) - A.paidScol(s.id));
  A.tranches = s => {
    const T = A.tuition(s); let paid = A.paidScol(s.id); const now = today(); const tr = D.settings.tranches; let acc = 0;
    return tr.map((t, i) => {
      let amt = i === tr.length - 1 ? T - acc : Math.round(T * t.pct / 100); acc += amt;
      const p = Math.max(0, Math.min(paid, amt)); paid -= p;
      let st = p >= amt ? 'payée' : (t.due < now ? 'en retard' : (p > 0 ? 'partielle' : 'à venir'));
      return Object.assign({}, t, { amount: amt, paid: p, rest: amt - p, status: st });
    });
  };
  A.late = s => sum(A.tranches(s).filter(t => t.status === 'en retard'), t => t.rest);
  A.scolBadge = s => {
    const T = A.tuition(s); if (!T) return badge('Non défini', '');
    if (A.balance(s) === 0) return badge('Soldé', 'ok');
    return A.late(s) > 0 ? badge('En retard', 'bad') : badge('En cours', 'info');
  };
  A.bar = (v, max, cls) => `<div class="prog ${cls || ''}"><i style="width:${max ? Math.min(100, Math.round(v / max * 100)) : 0}%"></i></div>`;
  A.nextReceipt = () => { D.counters.receipt = (D.counters.receipt || 0) + 1; return 'R-' + new Date().getFullYear() + '-' + String(D.counters.receipt).padStart(4, '0'); };
  A.addPayment = o => { const p = Object.assign({ id: uid(), date: today(), method: 'Espèces', status: 'validé', note: '', month: '' }, o); p.ref = A.nextReceipt(); D.payments.push(p); A.save(); return p; };
  A.head = (title, sub, actions) => `<div class="ph"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="ac">${actions || ''}</div></div>`;
  A.empty = (t, s, btn) => `<div class="empty"><h4>${t}</h4><p>${s || ''}</p>${btn ? `<div style="margin-top:14px">${btn}</div>` : ''}</div>`;
  A.btn = (act, label, o = {}) => `<button class="btn ${o.cls || 'btn-ghost'} ${o.sm ? 'btn-sm' : ''}" data-act="${act}" ${o.id != null ? `data-id="${o.id}"` : ''} ${o.x ? o.x : ''}>${o.icon ? ic(o.icon, 16) : ''}${label}</button>`;
  A.iconBtn = (act, icon, id, title, danger) => `<button class="btn btn-ghost btn-sm btn-icon" title="${title}" aria-label="${title}" data-act="${act}" data-id="${id}" ${danger ? 'style="color:var(--red)"' : ''}>${ic(icon, 16)}</button>`;
  A.view = html => { document.getElementById('view').innerHTML = html; };
  A.go = h => { location.hash = h; };
  A.rerender = () => route();
  A.studentPicker = (name, val, label) => {
    const opts = A.active().sort((a, b) => A.name(a).localeCompare(A.name(b)));
    const cur = opts.find(s => s.id === val);
    return { html: `<div class="fld"><label>${label || 'Élève'} *</label><input type="text" name="${name}_txt" list="dl_${name}" value="${cur ? esc(A.name(cur) + ' (' + cur.matricule + ')') : ''}" placeholder="Tapez un nom ou un matricule" autocomplete="off"><datalist id="dl_${name}">${opts.map(s => `<option value="${esc(A.name(s) + ' (' + s.matricule + ')')}">`).join('')}</datalist></div>` };
  };
  A.resolveStudent = txt => { txt = String(txt || '').trim().toLowerCase(); if (!txt) return null; const all = A.active(); return all.find(s => (A.name(s) + ' (' + s.matricule + ')').toLowerCase() === txt) || all.find(s => s.matricule.toLowerCase() === txt) || null; };
  A.receipt = p => {
    const s = A.stu(p.studentId), S = D.settings;
    const html = `<div style="max-width:150mm;margin:0 auto;padding:10mm;border:2px solid #14213D;font-size:13px"><div style="display:flex;gap:12px;align-items:center;border-bottom:2px solid #E4572E;padding-bottom:10px;margin-bottom:12px">${S.logo ? `<img src="${S.logo}" style="width:54px;height:54px;object-fit:contain">` : ''}<div><div style="font-family:Fraunces,serif;font-size:19px;font-weight:700">${esc(S.name)}</div><div style="font-size:11px;opacity:.7">${esc([S.address, S.city, S.phone].filter(Boolean).join(' · '))}</div></div><div style="margin-left:auto;text-align:right"><div style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:#E4572E">REÇU</div><div>${esc(p.ref)}</div></div></div>
      <table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;opacity:.7">Date</td><td><b>${esc(fdate(p.date))}</b></td></tr><tr><td style="padding:6px 0;opacity:.7">Élève</td><td><b>${esc(A.name(s))}</b> (${esc(s ? s.matricule : '')})</td></tr><tr><td style="padding:6px 0;opacity:.7">Classe</td><td>${esc((A.cls(s && s.classId) || {}).name || '')}</td></tr><tr><td style="padding:6px 0;opacity:.7">Motif</td><td>${esc(p.type)}${p.month ? ' · ' + esc(U.monthLabel(p.month)) : ''}</td></tr><tr><td style="padding:6px 0;opacity:.7">Mode</td><td>${esc(p.method)}</td></tr></table>
      <div style="margin:14px 0;padding:12px;background:#FCEDE6;display:flex;justify-content:space-between;font-size:16px"><span>Montant reçu</span><b>${money(p.amount)}</b></div>
      ${p.type === 'Scolarité' && s ? `<div style="font-size:12px;opacity:.8">Reste à payer sur la scolarité : <b>${money(A.balance(s))}</b></div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:12px"><span>Le payeur</span><span>Le caissier</span></div></div>`;
    U.print(html);
  };
  A.waParent = (s, msg) => SG.waLink(s.parentPhone, msg);

  /* ---------- navigation ---------- */
  const NAV = [
    ['Pilotage', [['dashboard', 'Tableau de bord', 'home'], ['students', 'Élèves', 'users'], ['attendance', 'Pointage', 'check'], ['classes', 'Classes et matières', 'layers'], ['teachers', 'Professeurs', 'user'], ['timetable', 'Emplois du temps', 'cal'], ['tuto', 'Tutoriel', 'book']]],
    ['Scolarité', [['grades', 'Notes', 'book'], ['bulletins', 'Bulletins', 'award'], ['cards', 'Cartes scolaires', 'id'], ['notices', 'Avis aux parents', 'bell']]],
    ['Finances', [['payments', 'Paiements et scolarité', 'card'], ['cantine', 'Cantine', 'cup'], ['stock', 'Stock et tenues', 'box'], ['expenses', 'Dépenses', 'down'], ['accounting', 'Comptabilité', 'wallet']]],
    ['Compte', [['settings', 'Paramètres', 'set']]]
  ];
  const TITLES = {}; NAV.forEach(g => g[1].forEach(i => TITLES[i[0]] = i[1])); TITLES.student = 'Fiche élève'; delete TITLES.tuto;

  /* Fenêtre « M'abonner » : chaque formule ouvre WhatsApp avec un message prérempli. */
  A.subscribe = (sc, renew) => {
    sc = sc || school0; const g = SG.global(); const fm = n => UI.money ? UI.money(n) : n + ' FCFA';
    const body = `<p class="muted" style="margin-bottom:14px">Choisissez une formule : WhatsApp s'ouvre avec votre demande déjà écrite.</p><div style="display:grid;gap:10px">${(g.plans || []).map((p, i, a) => {
      const msg = 'Bonjour, je souhaite ' + (renew ? 'renouveler mon abonnement' : 'm\'abonner') + ' à School-G, formule ' + p.name + (SG.planOnRequest(p) ? ' (prix sur demande), pour l\'école ' : ' (' + p.price + ' FCFA, ' + (p.months >= 600 ? 'paiement unique' : p.months + ' mois') + '), pour l\'école ') + sc.name + ' (' + sc.email + ').';
      return `<a class="btn ${i === a.length - 1 ? 'btn-primary' : 'btn-ghost'}" target="_blank" rel="noopener" href="${SG.waLink(g.contactWa, msg)}" style="justify-content:space-between;padding:14px 16px;height:auto;text-align:left"><span><b>${esc(p.name)}</b><br><small style="opacity:.8;font-weight:400">${esc(p.desc || '')}</small></span><b>${esc(SG.planOnRequest(p) ? 'Sur demande' : fm(p.price))}</b></a>`;
    }).join('')}</div>`;
    UI.modal({ title: 'Choisir une formule', body, size: 'sm', actions: [{ label: 'Fermer' }] });
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-sub]'); if (b) { e.preventDefault(); A.subscribe(school0, b.dataset.sub === 'renew'); } });

  /* Espace parent : partager le lien ou le visiter */
  A.parentLink = () => new URL('login.html#parent', location.href).href;
  A.parentModal = () => {
    const sc = A.school(), url = A.parentLink();
    const text = 'Espace parent de ' + (D.settings.name || sc.name) + '. Ouvrez ce lien : ' + url + ' puis saisissez le code de l\'école ' + sc.code + ', le matricule de votre enfant et le code parent remis par l\'école.';
    const m = UI.modal({ title: 'Espace parent', size: 'sm', actions: [{ label: 'Fermer' }], body: `<p class="muted" style="margin-bottom:12px">Les parents suivent leur enfant avec ce lien : notes, bulletins, paiements, présences et avis.</p><div class="fld"><label>Lien de l'espace parent</label><input type="text" readonly value="${esc(url)}" id="plink" onclick="this.select()"></div><p class="small muted" style="margin:6px 0 14px">Code de l'école à leur communiquer : <b>${esc(sc.code)}</b></p><div style="display:grid;gap:8px"><button class="btn btn-primary" type="button" data-pa="share">Partager le lien</button><button class="btn btn-ghost" type="button" data-pa="copy">Copier le lien</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(url)}">Visiter l'espace parent</a></div>` });
    m.el.addEventListener('click', async e => {
      const b = e.target.closest('[data-pa]'); if (!b) return;
      if (b.dataset.pa === 'copy') { try { await navigator.clipboard.writeText(url); UI.toast('Lien copié.', 'ok'); } catch (x) { const i = m.el.querySelector('#plink'); i.select(); document.execCommand && document.execCommand('copy'); UI.toast('Lien copié.', 'ok'); } return; }
      try { if (navigator.share) await navigator.share({ title: 'Espace parent', text }); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); } catch (x) { }
    });
  };
  document.addEventListener('click', e => {
    if (!e.target.closest('#admBtn')) return; e.preventDefault();
    const m = UI.modal({ title: 'Accès administrateur', size: 'sm', body: '<p class="muted" style="margin-bottom:12px">Saisissez le code d\'accès pour ouvrir le panel admin.</p><form id="admCode" class="frm"><div class="fld"><label>Code d\'accès</label><input type="password" name="code" autocomplete="off" autofocus></div><div id="admErr" class="err" style="display:none"></div><div class="fld"><button class="btn btn-primary" style="width:100%">Ouvrir le panel admin</button></div></form>', actions: [{ label: 'Annuler' }] });
    const f = m.el.querySelector('#admCode'), er = m.el.querySelector('#admErr'); setTimeout(() => f.code.focus(), 50);
    f.onsubmit = async ev => { ev.preventDefault(); const r = await SG.checkAdminCode(f.code.value); if (r === true) { location.href = 'admin.html'; } else { er.style.display = 'block'; er.textContent = r; f.code.value = ''; f.code.focus(); } };
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-parent]')) { e.preventDefault(); A.parentModal(); } });

  function lockScreen(sc, st) {
    const g = SG.global();
    const msg = { banned: ['Compte banni', "L'accès de cette école a été suspendu par l'administrateur de School-G."], blocked: ['Compte bloqué', "L'accès de cette école est momentanément bloqué. Contactez l'équipe School-G pour le réactiver."], expired: [sc.paidUntil ? 'Abonnement expiré' : 'Essai gratuit terminé', 'Vos 7 jours d\'essai sont écoulés. Vos données sont conservées : abonnez-vous pour retrouver immédiatement votre école.'] }[st];
    document.getElementById('root').innerHTML = `<div class="lock"><div class="box"><div class="ic">${ic('lock', 28)}</div><h1>${msg[0]}</h1><p>${msg[1]}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${st === 'expired' ? '<button class="btn btn-primary" data-sub="new">M\'abonner</button>' : ''}<a class="btn btn-ghost" target="_blank" rel="noopener" href="${SG.waLink(g.contactWa, 'Bonjour, je souhaite activer le compte de l\'école ' + sc.name + ' (' + sc.email + ').')}">Contacter par WhatsApp</a><a class="btn btn-ghost" href="mailto:${esc(g.contactMail)}">Envoyer un email</a><button class="btn btn-ghost" id="lkOut">Se déconnecter</button></div><p class="small muted" style="margin-top:18px">${esc(sc.name)} · ${esc(sc.email)}</p></div></div>`;
    document.getElementById('lkOut').onclick = async () => { await SG.logout(); location.href = 'login.html'; };
  }

  /* Met à jour le nom, le logo et la couleur de l'école partout, sans recharger la page. */
  A.refreshBrand = () => {
    const S = D.settings || {}, sb = document.querySelector('.side-brand');
    if (sb) { const lg = sb.querySelector('.lg'), nm = sb.querySelector('b'), yr = sb.querySelector('small'); if (lg) lg.innerHTML = S.logo ? `<img src="${S.logo}" alt="">` : 'G'; if (nm) nm.textContent = S.name || 'Mon école'; if (yr) yr.textContent = S.year || ''; }
    document.title = (S.name || 'School-G') + ', espace direction';
    if (S.accent) document.documentElement.style.setProperty('--orange', S.accent);
    try { const lg = S.logo || ''; localStorage.setItem('sg_brand', JSON.stringify({ id: school0.id, name: S.name || school0.name, logo: lg.length < 150000 ? lg : '' })); } catch (e) { }
  };
  /* Bandeaux (annonce, essai, abonnement) et badge d'état : redessinés en direct quand l'admin change quelque chose. */
  A.drawBanners = () => {
    const sc = school0, st = SG.status(sc), bn = [];
    const bd = document.getElementById('stBadge'); if (bd) bd.innerHTML = { trial: badge('Essai · ' + SG.daysLeft(sc) + ' j restants', 'or'), active: badge('Abonné · ' + SG.daysLeft(sc) + ' j', 'ok') }[st] || '';
    if (sess.byAdmin) bn.push(`<div class="banner adm">${ic('shield', 18)}${SG._ro ? 'Mode lecture seule : vous consultez cette école sans pouvoir rien modifier.' : 'Mode administrateur : vous consultez cette école.'} <a href="#" id="exitAdm" style="font-weight:700;text-decoration:underline">Quitter</a></div>`);
    const g = SG.global(); if (g.announcement) bn.push(`<div class="banner info">${ic('bell', 18)}<span>${esc(g.announcement)}</span></div>`);
    if (st === 'trial') bn.push(`<div class="banner trial"><span>Essai gratuit : <b>${SG.daysLeft(sc)} jour(s)</b> restant(s).</span><button class="btn btn-primary btn-sm" data-sub="new">M'abonner</button></div>`);
    else if (st === 'active' && SG.daysLeft(sc) <= 7) bn.push(`<div class="banner trial"><span>Votre abonnement se termine dans <b>${SG.daysLeft(sc)} jour(s)</b>.</span><button class="btn btn-primary btn-sm" data-sub="renew">Renouveler</button></div>`);
    const el = document.getElementById('banners'); if (el) el.innerHTML = bn.join('');
    const ex = document.getElementById('exitAdm'); if (ex) ex.onclick = async e => { e.preventDefault(); await SG.flushAll(); window.close(); location.href = 'admin.html'; };
  };

  function shell() {
    const sc = A.school(), S = D.settings, st = SG.status(sc);
    document.documentElement.style.setProperty('--orange', S.accent || '#E4572E');
    document.title = (S.name || 'School-G') + ', espace direction';
    const nav = NAV.map(([g, items]) => `<h6>${g}</h6>` + items.map(([k, l, i]) => k === 'tuto' ? `<a class="it" href="#" data-tour data-k="tuto">${ic(i, 18)}<span>${l}</span></a>` : `<a class="it" href="#/${k}" data-k="${k}">${ic(i, 18)}<span>${l}</span></a>`).join('')).join('');
    const stb = { trial: badge('Essai · ' + SG.daysLeft(sc) + ' j restants', 'or'), active: badge('Abonné · ' + SG.daysLeft(sc) + ' j', 'ok') }[st] || '';
    document.getElementById('root').innerHTML = `<div class="shell"><aside class="side" id="side"><div class="side-brand"><div class="lg">${S.logo ? `<img src="${S.logo}" alt="">` : 'G'}</div><div style="min-width:0"><b>${esc(S.name || 'Mon école')}</b><small>${esc(S.year)}</small></div></div><nav>${nav}</nav><div class="side-foot"><span id="stBadge">${stb}</span><div>${esc(sc.director)}</div><div class="foot-btns">${SG.isAdmin() ? '<a class="btn btn-primary btn-sm" href="admin.html" id="admBtn">' + ic('shield', 16) + 'Panel admin</a>' : ''}<button class="btn btn-ghost btn-sm" type="button" data-parent>${ic('users', 16)}Espace parent</button></div><a href="#" id="logout">${ic('out', 16)}Se déconnecter</a></div></aside><div class="scrim" id="scrim"></div>
      <div class="main"><header class="top"><button class="mb" id="mb" aria-label="Menu">${ic('menu', 24)}</button><div class="tt" id="ttl"></div><div class="sp"></div><button class="btn btn-ghost btn-sm topparent" type="button" data-parent>${ic('users', 16)}<span>Espace parent</span></button><div class="sync" id="sync"></div><button class="bellb" type="button" data-tour aria-label="Mode d'emploi" title="Mode d'emploi" style="font-weight:700;margin-right:6px">?</button><button class="bellb" id="bell" type="button" aria-label="Messages de School-G" title="Messages de School-G" style="display:none">${ic('bell', 18)}<span class="n" id="bellN" style="display:none"></span></button><div class="dt">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="av">${esc((sc.director || 'D')[0].toUpperCase())}</div></header><div id="banners"></div><main id="view"></main></div></div>`;
    A.drawBanners();
    if (!sess.byAdmin) {
      const key = 'sg_seen_' + sc.id; const seen = () => { try { return +localStorage.getItem(key) || 0; } catch (e) { return 0; } };
      let first = true, list = [];
      const draw = () => { const n = list.filter(m => m.createdMs > seen()).length; const b = document.getElementById('bell'), c = document.getElementById('bellN'); if (!b) return; b.style.display = list.length ? '' : 'none'; c.style.display = n ? '' : 'none'; c.textContent = n; };
      const open = () => {
        const s0 = seen();
        UI.modal({ title: 'Messages de School-G', size: 'md', body: list.length ? list.map(m => `<div class="msgi ${m.createdMs > s0 ? 'new' : ''}"><h4>${esc(m.title)}</h4><small>${new Date(m.createdMs).toLocaleString('fr-FR')}</small><p>${esc(m.body)}</p></div>`).join('') : '<p class="muted">Aucun message.</p>', actions: [{ label: 'Fermer' }] });
        try { localStorage.setItem(key, String(Math.max(0, ...list.map(m => m.createdMs)))); } catch (e) { } draw();
      };
      document.getElementById('bell').onclick = open;
      if (A._msgUnsub) { try { A._msgUnsub(); } catch (e) { } }
      A._msgUnsub = SG.watchMessages(sc.id, l => { list = l; draw(); if (l.some(m => m.createdMs > seen()) && !document.querySelector('.ov')) { if (first) setTimeout(open, 600); else UI.toast('Nouveau message de School-G', 'ok'); } first = false; });
    }
    const side = document.getElementById('side'), scrim = document.getElementById('scrim');
    const tog = on => { side.classList.toggle('open', on); scrim.classList.toggle('on', on); };
    document.getElementById('mb').onclick = () => tog(true); scrim.onclick = () => tog(false); side.addEventListener('click', e => { if (e.target.closest('a.it')) tog(false); });
    document.getElementById('logout').onclick = async e => { e.preventDefault(); if (sess.byAdmin) { await SG.flushAll(); window.close(); location.href = 'admin.html'; return; } await SG.logout(); location.href = 'login.html'; };
    const ex = document.getElementById('exitAdm'); if (ex) ex.onclick = async e => { e.preventDefault(); await SG.flushAll(); window.close(); location.href = 'admin.html'; };
    const sy = document.getElementById('sync'); const L = { pending: 'Modifié', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Erreur d\'enregistrement' };
    SG.onSync((v, e) => { if (!sy) return; sy.textContent = L[v] || ''; sy.className = 'sync ' + v; sy.title = v === 'error' ? SG.errMsg(e) : ''; if (v === 'saved') setTimeout(() => { if (sy.textContent === L.saved) sy.textContent = ''; }, 2500); });
  }

  function route() {
    const [, name, arg] = (location.hash || '#/dashboard').split('/');
    const key = A.views[name] ? name : 'dashboard';
    A.ST._r = null;
    if (SG._ro && key === 'settings') { document.getElementById('ttl').textContent = TITLES[key] || ''; return A.view(A.empty('Accès interdit par l\'administrateur', 'Les coordonnées de l\'école ne sont pas visibles en lecture seule.')); }
    document.querySelectorAll('.side a.it').forEach(a => a.classList.toggle('on', a.dataset.k === (key === 'student' ? 'students' : key)));
    document.getElementById('ttl').textContent = TITLES[key] || '';
    window.scrollTo(0, 0);
    try { A.views[key](arg); } catch (e) { console.error(e); A.view(A.empty('Une erreur est survenue', esc(e.message))); }
  }

  /* ---------- interactions globales ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const f = A.acts[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); }
  });
  const onF = e => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    A.ST[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.re) A.rerender(); else if (A.ST._r) A.ST._r();
  };
  document.addEventListener('input', e => { if (e.target.matches('input[type=search],input[type=text][data-f]')) onF(e); });
  document.addEventListener('change', e => { if (!e.target.matches('input[type=search],input[type=text][data-f]')) onF(e); });
  A.sel = (key, opts, val, o = {}) => `<select data-f="${key}" ${o.re ? 'data-re="1"' : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  A.search = (key, ph) => `<div class="sr">${ic('search', 16)}<input type="search" data-f="${key}" placeholder="${ph}" value="${esc(A.ST[key] || '')}"></div>`;

  /* ---------- tableau de bord ---------- */
  A.views.dashboard = () => {
    const ym = today().slice(0, 7), act = A.active();
    const okPay = D.payments.filter(p => p.status === 'validé');
    const revM = sum(okPay.filter(p => p.date.startsWith(ym)), p => p.amount);
    const salM = sum(D.salaries.filter(x => x.month === ym && x.status === 'payé'), x => x.amount);
    const expM = sum(D.expenses.filter(e => e.date.startsWith(ym)), e => e.amount) + salM;
    const dueT = sum(act, s => A.balance(s));
    const lates = act.map(s => ({ s, late: A.late(s) })).filter(x => x.late > 0).sort((a, b) => b.late - a.late);
    const day = D.attendance[today()] || {}; const dv = Object.entries(day).filter(([id]) => A.stu(id));
    const pres = dv.filter(([, v]) => v.s === 'P' || v.s === 'R').length, ret = dv.filter(([, v]) => v.s === 'R'), abs = dv.filter(([, v]) => v.s === 'A').length;
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const chart = months.map(m => ({ label: U.MONTHS[+m.slice(5) - 1].slice(0, 4), v: [sum(okPay.filter(p => p.date.startsWith(m)), p => p.amount), sum(D.expenses.filter(e => e.date.startsWith(m)), e => e.amount) + sum(D.salaries.filter(x => x.month === m && x.status === 'payé'), x => x.amount)] }));
    const lowStock = D.stock.filter(i => +i.qty <= +i.min);
    const empty = !D.classes.length && !D.students.length;
    const onb = empty ? `<div class="card" style="margin-bottom:20px;border-color:var(--orange)"><div class="cb"><h3 style="font-size:21px;margin-bottom:6px">Bienvenue sur School-G</h3><p class="muted" style="margin-bottom:16px">Trois étapes pour démarrer. Vous pouvez aussi explorer le logiciel avec des données d'exemple, supprimables à tout moment.</p><div class="g3"><div><b>1. Votre école</b><p class="small muted">Logo, adresse, couleur, tranches de scolarité.</p><div style="margin-top:8px"><a class="btn btn-ghost btn-sm" href="#/settings">Ouvrir les paramètres</a></div></div><div><b>2. Vos classes</b><p class="small muted">Du Jardin à la Terminale en un clic, tarifs modifiables.</p><div style="margin-top:8px"><a class="btn btn-ghost btn-sm" href="#/classes">Créer les classes</a></div></div><div><b>3. Vos élèves</b><p class="small muted">Inscrivez les élèves et encaissez les premiers paiements.</p><div style="margin-top:8px"><a class="btn btn-ghost btn-sm" href="#/students">Inscrire un élève</a></div></div></div><div style="margin-top:18px">${A.btn('seed', 'Charger des données d\'exemple', { cls: 'btn-primary', icon: 'refresh' })}</div></div></div>` : '';
    A.view(`${A.head('Tableau de bord', 'Situation de l\'école au ' + fdate(today()))}${onb}
    <div class="kpis"><div class="kpi"><small>Élèves inscrits</small><b>${act.length}</b><span>${D.classes.length} classe(s) · ${D.teachers.length} professeur(s)</span></div>
    <div class="kpi g"><small>Encaissé ce mois</small><b>${money(revM)}</b><span>Total année : ${money(sum(okPay, p => p.amount))}</span></div>
    <div class="kpi r"><small>Scolarité impayée</small><b>${money(dueT)}</b><span>${lates.length} élève(s) en retard</span></div>
    <div class="kpi o"><small>Solde du mois</small><b>${money(revM - expM)}</b><span>Dépenses : ${money(expM)}</span></div></div>
    <div class="g21" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Recettes et dépenses, 6 derniers mois</h3><div class="legend"><span><b style="background:var(--orange)"></b>Recettes</span><span><b style="background:var(--navy)"></b>Dépenses</span></div></div><div class="cb">${U.bars(chart, { fmt: money })}</div></div>
    <div class="card"><div class="ch"><h3>Pointage du jour</h3><a class="btn btn-ghost btn-sm" href="#/attendance">Pointer</a></div><div class="cb">${dv.length ? `<div class="row"><span>Présents</span><b>${pres - ret.length}</b></div><div class="row"><span>En retard</span><b style="color:var(--amber)">${ret.length}</b></div><div class="row"><span>Absents</span><b style="color:var(--red)">${abs}</b></div>${ret.length ? `<p class="small muted" style="margin-top:10px">Retardataires : ${ret.slice(0, 4).map(([id, v]) => esc(A.name(A.stu(id))) + (v.t ? ' (' + v.t + ')' : '')).join(', ')}</p>` : ''}` : A.empty('Pointage non fait', 'Aucune présence enregistrée aujourd\'hui.')}</div></div></div>
    <div class="g2" style="margin-bottom:20px"><div class="card"><div class="ch"><h3>Élèves en retard de paiement</h3><a class="btn btn-ghost btn-sm" href="#/payments">Voir tout</a></div><div class="cb" style="padding-top:8px;padding-bottom:8px">${lates.slice(0, 6).map(x => `<div class="row"><a href="#/student/${x.s.id}" class="who">${A.avatar(x.s)}<span><b>${esc(A.name(x.s))}</b><small>${esc((A.cls(x.s.classId) || {}).name || '')}</small></span></a><b style="color:var(--red)">${money(x.late)}</b></div>`).join('') || A.empty('Aucun retard', 'Tous les élèves sont à jour.')}</div></div>
    <div class="card"><div class="ch"><h3>Derniers paiements</h3><a class="btn btn-ghost btn-sm" href="#/payments">Voir tout</a></div><div class="cb" style="padding-top:8px;padding-bottom:8px">${D.payments.slice(-6).reverse().map(p => `<div class="row"><span><b>${esc(A.name(A.stu(p.studentId)))}</b><br><small class="muted">${esc(p.type)} · ${fdate(p.date)}</small></span><b>${money(p.amount)}</b></div>`).join('') || A.empty('Aucun paiement', 'Les paiements enregistrés apparaîtront ici.')}</div></div></div>
    <div class="g3"><div class="card"><div class="ch"><h3>Dernières dépenses</h3><a class="btn btn-ghost btn-sm" href="#/expenses">Voir</a></div><div class="cb" style="padding-top:8px;padding-bottom:8px">${D.expenses.slice(-5).reverse().map(e => `<div class="row"><span>${esc(e.label)}<br><small class="muted">${esc(e.cat)} · ${fdate(e.date)}</small></span><b>${money(e.amount)}</b></div>`).join('') || A.empty('Aucune dépense', '')}</div></div>
    <div class="card"><div class="ch"><h3>Alertes de stock</h3><a class="btn btn-ghost btn-sm" href="#/stock">Stock</a></div><div class="cb" style="padding-top:8px;padding-bottom:8px">${lowStock.map(i => `<div class="row"><span>${esc(i.name)}</span>${badge(i.qty + ' restant(s)', i.qty <= 0 ? 'bad' : 'warn')}</div>`).join('') || A.empty('Stock suffisant', 'Aucun article sous le seuil.')}</div></div>
    <div class="card"><div class="ch"><h3>Avis récents</h3><a class="btn btn-ghost btn-sm" href="#/notices">Gérer</a></div><div class="cb" style="padding-top:8px;padding-bottom:8px">${D.notices.slice(-4).reverse().map(n => `<div class="row"><span>${esc(n.title)}<br><small class="muted">${fdate(n.date)}</small></span>${n.priority !== 'normal' ? badge(n.priority, n.priority === 'urgent' ? 'bad' : 'warn') : ''}</div>`).join('') || A.empty('Aucun avis', 'Informez les parents depuis ici.')}</div></div></div>`);
  };
  A.acts.seed = () => UI.confirm('Charger des élèves, professeurs, paiements et notes fictifs pour explorer School-G ?', () => { A.seedDemo(); location.hash = '#/dashboard'; A.rerender(); UI.toast('Données d\'exemple chargées.', 'ok'); }, { yes: 'Charger' });

  /* Temps réel : dès que l'administrateur bloque, bannit, active un abonnement ou annule un essai,
     le site de l'école réagit tout de suite, sans rechargement de la page. */
  let liveOff = null, locked = false, hashBound = false;
  const keyOf = x => JSON.stringify([x.paidUntil, x.trialEnd, x.banned, x.blocked, x.trialCancelled, x.plan]);
  function goLock(st) {
    locked = true; document.querySelectorAll('.ov,.tr').forEach(n => n.remove()); document.body.classList.remove('noscroll');
    SG.stopWatch(); lockScreen(school0, st);
  }
  function liveStart() {
    if (liveOff) liveOff();
    let prevSt = SG.status(school0), prevKey = keyOf(school0);
    const u1 = SG.watchSchool(school0.id, x => {
      Object.assign(school0, x); const st = SG.status(school0), key = keyOf(school0);
      if (st === prevSt && key === prevKey) return; const was = prevSt; prevSt = st; prevKey = key;
      if (sess.byAdmin) return A.drawBanners();
      if (st !== 'trial' && st !== 'active') return goLock(st);
      if (locked) { locked = false; return A.boot(); }
      A.drawBanners(); if (st === 'active' && was !== 'active') UI.toast('Votre abonnement est activé. Merci !', 'ok');
    });
    const u2 = SG.watchGlobal(() => { if (!locked) A.drawBanners(); });
    const u3 = (!sess.byAdmin && A.advStart) ? A.advStart(school0.id) : null;
    const tm = setInterval(() => { if (locked || sess.byAdmin) return; const st = SG.status(school0); if (st !== 'trial' && st !== 'active') goLock(st); else A.drawBanners(); }, 30000);
    liveOff = () => { try { u1 && u1(); u2 && u2(); u3 && u3(); } catch (e) { } clearInterval(tm); };
  }

  A.boot = async () => {
    const root = document.getElementById('root');
    let cache = null; try { cache = JSON.parse(localStorage.getItem('sg_brand') || 'null'); } catch (e) { }
    const ld = UI.loading(root, { name: cache && cache.name, logo: cache && cache.logo, msg: 'Connexion sécurisée…' });
    try {
      const user = await SG.ready(); ld.set(38, 'Récupération de votre école…');
      if (!user) return location.replace('login.html');
      const vid = new URLSearchParams(location.search).get('view');
      let id = user.uid;
      if (vid) { await SG.loadRole(); if (SG.isStaff()) { id = vid; sess.byAdmin = true; if (!SG.isAdmin()) SG._ro = true; } }
      school0 = await SG.school(id); ld.set(62, 'Chargement de vos données…');
      if (!school0) return location.replace('login.html#finish');
      if (!cache || cache.id !== school0.id) ld.brand({ name: school0.name });
      const st0 = SG.status(school0);
      if (st0 !== 'trial' && st0 !== 'active' && !sess.byAdmin) { locked = true; liveStart(); return lockScreen(school0, st0); }
      SG.setCurrent(school0);
      const data = await SG.loadData(school0.id, { school: school0 });
      Object.keys(D).forEach(k => delete D[k]); Object.assign(D, data); if (!sess.byAdmin && A.fixTeachers) A.fixTeachers(); ld.set(90, 'Préparation de votre espace…');
      try { const lg = (D.settings && D.settings.logo) || ''; localStorage.setItem('sg_brand', JSON.stringify({ id: school0.id, name: (D.settings && D.settings.name) || school0.name, logo: lg.length < 150000 ? lg : '' })); } catch (e) { }
      ld.brand({ name: (D.settings && D.settings.name) || school0.name, logo: D.settings && D.settings.logo }); await ld.done();
      SG.watchData(school0.id, D, () => { if (!document.querySelector('.ov') && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) route(); else UI.toast('Mise à jour reçue d\'un autre appareil.'); });
      shell(); if (!hashBound) { window.addEventListener('hashchange', route); hashBound = true; } route(); liveStart(); if (A.tourMaybe) A.tourMaybe();
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="lock"><div class="box"><h1>Connexion impossible</h1><p>${esc(SG.errMsg(e))}</p><button class="btn btn-navy" onclick="location.reload()">Réessayer</button></div></div>`;
    }
  };
})();
