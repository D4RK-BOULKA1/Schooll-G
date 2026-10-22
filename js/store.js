/* School-G : couche de données Firebase (authentification Google / email + Firestore).
   Structure Firestore :
     global/config                  tarifs, durée d'essai, contacts, annonce          (lecture publique, écriture admin)
     schools/{uid}                  fiche de l'école et son abonnement                (propriétaire + admin)
     schools/{uid}/d/{cle__n}       données de l'école, découpées en blocs            (propriétaire + admin)
     pub/{codeEcole}                infos publiques pour les parents + accès          (lecture publique)
     pstu/{empreinte}               dossier d'un élève visible par son parent         (lecture par identifiant secret)
     subs/{id}, logs/{id}           abonnements payés et journal                      (admin)
*/
(function () {
  'use strict';
  const C = window.SG_CONFIG, SG = window.SG, UI = window.UI;
  if (!window.firebase) { SG.offline = true; console.error('Firebase non chargé'); }
  const fb = window.firebase;
  if (fb) { fb.initializeApp(C.firebase); }
  const auth = fb && fb.auth(), db = fb && fb.firestore();
  if (db) { try { db.enablePersistence({ synchronizeTabs: true }).catch(() => { }); } catch (e) { } }
  SG.auth = auth; SG.db = db;

  const iso = n => n ? new Date(n).toISOString() : null;
  const ms = d => d ? new Date(d).getTime() : null;
  const CHUNK = 300000;

  /* ---------- erreurs lisibles ---------- */
  const ERR = {
    'auth/invalid-credential': 'Email ou mot de passe incorrect.', 'auth/wrong-password': 'Email ou mot de passe incorrect.', 'auth/user-not-found': 'Email ou mot de passe incorrect.', 'auth/invalid-login-credentials': 'Email ou mot de passe incorrect.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet email. Connectez-vous.', 'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).', 'auth/invalid-email': 'Adresse email invalide.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.', 'auth/popup-closed-by-user': 'Connexion Google annulée.', 'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/unauthorized-domain': 'Ce site n\'est pas autorisé dans Firebase (Authentication, Paramètres, Domaines autorisés).', 'auth/operation-not-allowed': 'Ce mode de connexion n\'est pas activé dans Firebase.',
    'auth/requires-recent-login': 'Reconnectez-vous puis réessayez.', 'permission-denied': 'Action refusée par les règles de sécurité Firestore.', 'unavailable': 'Service momentanément injoignable. Vérifiez votre connexion.'
  };
  SG.errMsg = e => ERR[e && e.code] || (e && e.message) || 'Erreur inattendue.';

  /* ---------- configuration globale ---------- */
  SG._global = { trialDays: C.trialDays, plans: C.plans, announcement: '', contactWa: C.contact.whatsapp, contactMail: C.contact.email };
  /* Le tarif « Paiement unique » (sans prix, sur demande) est toujours présent, même si la configuration enregistrée est plus ancienne. */
  const UNIQ = C.plans.find(p => p.id === 'unique');
  const fixPlans = () => { const g = SG._global; if (UNIQ && Array.isArray(g.plans) && !g.plans.some(p => p.id === 'unique')) g.plans = g.plans.concat([Object.assign({}, UNIQ)]); };
  SG.planPrice = p => (p.price == null || p.price === '') ? 'Sur demande' : (UI.money ? UI.money(p.price) : p.price + ' FCFA');
  SG.planOnRequest = p => p.price == null || p.price === '';
  SG.planPeriod = p => p.months >= 600 ? 'paiement unique' : (p.months > 1 ? p.months + ' mois' : 'mois');
  SG.global = () => SG._global;
  SG.loadGlobal = async () => { if (!db) return SG._global; try { const d = await db.collection('global').doc('config').get(); if (d.exists) Object.assign(SG._global, d.data()); } catch (e) { } fixPlans(); return SG._global; };
  /* Écoute en direct : la fiche de l'école (statut, abonnement) et la configuration globale (annonce, tarifs). */
  SG.watchGlobal = cb => db.collection('global').doc('config').onSnapshot(d => { if (d.exists) { Object.assign(SG._global, d.data()); } fixPlans(); cb && cb(SG._global); }, () => { });
  SG.setGlobal = async o => { await db.collection('global').doc('config').set(o, { merge: true }); Object.assign(SG._global, o); };
  /* Contenu modifiable de la page d'accueil (global/site) : textes par identifiant et sections masquées. */
  const siteCache = () => { try { return JSON.parse(localStorage.getItem('sg_site') || 'null'); } catch (e) { return null; } };
  SG._site = siteCache() || { texts: {}, hidden: {} };
  SG.site = () => SG._site;
  const setSite = d => { SG._site = { texts: (d && d.texts) || {}, hidden: (d && d.hidden) || {} }; try { localStorage.setItem('sg_site', JSON.stringify(SG._site)); } catch (e) { } return SG._site; };
  SG.watchSite = cb => db.collection('global').doc('site').onSnapshot(d => { cb && cb(setSite(d.exists ? d.data() : null)); }, () => { });
  SG.loadSite = async () => { const d = await db.collection('global').doc('site').get(); return setSite(d.exists ? d.data() : null); };
  SG.saveSite = async site => { await db.collection('global').doc('site').set({ texts: site.texts || {}, hidden: site.hidden || {}, updatedAtMs: Date.now() }); setSite(site); };

  /* ---------- authentification ---------- */
  let readyP = null;
  SG.user = null;
  SG.ready = () => readyP || (readyP = (async () => {
    if (!auth) return null;
    auth.getRedirectResult().catch(() => { });
    const u = await new Promise(res => { const un = auth.onAuthStateChanged(x => { un(); res(x); }); });
    SG.user = u; await SG.loadGlobal(); return u;
  })());
  if (auth) auth.onAuthStateChanged(u => { SG.user = u; });
  SG.isAdmin = () => !!(SG.user && SG.user.emailVerified && SG.user.email && SG.user.email.toLowerCase() === C.adminEmail.toLowerCase());
  SG.hasPassword = () => !!(SG.user && SG.user.providerData.some(p => p.providerId === 'password'));
  SG.loginEmail = async (email, pw) => (await auth.signInWithEmailAndPassword(String(email).trim(), pw)).user;
  SG.signupEmail = async (email, pw) => (await auth.createUserWithEmailAndPassword(String(email).trim(), pw)).user;
  SG.loginGoogle = async () => {
    const p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { return (await auth.signInWithPopup(p)).user; }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) { await auth.signInWithRedirect(p); return null; } throw e; }
  };
  SG.resetPassword = email => auth.sendPasswordResetEmail(String(email).trim());
  SG.sendVerification = () => SG.user.sendEmailVerification();
  SG.logout = async () => { SG.adminCodeClear(); SG.stopWatch(); try { await SG.flushAll(); } catch (e) { } await auth.signOut(); };
  SG.changePassword = async (oldPw, newPw) => {
    const u = SG.user; await u.reauthenticateWithCredential(fb.auth.EmailAuthProvider.credential(u.email, oldPw)); await u.updatePassword(newPw);
  };

  /* ---------- écoles ---------- */
  const fromDoc = (id, d) => ({ id, code: d.code, name: d.name, director: d.director, email: d.ownerEmail || '', phone: d.phone || '', city: d.city || '', createdAt: iso(d.createdAtMs), trialEnd: iso(d.trialEndMs), paidUntil: iso(d.paidUntilMs), plan: d.plan || '', blocked: !!d.blocked, banned: !!d.banned, trialCancelled: !!d.trialCancelled, notes: d.notes || '', stats: d.stats || {}, ownerUid: d.ownerUid, referredBy: d.referredBy || '', refRewarded: !!d.refRewarded, crm: d.crm || {}, updatedAt: iso(d.updatedAtMs) });
  const toPatch = p => {
    const o = {}; const map = { name: 'name', director: 'director', phone: 'phone', city: 'city', plan: 'plan', notes: 'notes', crm: 'crm', refRewarded: 'refRewarded', blocked: 'blocked', banned: 'banned', trialCancelled: 'trialCancelled', email: 'ownerEmail', stats: 'stats' };
    Object.keys(p).forEach(k => { if (map[k]) o[map[k]] = p[k]; });
    if ('trialEnd' in p) o.trialEndMs = ms(p.trialEnd); if ('paidUntil' in p) o.paidUntilMs = ms(p.paidUntil);
    return o;
  };
  SG.watchSchool = (id, cb) => db.collection('schools').doc(id).onSnapshot(d => { if (d.exists) cb(fromDoc(d.id, d.data())); }, () => { });
  SG.watchSchools = cb => db.collection('schools').onSnapshot(snap => { const l = []; snap.forEach(d => { const x = fromDoc(d.id, d.data()); SG._byId[x.id] = x; l.push(x); }); cb(l); }, () => { });
  SG.school = async id => { const d = await db.collection('schools').doc(id).get(); return d.exists ? fromDoc(d.id, d.data()) : null; };
  SG.mySchool = () => SG.school(SG.user.uid);
  const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = () => Array.from({ length: 6 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join('');
  SG.pin = () => Array.from({ length: 8 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join('');

  SG.createSchool = async f => {
    const u = SG.user; if (!u) throw new Error('Non connecté.');
    const g = SG.global(), now = Date.now(), trialEndMs = now + g.trialDays * 864e5;
    let ref = String(f.ref || '').trim().toUpperCase();
    if (ref) { const r = await db.collection('pub').doc(ref).get().catch(() => null); if (!r || !r.exists || r.data().ownerUid === u.uid) ref = ''; }
    for (let i = 0; i < 8; i++) {
      const code = genCode();
      const sd = { ownerUid: u.uid, ownerEmail: u.email || '', name: f.name.trim(), director: f.director.trim(), phone: f.phone.trim(), city: (f.city || '').trim(), code, createdAtMs: now, plan: 'Essai gratuit', trialEndMs, paidUntilMs: null, trialCancelled: false, blocked: false, banned: false, notes: '', stats: { students: 0, classes: 0, teachers: 0, revenue: 0 }, updatedAtMs: now };
      if (ref) { sd.referredBy = ref; sd.refRewarded = false; }
      const b = db.batch();
      b.set(db.collection('schools').doc(u.uid), sd);
      if (ref) b.set(db.collection('refs').doc(u.uid), { code: ref, ownerUid: u.uid, name: sd.name, createdAtMs: now, rewarded: false });
      b.set(db.collection('pub').doc(code), { ownerUid: u.uid, schoolId: u.uid, name: sd.name, access: { trialEndMs, paidUntilMs: null, trialCancelled: false, blocked: false, banned: false }, settingsJson: '{}', noticesJson: '[]', themeJson: 'null', updatedAtMs: now });
      try { await b.commit(); return fromDoc(u.uid, sd); }
      catch (e) { if (e.code !== 'permission-denied') throw e; const ex = await SG.mySchool().catch(() => null); if (ex) return ex; if (i === 7) throw e; }
    }
  };

  /* ---------- données de l'école (découpées en blocs) ---------- */
  const st = {}; // par école : { last:{cle:chaine}, n:{cle:nb}, timer, chain, watch, D }
  const S = id => st[id] || (st[id] = { last: {}, n: {}, timer: null, chain: Promise.resolve(), unsub: null, D: null, stats: null });
  const dcol = id => db.collection('schools').doc(id).collection('d');
  const group = snap => { const g = {}; snap.forEach(doc => { const d = doc.data(); const x = g[d.key] || (g[d.key] = { n: d.n, parts: {} }); x.n = d.n; x.parts[d.i] = d.s; }); const out = {}; Object.keys(g).forEach(k => { let s = ''; for (let i = 0; i < g[k].n; i++) { if (g[k].parts[i] == null) { s = null; break; } s += g[k].parts[i]; } if (s != null) out[k] = { s, n: g[k].n }; }); return out; };

  SG.loadData = async (id, opt = {}) => {
    const snap = await dcol(id).get(); const g = group(snap); const s = S(id); s.last = {}; s.n = {}; const D = {};
    Object.keys(g).forEach(k => { try { D[k] = JSON.parse(g[k].s); s.last[k] = g[k].s; s.n[k] = g[k].n; } catch (e) { } });
    if (opt.peek) return Object.keys(D).length ? D : null;
    const sch = opt.school || await SG.school(id); const def = SG.defaultData(sch || {});
    const fresh = !Object.keys(D).length; const out = Object.assign(def, D); out.settings = Object.assign(def.settings, D.settings || {});
    s.D = out; if (fresh && !opt.readonly) SG.saveData(id, out);
    return out;
  };

  const syncCbs = []; SG.onSync = cb => syncCbs.push(cb); const setSync = (v, e) => syncCbs.forEach(cb => cb(v, e));

  SG.saveData = (id, D) => { const s = S(id); s.D = D; clearTimeout(s.timer); setSync('pending'); s.timer = setTimeout(() => SG.flush(id), 900); };
  SG.flush = id => {
    const s = S(id); clearTimeout(s.timer); s.timer = null;
    s.chain = s.chain.then(async () => {
      const D = s.D; if (!D) return; setSync('saving');
      try {
        let b = db.batch(), ops = 0; const staged = {};
        const commit = async () => { if (ops) { await b.commit(); b = db.batch(); ops = 0; } };
        for (const key of Object.keys(D)) {
          const str = JSON.stringify(D[key]); if (str === undefined || s.last[key] === str) continue;
          const n = Math.max(1, Math.ceil(str.length / CHUNK)), oldN = s.n[key] || 0;
          for (let i = 0; i < n; i++) { b.set(dcol(id).doc(key + '__' + i), { key, i, n, s: str.slice(i * CHUNK, (i + 1) * CHUNK) }); if (++ops >= 400) await commit(); }
          for (let i = n; i < oldN; i++) { b.delete(dcol(id).doc(key + '__' + i)); ops++; }
          staged[key] = [str, n];
        }
        Object.keys(staged).forEach(k => { s.last[k] = staged[k][0]; s.n[k] = staged[k][1]; }); // optimiste : évite le faux écho temps réel
        try { await commit(); } catch (e) { Object.keys(staged).forEach(k => { delete s.last[k]; }); throw e; }
        setSync('saved'); afterFlush(id, D);
      } catch (e) { console.error('Sauvegarde', e); setSync('error', e); }
    });
    return s.chain;
  };
  SG.flushAll = () => Promise.all(Object.keys(st).map(id => SG.flush(id)));
  window.addEventListener('pagehide', () => { Object.keys(st).forEach(id => { if (st[id].timer) SG.flush(id); }); });
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Object.keys(st).forEach(id => { if (st[id].timer) SG.flush(id); }); });

  /* temps réel : un autre appareil modifie les données */
  SG.watchData = (id, D, onRemote) => {
    const s = S(id); if (s.unsub) s.unsub();
    s.unsub = dcol(id).onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites) return;
      const g = group(snap), changed = [];
      Object.keys(g).forEach(k => {
        if (g[k].s === s.last[k]) return;
        const local = JSON.stringify(D[k]); if (local !== s.last[k]) return; // modifications locales non enregistrées : on garde
        try { D[k] = JSON.parse(g[k].s); s.last[k] = g[k].s; s.n[k] = g[k].n; changed.push(k); } catch (e) { }
      });
      if (changed.length && onRemote) onRemote(changed);
    }, () => { });
  };
  SG.stopWatch = () => Object.keys(st).forEach(id => { if (st[id].unsub) { st[id].unsub(); st[id].unsub = null; } });

  /* ---------- statistiques + publication pour les parents ---------- */
  let pubTimer = null;
  function afterFlush(id, D) {
    const sch = SG._cur && SG._cur.id === id ? SG._cur : null; if (!sch) return;
    const stats = { students: D.students.filter(x => x.status !== 'radié').length, classes: D.classes.length, teachers: D.teachers.length, revenue: D.payments.filter(p => p.status === 'validé').reduce((a, p) => a + (+p.amount || 0), 0) };
    const s = S(id), sk = JSON.stringify(stats);
    if (s.stats !== sk) { db.collection('schools').doc(id).update({ stats, updatedAtMs: Date.now() }).then(() => { s.stats = sk; }).catch(() => { }); }
    clearTimeout(pubTimer); pubTimer = setTimeout(() => SG.publish(id, D, sch).catch(e => console.error('Publication parents', e)), 3000);
  }
  SG.setCurrent = sch => { SG._cur = sch; };

  async function sha(str) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  SG.studentKey = (code, mat, pin) => sha('sg|' + String(code).trim().toUpperCase() + '|' + String(mat).trim().toUpperCase() + '|' + String(pin).trim().toUpperCase());

  function studentPayload(D, s, rc) {
    const cl = D.classes.find(c => c.id === s.classId) || {}; const subs = D.subjects[s.classId] || []; const results = {};
    D.settings.periods.forEach(per => {
      const R = rc[s.classId + '|' + per] || (rc[s.classId + '|' + per] = DOC.results(D, s.classId, per)); const me = R.list.find(x => x.student.id === s.id);
      if (me && me.mean != null) results[per] = { mean: me.mean, total: me.total, coef: me.coef, rank: me.rank, count: R.count, classMean: R.classMean, max: R.max, min: R.min, rows: me.rows.map(r => ({ n: r.sub.name, coef: r.coef, dev: r.dev, comp: r.comp, avg: r.avg, total: r.total })) };
    });
    const tt = {}; const T = D.timetable[s.classId] || {}; Object.keys(T).forEach(k => { const t = D.teachers.find(q => q.id === T[k].teacherId); tt[k] = { subject: T[k].subject, brk: !!T[k].brk, teacher: t ? t.name : '' }; });
    const att = {}; Object.keys(D.attendance).forEach(d => { if (D.attendance[d][s.id]) att[d] = D.attendance[d][s.id]; });
    const pays = D.payments.filter(p => p.studentId === s.id && p.status === 'validé').map(p => ({ date: p.date, type: p.type, amount: p.amount, method: p.method, ref: p.ref, month: p.month }));
    return { student: { first: s.first, last: s.last, sex: s.sex, birth: s.birth, birthplace: s.birthplace, matricule: s.matricule, photo: s.photo, parent: s.parent, parentPhone: s.parentPhone, discount: s.discount, cantine: s.cantine, address: s.address, createdAt: s.createdAt }, cls: { id: cl.id, name: cl.name, cycle: cl.cycle, tuition: cl.tuition }, subs: subs.map(x => ({ id: x.id, name: x.name, coef: x.coef })), results, tt, att, pays };
  }

  SG.publish = async (id, D, sch) => {
    const s = S(id), S0 = D.settings, pc = s.pubCache || (s.pubCache = { pub: '', stu: {} });
    const pubSettings = { name: S0.name, address: S0.address, city: S0.city, phone: S0.phone, email: S0.email, logo: S0.logo, year: S0.year, motto: S0.motto, accent: S0.accent, tranches: S0.tranches, periods: S0.periods, days: S0.days, slots: S0.slots, ministry: S0.ministry, academy: S0.academy, cantinePrice: S0.cantinePrice };
    const settingsJson = JSON.stringify(pubSettings), noticesJson = JSON.stringify(D.notices.map(n => ({ id: n.id, title: n.title, body: n.body, target: n.target, priority: n.priority, date: n.date }))), themeJson = JSON.stringify(D.customTheme || null);
    const pk = settingsJson + '|' + noticesJson + '|' + themeJson;
    if (pc.pub !== pk) { await db.collection('pub').doc(sch.code).update({ name: S0.name, settingsJson, noticesJson, themeJson, updatedAtMs: Date.now() }); pc.pub = pk; }
    const rc = {}, cur = {};
    for (const stu of D.students) { if (stu.status === 'radié' || !stu.pin) continue; const key = await SG.studentKey(sch.code, stu.matricule, stu.pin); cur[key] = JSON.stringify(studentPayload(D, stu, rc)); }
    let b = db.batch(), ops = 0; const flushB = async () => { if (ops) { await b.commit(); b = db.batch(); ops = 0; } }; const done = {};
    for (const key of Object.keys(cur)) { if (pc.stu[key] === cur[key]) continue; b.set(db.collection('pstu').doc(key), { ownerUid: sch.ownerUid || id, p: cur[key], updatedAtMs: Date.now() }); done[key] = cur[key]; if (++ops >= 400) await flushB(); }
    for (const key of Object.keys(pc.stu)) { if (!(key in cur)) { b.delete(db.collection('pstu').doc(key)); ops++; if (ops >= 400) await flushB(); } }
    await flushB();
    Object.keys(done).forEach(k => { pc.stu[k] = done[k]; }); Object.keys(pc.stu).forEach(k => { if (!(k in cur)) delete pc.stu[k]; });
  };

  /* ---------- espace parent ---------- */
  const accessObj = a => ({ banned: !!a.banned, blocked: !!a.blocked, paidUntil: iso(a.paidUntilMs), trialEnd: iso(a.trialEndMs), trialCancelled: !!a.trialCancelled });
  SG.parentLogin = async (code, mat, pin) => {
    code = String(code).trim().toUpperCase(); const key = await SG.studentKey(code, mat, pin);
    let sd, pd;
    try { [sd, pd] = await Promise.all([db.collection('pstu').doc(key).get(), db.collection('pub').doc(code).get()]); } catch (e) { throw new Error(SG.errMsg(e)); }
    if (!pd.exists) throw new Error('Code école introuvable.');
    if (!sd.exists) throw new Error('Matricule ou code parent incorrect.');
    const stt = SG.status(accessObj(pd.data().access)); if (stt !== 'active' && stt !== 'trial') throw new Error('Cet espace est momentanément indisponible. Contactez l\'école.');
    SG.wr('psess', { code, key }); return { code, key };
  };
  SG.parentSession = () => SG.rd('psess', null);
  SG.parentLogout = () => { try { localStorage.removeItem('sgv1_psess'); } catch (e) { } };
  SG.watchParent = (sess, cb) => {
    const cur = {}; const emit = () => { if (cur.s && cur.p) cb(null, cur); };
    const u1 = db.collection('pstu').doc(sess.key).onSnapshot(d => { cur.s = d; if (!d.exists) return cb(new Error('gone')); emit(); }, e => cb(e));
    const u2 = db.collection('pub').doc(sess.code).onSnapshot(d => { cur.p = d; emit(); }, e => cb(e));
    return () => { u1(); u2(); };
  };
  SG.accessOf = accessObj;

  /* ---------- administration ---------- */
  SG._byId = {};
  SG.schools = async () => { const snap = await db.collection('schools').get(); const l = []; snap.forEach(d => { const s = fromDoc(d.id, d.data()); SG._byId[s.id] = s; l.push(s); }); return l; };
  SG.updateSchool = async (id, patch) => {
    const s = SG._byId[id] || await SG.school(id); const sp = toPatch(patch); sp.updatedAtMs = Date.now();
    await db.collection('schools').doc(id).update(sp);
    const acc = {}; ['trialEndMs', 'paidUntilMs', 'trialCancelled', 'blocked', 'banned'].forEach(k => { if (k in sp) acc['access.' + k] = sp[k]; });
    if (Object.keys(acc).length && s.code) await db.collection('pub').doc(s.code).update(acc);
    if (sp.name && s.code) await db.collection('pub').doc(s.code).update({ name: sp.name }).catch(() => { });
    Object.assign(s, patch); SG._byId[id] = s; return s;
  };
  /* Parrainage : le code de parrainage est le code de l'école. */
  SG.myReferrals = async code => { const snap = await db.collection('refs').where('code', '==', code).get(); const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l.sort((a, b) => b.createdAtMs - a.createdAtMs); };
  SG.allReferrals = async () => { const snap = await db.collection('refs').get(); const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; };
  /* Offre 1 mois au parrain (admin) et marque le filleul comme récompensé. */
  SG.grantReferral = async (refId, parentSchool) => {
    const day = 30 * 864e5, now = Date.now(), p = parentSchool, st = SG.status(p), patch = {};
    if (st === 'active') patch.paidUntil = new Date(ms(p.paidUntil) + day).toISOString();
    else if (st === 'trial') patch.trialEnd = new Date(ms(p.trialEnd) + day).toISOString();
    else { patch.paidUntil = new Date(now + day).toISOString(); patch.plan = 'Parrainage'; patch.trialCancelled = false; }
    await SG.updateSchool(p.id, patch);
    await db.collection('refs').doc(refId).update({ rewarded: true, rewardedMs: now });
    await SG.updateSchool(refId, { refRewarded: true });
  };
  SG.subs = async () => { const snap = await db.collection('subs').orderBy('dateMs', 'desc').limit(300).get(); const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; };
  SG.recordSub = async (schoolId, o) => {
    const s = SG._byId[schoolId] || await SG.school(schoolId);
    const base = s.paidUntil && new Date(s.paidUntil) > Date.now() ? new Date(s.paidUntil) : new Date();
    const until = new Date(base.getTime() + Math.round(30.4 * o.months) * 864e5);
    const ref = db.collection('subs').doc();
    await ref.set({ schoolId, schoolName: s.name, amount: +o.amount || 0, months: o.months, plan: o.plan || '', method: o.method || '', ref: o.ref || '', date: UI.today(), dateMs: Date.now(), status: 'validé', note: o.note || '', prevPaidUntil: s.paidUntil || null });
    await SG.updateSchool(schoolId, { paidUntil: until.toISOString(), plan: o.plan || 'Abonnement', blocked: false, trialCancelled: false });
    SG.log('Abonnement enregistré : ' + s.name + ' (' + o.months + ' mois)');
  };
  SG.refundSub = async x => {
    await db.collection('subs').doc(x.id).update({ status: 'annulé' });
    if (SG._byId[x.schoolId] || x.schoolId) await SG.updateSchool(x.schoolId, { paidUntil: x.prevPaidUntil || null });
    SG.log('Paiement annulé : ' + x.schoolName);
  };
  SG.logs = async () => { const snap = await db.collection('logs').orderBy('tMs', 'desc').limit(120).get(); const l = []; snap.forEach(d => l.push(d.data())); return l; };
  SG.log = msg => { if (SG.isAdmin()) db.collection('logs').add({ m: msg, tMs: Date.now() }).catch(() => { }); };
  /* Messages de l'administrateur : target = 'all' (toutes les écoles) ou l'identifiant d'une école */
  SG.sendMessage = async o => { await db.collection('msgs').add({ target: o.target, targetName: o.targetName || '', title: String(o.title || '').trim(), body: String(o.body || '').trim(), createdMs: Date.now() }); SG.log('Message envoyé à ' + (o.target === 'all' ? 'toutes les écoles' : o.targetName) + ' : ' + o.title); };
  SG.deleteMessage = id => db.collection('msgs').doc(id).delete();
  SG.allMessages = async () => { const snap = await db.collection('msgs').orderBy('createdMs', 'desc').limit(100).get(); const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; };
  SG.watchMessages = (uid, cb) => db.collection('msgs').where('target', 'in', ['all', uid]).onSnapshot(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); l.sort((a, b) => b.createdMs - a.createdMs); cb(l); }, () => cb([]));
  /* Code d'accès au panel admin (en plus de la connexion). Vérifié ici dans le navigateur : la vraie protection des données reste les règles Firestore. */
  const AK = 'sg_adm_ok'; let _fails = 0, _until = 0;
  SG.adminCodeOk = () => { try { return sessionStorage.getItem(AK) === '1'; } catch (e) { return false; } };
  SG.adminCodeClear = () => { try { sessionStorage.removeItem(AK); } catch (e) { } };
  SG.checkAdminCode = async code => {
    if (Date.now() < _until) return 'Trop d\'essais. Réessayez dans ' + Math.ceil((_until - Date.now()) / 1000) + ' secondes.';
    if (await SG.hash(String(code || '')) === SG_CONFIG.adminCodeHash) { _fails = 0; try { sessionStorage.setItem(AK, '1'); } catch (e) { } return true; }
    if (++_fails >= 5) { _fails = 0; _until = Date.now() + 60000; return 'Code incorrect. Trop d\'essais : attendez une minute.'; }
    return 'Code d\'accès incorrect.';
  };
  SG.sendReset = email => SG.resetPassword(email);
})();
