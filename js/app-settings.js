/* School-G : paramètres, abonnement, sauvegarde et données d'exemple */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U, ST } = A; const { esc, money, fdate, ic, uid, today, addDays, badge } = U; const V = A.views, ACT = A.acts;
  const SG = window.SG;

  const trRows = () => ST.tr.map((t, i) => `<div style="display:grid;grid-template-columns:1fr 90px 150px 40px;gap:8px;margin-bottom:8px"><input type="text" data-ti="${i}" data-k="label" value="${esc(t.label)}" placeholder="Libellé"><input type="number" data-ti="${i}" data-k="pct" value="${t.pct}" min="0" max="100" title="Pourcentage"><input type="date" data-ti="${i}" data-k="due" value="${esc(t.due)}"><button type="button" class="btn btn-ghost btn-sm btn-icon" data-act="tr-rm" data-id="${i}">${ic('x', 16)}</button></div>`).join('');

  V.settings = () => {
    const S = D.settings, sc = A.school(), st = SG.status(sc); ST.tr = S.tranches.map(t => ({ ...t }));
    const g = SG.global();
    A.view(`${A.head('Paramètres', 'Personnalisez votre école, vos tarifs et votre compte')}
    <div class="stack">
    <div class="card"><div class="ch"><h3>Informations de l'école</h3>${A.btn('set-info', 'Enregistrer', { cls: 'btn-primary', sm: true })}</div><div class="cb"><form class="frm" id="f-info">${UI.fields([
      { name: 'name', label: 'Nom de l\'école', req: true }, { name: 'logo', label: 'Logo', type: 'img', max: 400 },
      { name: 'address', label: 'Adresse', cls: 'half' }, { name: 'city', label: 'Ville', cls: 'half' }, { name: 'phone', label: 'Téléphone', type: 'tel', cls: 'half' }, { name: 'email', label: 'Email de l\'école', type: 'email', cls: 'half' },
      { name: 'year', label: 'Année scolaire', cls: 'half' }, { name: 'accent', label: 'Couleur de l\'école', type: 'color', cls: 'half' }, { name: 'motto', label: 'Devise (apparaît sur les bulletins)' },
      { name: 'ministry', label: 'En-tête officiel : ministère', cls: 'half' }, { name: 'academy', label: 'En-tête officiel : académie, centre d\'animation', cls: 'half' }], S)}</form></div></div>
    <div class="card"><div class="ch"><h3>Scolarité, notes et cantine</h3>${A.btn('set-ped', 'Enregistrer', { cls: 'btn-primary', sm: true })}</div><div class="cb"><label style="font-size:12.5px;font-weight:600;color:var(--ink2)">Tranches de scolarité (le total doit faire 100 %)</label><div id="trs" style="margin-top:8px">${trRows()}</div>${A.btn('tr-add', 'Ajouter une tranche', { sm: true, icon: 'plus' })}
      <form class="frm" id="f-ped" style="margin-top:18px">${UI.fields([{ name: 'cantinePrice', label: 'Tarif cantine mensuel (FCFA)', type: 'number', min: 0, cls: 'half' }, { name: 'compWeight', label: 'Poids de la composition', type: 'number', min: 1, step: '0.5', cls: 'half', hint: 'Moyenne = (note de classe + composition × poids) / (1 + poids).' }, { name: 'periods', label: 'Périodes d\'évaluation (une par ligne)', type: 'textarea', rows: 3, def: S.periods.join('\n') }], S)}</form></div></div>
    <div class="g2"><div class="card"><div class="ch"><h3>Abonnement</h3>${badge(SG.STATUS[st][0] + ' · ' + SG.daysLeft(sc) + ' j', SG.STATUS[st][1])}</div><div class="cb"><dl class="kv"><dt>Formule</dt><dd>${esc(sc.plan)}</dd><dt>Code école</dt><dd><span class="code">${esc(sc.code)}</span></dd><dt>Fin ${st === 'active' ? 'abonnement' : 'd\'essai'}</dt><dd>${fdate(st === 'active' ? sc.paidUntil : sc.trialEnd)}</dd><dt>Inscrit le</dt><dd>${fdate(sc.createdAt)}</dd></dl><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${SG.waLink(g.contactWa, 'Bonjour, je souhaite m\'abonner / renouveler School-G pour ' + sc.name + '.')}">S'abonner par WhatsApp</a><a class="btn btn-ghost btn-sm" href="mailto:${esc(g.contactMail)}">Email</a></div><p class="small muted" style="margin-top:12px">Le code école est à communiquer aux parents avec le matricule et le code parent de leur enfant.</p></div></div>
    <div class="card"><div class="ch"><h3>Connexion</h3></div><div class="cb"><dl class="kv" style="margin-bottom:14px"><dt>Compte</dt><dd>${esc((SG.user && SG.user.email) || '')}</dd><dt>Méthode</dt><dd>${SG.hasPassword() ? 'Email et mot de passe' : 'Google'}</dd></dl>${SG.hasPassword() ? `<form class="frm" id="f-pw">${UI.fields([{ name: 'old', label: 'Mot de passe actuel', type: 'password', auto: 'current-password' }, { name: 'n1', label: 'Nouveau mot de passe', type: 'password', auto: 'new-password', cls: 'half' }, { name: 'n2', label: 'Confirmer', type: 'password', auto: 'new-password', cls: 'half' }], {})}</form><div style="margin-top:14px">${A.btn('set-pw', 'Changer le mot de passe', { cls: 'btn-navy', sm: true })}</div>` : '<p class="small muted">Votre mot de passe est géré par Google.</p>'}</div></div></div>
    <div class="card"><div class="ch"><h3>Données</h3></div><div class="cb"><p class="muted small" style="margin-bottom:14px">Sauvegardez régulièrement vos données. L'import remplace toutes les données actuelles de l'école.</p><div style="display:flex;gap:8px;flex-wrap:wrap">${A.btn('data-export', 'Exporter une sauvegarde', { icon: 'dl' })}<label class="btn btn-ghost">${ic('up', 16)}Importer une sauvegarde<input type="file" accept=".json,application/json" hidden id="imp"></label>${A.btn('seed', 'Charger des données d\'exemple', { icon: 'refresh' })}${A.hasDemo() ? A.btn('demo-remove', 'Retirer les données d\'exemple', { icon: 'trash' }) : ''}${A.btn('data-reset', 'Réinitialiser l\'école', { cls: 'btn-danger', icon: 'trash' })}</div></div></div>
    </div>`);
    document.getElementById('imp').onchange = e => {
      const f = e.target.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.students) || !Array.isArray(d.classes) || !d.settings) throw new Error('Fichier invalide'); UI.confirm('Remplacer toutes les données de l\'école par cette sauvegarde ?', () => { Object.keys(D).forEach(k => delete D[k]); Object.assign(D, d); A.save(); UI.toast('Sauvegarde importée.', 'ok'); SG.flush(A.school().id).then(() => location.reload()); }, { danger: true, yes: 'Remplacer' }); } catch (x) { UI.toast('Fichier de sauvegarde invalide.', 'err'); } };
      r.readAsText(f);
    };
    const trs = document.getElementById('trs');
    trs.addEventListener('input', e => { const t = e.target; if (t.dataset.k) ST.tr[t.dataset.ti][t.dataset.k] = t.dataset.k === 'pct' ? +t.value : t.value; });
  };
  ACT['tr-add'] = () => { ST.tr.push({ label: 'Tranche ' + (ST.tr.length + 1), pct: 0, due: today() }); document.getElementById('trs').innerHTML = trRows(); };
  ACT['tr-rm'] = el => { ST.tr.splice(+el.dataset.id, 1); document.getElementById('trs').innerHTML = trRows(); };
  ACT['set-info'] = () => { const v = UI.read(document.getElementById('f-info')); if (!v.name.trim()) return UI.toast('Le nom de l\'école est obligatoire.', 'err'); Object.assign(D.settings, v); A.save(); document.documentElement.style.setProperty('--orange', v.accent); UI.toast('Informations enregistrées.', 'ok'); SG.db.collection('schools').doc(A.school().id).update({ name: v.name.trim(), updatedAtMs: Date.now() }).catch(() => { }); SG.flush(A.school().id).then(() => location.reload()); };
  ACT['set-ped'] = () => {
    const tot = ST.tr.reduce((a, t) => a + (+t.pct || 0), 0); if (!ST.tr.length || tot !== 100) return UI.toast('Le total des tranches doit faire 100 % (actuellement ' + tot + ' %).', 'err');
    const v = UI.read(document.getElementById('f-ped')); const per = v.periods.split('\n').map(x => x.trim()).filter(Boolean); if (!per.length) return UI.toast('Indiquez au moins une période.', 'err');
    D.settings.tranches = ST.tr.map(t => ({ label: t.label, pct: +t.pct, due: t.due })); D.settings.cantinePrice = +v.cantinePrice || 0; D.settings.compWeight = +v.compWeight || 1; D.settings.periods = per; A.save(); UI.toast('Paramètres enregistrés.', 'ok');
  };
  ACT['set-pw'] = async () => {
    const v = UI.read(document.getElementById('f-pw'));
    if (!v.old) return UI.toast('Saisissez votre mot de passe actuel.', 'err');
    if (v.n1.length < 6) return UI.toast('Au moins 6 caractères.', 'err'); if (v.n1 !== v.n2) return UI.toast('Les mots de passe ne correspondent pas.', 'err');
    try { await SG.changePassword(v.old, v.n1); UI.toast('Mot de passe modifié.', 'ok'); document.getElementById('f-pw').reset(); } catch (e) { UI.toast(SG.errMsg(e), 'err'); }
  };
  ACT['demo-remove'] = () => UI.confirm('Retirer les élèves, professeurs, paiements, notes et avis d\'exemple ? Vos propres données sont conservées.', () => { A.removeDemo(); A.rerender(); UI.toast('Données d\'exemple retirées.', 'ok'); }, { danger: true, yes: 'Retirer' });
  ACT['data-export'] = () => U.download('school-g-' + (D.settings.name || 'ecole').replace(/\W+/g, '-').toLowerCase() + '-' + today() + '.json', JSON.stringify(D));
  ACT['data-reset'] = () => UI.confirm('Effacer <b>toutes</b> les données de l\'école (élèves, paiements, notes...) ? Cette action est définitive. Pensez à exporter une sauvegarde.', () => { const fresh = SG.defaultData(A.school()); const keep = D.settings; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, fresh); Object.assign(D.settings, { name: keep.name, logo: keep.logo, accent: keep.accent, address: keep.address, phone: keep.phone, email: keep.email, city: keep.city }); A.save(); UI.toast('École réinitialisée.'); A.go('#/dashboard'); A.rerender(); }, { danger: true, yes: 'Tout effacer' });

  /* ---------- données d'exemple ---------- */
  const seedRaw = () => {
    const pick = a => a[Math.floor(Math.random() * a.length)], rn = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const empty = !D.students.length;
    if (!D.classes.length) {
      const std = [['Jardin – Petite section', 'Jardin'], ['Jardin – Moyenne section', 'Jardin'], ['Jardin – Grande section', 'Jardin'], ['1ère année', 'Primaire'], ['2ème année', 'Primaire'], ['3ème année', 'Primaire'], ['4ème année', 'Primaire'], ['5ème année', 'Primaire'], ['6ème année', 'Primaire'], ['7ème année', 'Collège'], ['8ème année', 'Collège'], ['9ème année', 'Collège'], ['10ème année', 'Lycée'], ['11ème année', 'Lycée'], ['Terminale', 'Lycée']];
      const price = { Jardin: 75000, Primaire: 90000, 'Collège': 110000, 'Lycée': 140000 };
      const sub = { Jardin: [['Langage', 3], ['Graphisme', 2], ['Éveil', 2], ['Initiation aux mathématiques', 2]], Primaire: [['Français', 3], ['Mathématiques', 3], ['Sciences d\'observation', 2], ['Histoire-Géographie', 2], ['Éducation civique et morale', 1]], 'Collège': [['Français', 3], ['Mathématiques', 3], ['Anglais', 2], ['Histoire-Géographie', 2], ['SVT', 2], ['Physique-Chimie', 2]], 'Lycée': [['Français', 3], ['Mathématiques', 4], ['Physique-Chimie', 3], ['SVT', 3], ['Philosophie', 2], ['Anglais', 2]] };
      std.forEach(([n, cy]) => { const id = uid(); D.classes.push({ id, name: n, cycle: cy, tuition: price[cy], inscription: 10000, capacity: 40, teacherId: '' }); D.subjects[id] = sub[cy].map(([name, coef]) => ({ id: uid(), name, coef })); });
    }
    if (!D.teachers.length) {
      [['Mamadou Keïta', 'Mathématiques', 120000], ['Aïssata Coulibaly', 'Français', 110000], ['Seydou Diarra', 'SVT, Physique', 115000], ['Fanta Sidibé', 'Primaire', 90000], ['Boubacar Traoré', 'Histoire-Géographie', 100000], ['Oumou Konaté', 'Jardin', 80000]].forEach(([name, subjects, salary], i) => D.teachers.push({ id: uid(), name, subjects, salary, phone: '+223 7' + rn(0, 9) + ' ' + rn(10, 99) + ' ' + rn(10, 99) + ' ' + rn(10, 99), contract: i < 4 ? 'Permanent' : 'Vacataire', hired: today(), classes: [] }));
      D.classes.forEach((c, i) => { c.teacherId = D.teachers[i % D.teachers.length].id; });
    }
    if (empty) {
      const y = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      D.settings.tranches = [{ label: '1re tranche', pct: 40, due: y + '-09-30' }, { label: '2e tranche', pct: 35, due: (y + 1) + '-01-15' }, { label: '3e tranche', pct: 25, due: (y + 1) + '-03-15' }];
      const L = ['Traoré', 'Coulibaly', 'Diarra', 'Keïta', 'Sangaré', 'Dembélé', 'Konaté', 'Cissé', 'Touré', 'Sidibé', 'Camara', 'Doumbia', 'Diallo', 'Bagayoko', 'Samaké'], F = ['Aminata', 'Fanta', 'Mariam', 'Kadidia', 'Oumou', 'Awa', 'Salimata', 'Rokia', 'Fatoumata', 'Aïssata'], M = ['Moussa', 'Ibrahim', 'Seydou', 'Mamadou', 'Adama', 'Boubacar', 'Issa', 'Oumar', 'Sékou', 'Bakary'];
      const used = ['1ère année', '3ème année', '6ème année', '9ème année', 'Terminale', 'Jardin – Grande section'].map(n => D.classes.find(c => c.name === n)).filter(Boolean);
      const pays = [0, .4, .75, 1];
      used.forEach(c => { for (let k = 0; k < 6; k++) {
        const sex = Math.random() < .5 ? 'F' : 'M', last = pick(L), first = pick(sex === 'F' ? F : M);
        const s = { id: uid(), matricule: 'ELV-' + String(++D.counters.student).padStart(4, '0'), pin: A.pin(), first, last, sex, birth: (y - rn(5, 17)) + '-0' + rn(1, 9) + '-1' + rn(0, 9), birthplace: 'Bamako', classId: c.id, parent: 'M. ' + last, parentPhone: '+223 7' + rn(0, 9) + ' ' + rn(10, 99) + ' ' + rn(10, 99) + ' ' + rn(10, 99), parentEmail: '', address: 'Bamako', photo: '', discount: 0, cantine: Math.random() < .3, status: 'inscrit', createdAt: today() };
        D.students.push(s); A.addPayment({ studentId: s.id, type: 'Inscription', amount: 10000, date: addDays(today(), -rn(20, 45)).toISOString().slice(0, 10) });
        const frac = pick(pays); if (frac > 0) { const tot = Math.round(c.tuition * frac); const half = Math.round(tot / 2); A.addPayment({ studentId: s.id, type: 'Scolarité', amount: half, method: pick(['Espèces', 'Orange Money', 'Moov Money']), date: addDays(today(), -rn(15, 40)).toISOString().slice(0, 10) }); if (tot - half > 0) A.addPayment({ studentId: s.id, type: 'Scolarité', amount: tot - half, method: pick(['Espèces', 'Orange Money']), date: addDays(today(), -rn(0, 14)).toISOString().slice(0, 10) }); }
        if (s.cantine && Math.random() < .6) A.addPayment({ studentId: s.id, type: 'Cantine', amount: D.settings.cantinePrice, month: today().slice(0, 7) });
      } });
      const per = D.settings.periods[0];
      used.slice(0, 4).forEach(c => { const studs = D.students.filter(s => s.classId === c.id); studs.forEach(s => (D.subjects[c.id] || []).forEach(sb => { D.notes[s.id + '|' + per + '|' + sb.id] = { dev: Math.round(rn(70, 190) / 10 * 4) / 4, comp: Math.round(rn(60, 190) / 10 * 4) / 4 }; })); });
      for (let d = 0; d < 6; d++) { const dt = addDays(today(), -d); if (dt.getDay() === 0 || dt.getDay() === 6) continue; const key = dt.toISOString().slice(0, 10); D.attendance[key] = D.attendance[key] || {}; D.students.slice(0, 18).forEach(s => { const r = Math.random(); D.attendance[key][s.id] = r < .82 ? { s: 'P', t: '' } : r < .92 ? { s: 'R', t: '0' + rn(7, 8) + ':' + rn(10, 59) } : { s: 'A', t: '' }; }); }
    }
    if (!D.stock.length) [['Tenue garçon', 'Tenues', 40, 10, 7500], ['Tenue fille', 'Tenues', 4, 8, 7500], ['Cahier 96 pages', 'Fournitures', 200, 50, 400], ['Boîte de craies', 'Fournitures', 3, 5, 1500], ['Livre de lecture CP', 'Livres', 25, 10, 3500]].forEach(([name, cat, qty, min, price]) => D.stock.push({ id: uid(), name, cat, qty, min, price }));
    if (!D.expenses.length) [['Loyer du mois', 'Loyer', 150000], ['Facture d\'électricité', 'Électricité et eau', 45000], ['Achat de fournitures de bureau', 'Fournitures', 60000], ['Entretien des salles', 'Entretien', 25000]].forEach(([label, cat, amount], i) => D.expenses.push({ id: uid(), label, cat, amount, date: addDays(today(), -i * 3 - 1).toISOString().slice(0, 10), method: 'Espèces', note: '' }));
    if (!D.salaries.length) D.teachers.slice(0, 3).forEach(t => D.salaries.push({ id: uid(), teacherId: t.id, month: today().slice(0, 7), amount: t.salary, method: 'Espèces', date: today(), status: 'payé' }));
    if (!D.notices.length) { D.notices.push({ id: uid(), title: 'Réunion des parents d\'élèves', body: 'Une réunion générale aura lieu samedi à 9 h dans la cour de l\'école. Votre présence est vivement souhaitée.', target: 'all', priority: 'important', date: today() }); D.notices.push({ id: uid(), title: 'Rappel : première tranche de scolarité', body: 'Nous rappelons aux parents que la première tranche de scolarité était à régler avant le 30 septembre.', target: 'all', priority: 'normal', date: addDays(today(), -4).toISOString().slice(0, 10) }); }
    A.save();
  };

  /* Marque tout ce que le chargement d'exemple ajoute, pour pouvoir le retirer sans toucher aux vraies données. */
  const COLS = ['classes', 'students', 'teachers', 'payments', 'salaries', 'expenses', 'stock', 'notices'];
  A.seedDemo = () => {
    const before = {}; COLS.forEach(c => { before[c] = new Set((D[c] || []).map(x => x.id)); });
    const hadTranches = JSON.stringify(D.settings.tranches), hadCounter = D.counters.student;
    seedRaw();
    COLS.forEach(c => (D[c] || []).forEach(x => { if (!before[c].has(x.id)) x.demo = true; }));
    D.demoMeta = D.demoMeta || { tranches: hadTranches, counter: hadCounter };
    A.save();
  };
  A.hasDemo = () => COLS.some(c => (D[c] || []).some(x => x.demo));
  A.removeDemo = () => {
    const demoStu = new Set(D.students.filter(s => s.demo).map(s => s.id));
    const demoCls = new Set(D.classes.filter(c => c.demo).map(c => c.id));
    const demoTea = new Set(D.teachers.filter(t => t.demo).map(t => t.id));
    // une classe d'exemple qui accueille de vrais élèves est conservée
    D.students.forEach(s => { if (!s.demo) demoCls.delete(s.classId); });
    D.students = D.students.filter(s => !s.demo);
    D.payments = D.payments.filter(p => !p.demo && !demoStu.has(p.studentId));
    D.salaries = D.salaries.filter(x => !x.demo && !demoTea.has(x.teacherId));
    D.expenses = D.expenses.filter(x => !x.demo);
    D.stock = D.stock.filter(x => !x.demo);
    D.notices = D.notices.filter(x => !x.demo);
    D.teachers = D.teachers.filter(t => !t.demo);
    D.classes.forEach(c => { if (demoTea.has(c.teacherId)) c.teacherId = ''; });
    D.classes = D.classes.filter(c => !demoCls.has(c.id));
    demoCls.forEach(id => { delete D.subjects[id]; if (D.timetable) delete D.timetable[id]; });
    Object.keys(D.notes || {}).forEach(k => { if (demoStu.has(k.split('|')[0])) delete D.notes[k]; });
    Object.keys(D.attendance || {}).forEach(d => { demoStu.forEach(id => delete D.attendance[d][id]); if (!Object.keys(D.attendance[d]).length) delete D.attendance[d]; });
    if (D.moves) D.moves = D.moves.filter(m => !m.demo);
    if (D.demoMeta) { if (!D.students.length) { D.settings.tranches = JSON.parse(D.demoMeta.tranches); D.counters.student = D.demoMeta.counter; } delete D.demoMeta; }
    A.save();
  };
})();
