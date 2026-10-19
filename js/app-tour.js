/* School-G : mode d'emploi interactif (première connexion), avec bouton « Sauter le mode d'emploi ». */
(function () {
  'use strict';
  const A = window.APP; if (!A) return;
  const { D, U } = A; const { esc } = U;
  const nav = k => '.side a.it[data-k="' + k + '"]';

  const steps = () => [
    { t: 'Bienvenue sur School-G', b: 'Ce mode d\'emploi dure une minute. Il vous montre où se trouve chaque outil pour gérer votre école, du premier élève au dernier paiement.' },
    { sel: nav('settings'), side: 1, t: 'Commencez par les paramètres', b: 'Ajoutez le nom, le logo et l\'adresse de votre école, la couleur, les périodes d\'évaluation et les tranches de scolarité. Ces informations apparaissent sur les bulletins, les reçus et les cartes.' },
    { sel: nav('classes'), side: 1, t: 'Créez vos classes', b: 'Du Jardin à la Terminale : créez vos classes en un clic, avec leurs matières, leurs coefficients et leurs tarifs.' },
    { sel: nav('students'), side: 1, t: 'Inscrivez vos élèves', b: 'Chaque élève a un dossier complet : parents, matricule, code parent, paiements, présences et dernier bulletin. À l\'inscription, un reçu est proposé.' },
    { sel: nav('attendance'), side: 1, t: 'Faites l\'appel', b: 'Pointez chaque jour les présences, les absences et les retards. Les parents les voient dans leur espace.' },
    { sel: nav('grades'), side: 1, t: 'Saisissez les notes', b: 'Entrez les notes de classe et de composition. Les moyennes, les rangs et les appréciations se calculent tout seuls.' },
    { sel: nav('bulletins'), side: 1, t: 'Imprimez les bulletins', b: 'Choisissez un modèle ou créez le vôtre. Vous pouvez même importer le design d\'un de vos bulletins à partir d\'une photo.' },
    { sel: nav('payments'), side: 1, t: 'Encaissez la scolarité', b: 'Enregistrez chaque paiement et remettez un reçu ou une facture, que vous pouvez envoyer en PDF sur WhatsApp. Le reste à payer de chaque élève se met à jour.' },
    { sel: nav('notices'), side: 1, t: 'Informez les parents', b: 'Publiez des avis (réunion, rappel de paiement). Ils s\'affichent dans l\'espace parent, pour toute l\'école ou pour une classe.' },
    { sel: '.topparent', t: 'Donnez l\'accès aux parents', b: 'Ce bouton donne le lien de l\'espace parent, à partager ou à visiter. Chaque parent entre avec le code de l\'école, le matricule de son enfant et son code parent.' },
    { sel: '[data-act=seed]', t: 'Explorez avec des exemples', b: 'Pas envie de tout saisir tout de suite ? Chargez des données d\'exemple pour tester, puis retirez-les en un clic dans Paramètres avant de commencer pour de vrai.', optional: 1 },
    { t: 'Vous êtes prêt', b: 'Vous avez 7 jours d\'essai gratuit pour tout tester. Le bouton « ? » en haut à droite rouvre ce mode d\'emploi quand vous voulez.' }
  ].filter(s => !s.sel || !s.optional || document.querySelector(s.sel));

  let st = null;
  const isMobile = () => window.matchMedia('(max-width:760px)').matches;
  const sideOpen = on => { const s = document.getElementById('side'), c = document.getElementById('scrim'); if (!s) return; s.classList.toggle('open', on); if (c) c.classList.toggle('on', on); };

  function finish(done) {
    if (!st) return; document.removeEventListener('keydown', st.key); window.removeEventListener('resize', st.pos); window.removeEventListener('scroll', st.pos, true);
    st.root.remove(); sideOpen(false); st = null;
    if (done !== false) { D.tourDone = true; A.save(); }
  }

  function show(i) {
    st.i = i; const s = st.steps[i], n = st.steps.length;
    st.root.querySelector('.tr-t').textContent = s.t; st.root.querySelector('.tr-b').textContent = s.b;
    st.root.querySelector('.tr-c').textContent = (i + 1) + ' / ' + n;
    st.root.querySelector('[data-tr=prev]').style.visibility = i ? 'visible' : 'hidden';
    st.root.querySelector('[data-tr=next]').textContent = i === n - 1 ? 'Terminer' : (i === 0 ? 'Commencer' : 'Suivant');
    st.root.querySelector('[data-tr=skip]').style.display = i === n - 1 ? 'none' : '';
    sideOpen(!!(s.side && isMobile()));
    const el = s.sel && document.querySelector(s.sel); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    setTimeout(st.pos, 60); setTimeout(st.pos, 380);
  }

  function place() {
    if (!st) return; const s = st.steps[st.i], hl = st.root.querySelector('.tr-hl'), card = st.root.querySelector('.tr-card');
    const el = s.sel && document.querySelector(s.sel); const r = el && el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(340, vw - 24);
    card.style.width = cw + 'px';
    if (!r || !r.width) { hl.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = Math.max(12, (vw - cw) / 2) + 'px'; card.style.top = Math.max(12, vh / 2 - card.offsetHeight / 2) + 'px'; return; }
    const p = 6; hl.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px`;
    const ch = card.offsetHeight; let x, y;
    if (r.right + 16 + cw < vw && !isMobile()) { x = r.right + 16; y = Math.min(Math.max(12, r.top), vh - ch - 12); }
    else { x = Math.min(Math.max(12, r.left), vw - cw - 12); y = r.bottom + 14 + ch < vh ? r.bottom + 14 : Math.max(12, r.top - ch - 14); }
    card.style.left = x + 'px'; card.style.top = y + 'px';
  }

  A.tourStart = () => {
    if (st) return; const sc = A.school ? A.school() : {};
    const root = document.createElement('div'); root.className = 'tr';
    root.innerHTML = `<div class="tr-blk"></div><div class="tr-hl"></div><div class="tr-card" role="dialog" aria-live="polite"><div class="tr-c"></div><h3 class="tr-t"></h3><p class="tr-b"></p><div class="tr-f"><span style="flex:1"></span><button type="button" class="btn btn-ghost btn-sm" data-tr="prev">Précédent</button><button type="button" class="btn btn-primary btn-sm" data-tr="next">Suivant</button></div><button type="button" class="tr-skip" data-tr="skip">Sauter le mode d'emploi</button></div>`;
    document.body.appendChild(root);
    st = { root, steps: steps(), i: 0, pos: place, key: e => { if (!st) return; if (e.key === 'Escape') finish(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); } };
    const go = d => { const j = st.i + d; if (j >= st.steps.length) return finish(); if (j >= 0) show(j); };
    root.addEventListener('click', e => { const b = e.target.closest('[data-tr]'); if (!b) return; if (b.dataset.tr === 'skip') finish(); else go(b.dataset.tr === 'next' ? 1 : -1); });
    document.addEventListener('keydown', st.key); window.addEventListener('resize', st.pos); window.addEventListener('scroll', st.pos, true);
    if (location.hash && !/#\/dashboard/.test(location.hash)) A.go && A.go('#/dashboard');
    st.steps[0].t = 'Bienvenue' + (sc.director ? ', ' + String(sc.director).split(' ')[0] : '') + ' sur School-G';
    show(0);
  };

  /* Première connexion d'une école vide : lancement automatique (jamais en mode administrateur). */
  A.tourMaybe = () => {
    if (A.sess && A.sess.byAdmin) return;
    if (D.tourDone || (D.students && D.students.length) || (D.classes && D.classes.length)) return;
    setTimeout(() => { if (!document.querySelector('.ov')) A.tourStart(); }, 900);
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-tour]')) { e.preventDefault(); A.tourStart(); } });
})();
