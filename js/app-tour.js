/* School-G : tutoriel interactif. Chaque étape demande une vraie action (cliquer, créer, enregistrer) :
   le guide ne passe à la suite que lorsque l'action est faite. Bouton « Sauter le mode d'emploi » toujours disponible. */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U } = A; const { esc } = U;
  const nav = k => '.side a.it[data-k="' + k + '"]';
  const todayKey = () => U.today();
  const attCount = () => Object.values(D.attendance || {}).reduce((n, d) => n + Object.keys(d || {}).length, 0);

  /* type : info (bouton Suivant) | hash (aller sur une page) | click (cliquer sur un bouton) | data (créer une donnée) | modalClose
     data : condition « déjà fait » ; si elle est déjà vraie au lancement (rejeu du tutoriel), l'étape demande seulement de cliquer. */
  const STEPS = [
    { type: 'info', t: 'Bienvenue', b: 'Ce tutoriel vous guide pas à pas. À chaque étape, faites l\'action demandée : le guide continue tout seul dès que c\'est fait.' },
    { type: 'hash', hash: '#/settings', sel: nav('settings'), side: 1, t: 'Ouvrez les paramètres', b: 'Cliquez sur « Paramètres » dans le menu à gauche.' },
    { type: 'click', page: '#/settings', sel: '[data-act=set-info]', act: 'set-info', t: 'Enregistrez votre école', b: 'Vérifiez le nom de l\'école, ajoutez votre logo si vous le souhaitez, puis cliquez sur « Enregistrer ».' },
    { type: 'hash', hash: '#/classes', sel: nav('classes'), side: 1, t: 'Ouvrez les classes', b: 'Cliquez sur « Classes et matières » dans le menu.' },
    { type: 'data', page: '#/classes', sel: ['[data-act=cls-gen]', '[data-act=cls-new]'], act: 'cls-gen,cls-new', data: () => D.classes.length > 0, t: 'Créez vos classes', b: 'Cliquez sur « Générer les classes standard », choisissez celles de votre école et validez.', mt: 'Choisissez vos classes puis validez avec le bouton en bas de la fenêtre.' },
    { type: 'hash', hash: '#/students', sel: nav('students'), side: 1, t: 'Ouvrez les élèves', b: 'Cliquez sur « Élèves » dans le menu.' },
    { type: 'data', page: '#/students', sel: '[data-act=stu-new]', act: 'stu-new', data: () => D.students.length > 0, t: 'Inscrivez un premier élève', b: 'Cliquez sur « Inscrire un élève », remplissez sa fiche et enregistrez. Un reçu vous sera proposé.', mt: 'Remplissez la fiche de l\'élève puis enregistrez.' },
    { type: 'hash', hash: '#/attendance', sel: nav('attendance'), side: 1, t: 'Ouvrez le pointage', b: 'Cliquez sur « Pointage » dans le menu.' },
    { type: 'data', page: '#/attendance', sel: ['[data-act=att-all]', '[data-act=att]'], act: 'att-all,att', data: () => attCount() > 0, t: 'Faites l\'appel', b: 'Cliquez sur « Marquer tous présents », ou sur P, R ou A en face d\'un élève.' },
    { type: 'hash', hash: '#/payments', sel: nav('payments'), side: 1, t: 'Ouvrez les paiements', b: 'Cliquez sur « Paiements et scolarité » dans le menu.' },
    { type: 'data', page: '#/payments', sel: '[data-act=pay-new]', act: 'pay-new', data: () => D.payments.length > 0, t: 'Enregistrez un paiement', b: 'Cliquez sur « Nouveau paiement », choisissez l\'élève, saisissez le montant et enregistrez. Un reçu ou une facture est proposé, avec envoi par WhatsApp.', mt: 'Choisissez l\'élève, saisissez le montant et enregistrez.' },
    { type: 'hash', hash: '#/notices', sel: nav('notices'), side: 1, t: 'Ouvrez les avis aux parents', b: 'Cliquez sur « Avis aux parents » dans le menu.' },
    { type: 'data', page: '#/notices', sel: '[data-act=not-new]', act: 'not-new', data: () => D.notices.length > 0, t: 'Publiez un avis', b: 'Cliquez sur « Nouvel avis », écrivez un message pour les parents et publiez-le.', mt: 'Écrivez votre avis puis cliquez sur Publier.' },
    { type: 'hash', hash: '#/bulletins', sel: nav('bulletins'), side: 1, t: 'Ouvrez les bulletins', b: 'Cliquez sur « Bulletins » dans le menu.' },
    { type: 'info', page: '#/bulletins', sel: '[data-act=bul-import]', t: 'Vos bulletins', b: 'Choisissez un des modèles, créez le vôtre, ou importez le design de votre bulletin à partir d\'une photo avec ce bouton. Les notes se saisissent dans « Notes ».' },
    { type: 'click', sel: ['.topparent', '.side [data-parent]'], act: '[data-parent]', t: 'Ouvrez l\'espace parent', b: 'Cliquez sur « Espace parent » pour obtenir le lien à donner aux parents.', raw: 1 },
    { type: 'modalClose', t: 'Partagez le lien', b: 'Copiez le lien, partagez-le ou visitez l\'espace parent, puis fermez la fenêtre.', mt: 'Partagez ou copiez le lien, puis fermez la fenêtre.' },
    { type: 'info', t: 'Vous êtes prêt', b: 'Bravo, vous avez fait le tour de School-G. Vous avez 7 jours d\'essai gratuit pour tout tester. Vous pouvez relancer ce tutoriel à tout moment depuis « Tutoriel » dans le menu.' }
  ];

  let st = null;
  const isMobile = () => window.matchMedia('(max-width:760px)').matches;
  const sideOpen = on => { const s = document.getElementById('side'), c = document.getElementById('scrim'); if (!s) return; s.classList.toggle('open', on); if (c) c.classList.toggle('on', on); };
  const pick = sel => { const l = Array.isArray(sel) ? sel : [sel]; for (const q of l) { const e = document.querySelector(q); if (e && e.getClientRects().length) return e; } return null; };
  const modalOpen = () => !!document.querySelector('.ov');
  const onPage = s => !s.page || (location.hash || '#/dashboard') === s.page;

  function finish(done) {
    if (!st) return; clearInterval(st.timer); document.removeEventListener('keydown', st.key); document.removeEventListener('click', st.click, true); window.removeEventListener('resize', st.pos); window.removeEventListener('scroll', st.pos, true);
    st.root.remove(); sideOpen(false); st = null; drop();
    if (done !== false) { D.tourDone = true; A.save(); }
  }

  function show(i) {
    if (i >= STEPS.length) return finish();
    st.i = i; keep(i); st.clicked = false; st.ok = false; const s = STEPS[i], n = STEPS.length, r = st.root;
    // étape « créer une donnée » déjà accomplie (rejeu) : on demande seulement de cliquer
    st.mode = s.type === 'data' ? (s.data() ? 'click' : 'data') : s.type;
    r.querySelector('.tr-t').textContent = i === 0 && st.name ? 'Bienvenue, ' + st.name : s.t;
    r.querySelector('.tr-b').textContent = s.b;
    r.querySelector('.tr-c').textContent = 'Étape ' + (i + 1) + ' sur ' + n;
    const info = s.type === 'info';
    r.classList.toggle('tr-act', !info); r.classList.remove('tr-okk');
    r.querySelector('[data-tr=next]').style.display = info ? '' : 'none';
    r.querySelector('[data-tr=next]').textContent = i === n - 1 ? 'Terminer' : (i === 0 ? 'Commencer' : 'Suivant');
    r.querySelector('.tr-w').style.display = info ? 'none' : '';
    r.querySelector('.tr-skip').style.display = i === n - 1 ? 'none' : '';
    sideOpen(!!(s.side && isMobile()));
    const el = s.sel && pick(s.sel); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    setTimeout(st.pos, 60); setTimeout(st.pos, 380);
  }

  const done = () => { if (!st || st.ok) return; st.ok = true; st.root.classList.add('tr-okk'); const w = st.root.querySelector('.tr-w'); w.textContent = 'Étape réussie'; setTimeout(() => { if (st) { w.textContent = 'En attente de votre action…'; show(st.i + 1); } }, 800); };

  function check() {
    if (!st || st.ok) return; const s = STEPS[st.i];
    if (st.mode === 'hash' && (location.hash || '#/dashboard').indexOf(s.hash) === 0) return done();
    if (st.mode === 'data' && s.data()) return done();
    if (st.mode === 'click' && st.clicked) return done();
    if (st.mode === 'modalClose') { if (modalOpen()) st.sawModal = true; else if (st.sawModal) { st.sawModal = false; return done(); } }
  }

  function place() {
    if (!st) return; check(); if (!st) return;
    const s = STEPS[st.i], r = st.root, hl = r.querySelector('.tr-hl'), card = r.querySelector('.tr-card');
    const modal = modalOpen() && s.type !== 'info';
    r.classList.toggle('tr-modal', modal);
    const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(340, vw - 24);
    const wait = r.querySelector('.tr-w');
    if (modal) {
      hl.style.cssText = 'width:0;height:0'; card.querySelector('.tr-t').style.display = card.querySelector('.tr-c').style.display = 'none';
      card.querySelector('.tr-b').textContent = s.mt || 'Terminez cette action, le guide continue ensuite.'; card.style.width = '280px';
      card.style.left = '16px'; card.style.top = Math.max(12, vh - card.offsetHeight - 16) + 'px'; return;
    }
    card.querySelector('.tr-t').style.display = card.querySelector('.tr-c').style.display = '';
    const el = s.sel && pick(s.sel); const wrong = s.page && !onPage(s);
    card.querySelector('.tr-b').textContent = wrong ? 'Cette étape se passe sur une autre page.' : s.b;
    card.querySelector('.tr-go').style.display = wrong ? '' : 'none';
    card.style.width = cw + 'px';
    const rc = el && !wrong ? el.getBoundingClientRect() : null;
    if (!rc || !rc.width) { hl.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = Math.max(12, (vw - cw) / 2) + 'px'; card.style.top = Math.max(12, vh / 2 - card.offsetHeight / 2) + 'px'; return; }
    const p = 6; hl.style.cssText = `left:${rc.left - p}px;top:${rc.top - p}px;width:${rc.width + 2 * p}px;height:${rc.height + 2 * p}px`;
    const ch = card.offsetHeight; let x, y;
    if (rc.right + 16 + cw < vw && !isMobile()) { x = rc.right + 16; y = Math.min(Math.max(12, rc.top), vh - ch - 12); }
    else { x = Math.min(Math.max(12, rc.left), vw - cw - 12); y = rc.bottom + 14 + ch < vh ? rc.bottom + 14 : Math.max(12, rc.top - ch - 14); }
    card.style.left = x + 'px'; card.style.top = y + 'px';
  }

  const SK = 'sg_tour';
  const saved = () => { try { const v = sessionStorage.getItem(SK); return v == null ? null : +v; } catch (e) { return null; } };
  const keep = i => { try { sessionStorage.setItem(SK, String(i)); } catch (e) { } };
  const drop = () => { try { sessionStorage.removeItem(SK); } catch (e) { } };
  A.tourStart = (from) => {
    if (st) return; const sc = A.school ? A.school() : {};
    const root = document.createElement('div'); root.className = 'tr';
    root.innerHTML = `<div class="tr-blk"></div><div class="tr-hl"></div><div class="tr-card" role="dialog" aria-live="polite"><div class="tr-c"></div><h3 class="tr-t"></h3><p class="tr-b"></p><div class="tr-w">En attente de votre action…</div><div class="tr-f"><span style="flex:1"></span><button type="button" class="btn btn-ghost btn-sm tr-go" data-tr="go" style="display:none">Y aller</button><button type="button" class="btn btn-primary btn-sm" data-tr="next">Suivant</button></div><button type="button" class="tr-skip" data-tr="skip">Sauter le mode d'emploi</button></div>`;
    document.body.appendChild(root);
    st = { root, i: 0, name: sc.director ? String(sc.director).split(' ')[0] : '', pos: place,
      key: e => { if (st && e.key === 'Escape' && !modalOpen()) finish(); },
      click: e => { if (!st) return; const s = STEPS[st.i]; if (s.type !== 'click' && !(s.type === 'data' && st.mode === 'click')) return; const sel = s.raw ? s.act : s.act.split(',').map(a => '[data-act="' + a + '"]').join(','); if (e.target.closest(sel)) { st.clicked = true; keep(st.i + 1); } }
    };
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-tr]'); if (!b) return;
      if (b.dataset.tr === 'skip') finish(); else if (b.dataset.tr === 'next') show(st.i + 1);
      else if (b.dataset.tr === 'go') { const s = STEPS[st.i]; if (s.page) A.go(s.page); }
    });
    document.addEventListener('keydown', st.key); document.addEventListener('click', st.click, true); window.addEventListener('resize', st.pos); window.addEventListener('scroll', st.pos, true);
    st.timer = setInterval(place, 300);
    if (from == null && location.hash && !/#\/dashboard/.test(location.hash)) A.go && A.go('#/dashboard');
    show(from == null ? 0 : from);
  };

  /* Première connexion d'une école vide : lancement automatique (jamais en mode administrateur). */
  A.tourMaybe = () => {
    if (A.sess && A.sess.byAdmin) return;
    const sv = saved(); if (sv != null && !D.tourDone) { setTimeout(() => { if (!modalOpen()) A.tourStart(sv); }, 600); return; }
    if (D.tourDone || (D.students && D.students.length) || (D.classes && D.classes.length)) return;
    setTimeout(() => { if (!modalOpen() && !D.tourDone && !(D.students && D.students.length) && !(D.classes && D.classes.length)) A.tourStart(); }, 900);
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-tour]')) { e.preventDefault(); drop(); A.tourStart(); } });
})();
