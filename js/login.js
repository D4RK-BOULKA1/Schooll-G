(function () {
  'use strict';
  const tabs = ['login', 'signup', 'parent', 'teacher', 'finish'];
  const $ = id => document.getElementById(id);
  function show(t) {
    if (!tabs.includes(t)) t = 'login';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('tabs').style.display = t === 'finish' ? 'none' : '';
    document.querySelectorAll('[data-p]').forEach(p => p.hidden = p.dataset.p !== t);
    if (location.hash.slice(1) !== t) history.replaceState(null, '', '#' + t);
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); });
  document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); show(a.dataset.go); } });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  const err = (id, m) => { const e = $('e-' + id); if (e) { e.textContent = m || ''; e.style.display = m ? 'block' : 'none'; } };
  const busy = (f, on) => { const b = f.querySelector('button.btn'); if (b) b.disabled = on; };
  const go = () => { location.href = 'app.html#/dashboard'; };
  let pending = 'login'; // onglet d'où vient l'action Google

  /* Après toute authentification : l'école existe-t-elle ? */
  async function afterAuth(tab) {
    const sch = await SG.mySchool();
    if (sch) return go();
    const u = SG.user; const f = $('f-finish');
    if (u && u.displayName && !f.director.value) f.director.value = u.displayName;
    err(tab || 'login', ''); show('finish');
  }

  async function google(tab) {
    pending = tab; err(tab, '');
    document.querySelectorAll('[data-google]').forEach(b => b.disabled = true);
    try { const u = await SG.loginGoogle(); if (u) await afterAuth(tab); }
    catch (x) { err(tab, SG.errMsg(x)); }
    document.querySelectorAll('[data-google]').forEach(b => b.disabled = false);
  }
  document.querySelectorAll('[data-google]').forEach(b => b.addEventListener('click', () => google(b.closest('[data-p]').dataset.p)));

  $('f-login').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, v = UI.read(f); err('login'); if ($('o-login')) $('o-login').style.display = 'none';
    if (!v.email.trim() || !v.pw) return err('login', 'Renseignez votre email et votre mot de passe.');
    busy(f, true);
    try { await SG.loginEmail(v.email, v.pw); await afterAuth('login'); } catch (x) { err('login', SG.errMsg(x)); }
    busy(f, false);
  });

  $('forgot').addEventListener('click', async () => {
    const email = $('f-login').email.value.trim(); err('login');
    if (!email) return err('login', 'Saisissez votre email ci-dessus, puis cliquez sur « Mot de passe oublié ».');
    try { await SG.resetPassword(email); const o = $('o-login'); o.textContent = 'Un email de réinitialisation a été envoyé à ' + email + '.'; o.style.display = 'block'; }
    catch (x) { err('login', SG.errMsg(x)); }
  });

  $('f-signup').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, v = UI.read(f); err('signup');
    if (!v.name.trim() || !v.director.trim() || !v.email.trim() || !v.phone.trim() || !v.password) return err('signup', 'Merci de remplir tous les champs obligatoires.');
    if (v.password.length < 6) return err('signup', 'Le mot de passe doit contenir au moins 6 caractères.');
    if (v.password !== v.confirm) return err('signup', 'Les deux mots de passe ne correspondent pas.');
    busy(f, true);
    try { await SG.signupEmail(v.email, v.password); await SG.createSchool(v); go(); }
    catch (x) { err('signup', SG.errMsg(x)); busy(f, false); }
  });

  $('f-finish').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, v = UI.read(f); err('finish');
    if (!v.name.trim() || !v.director.trim() || !v.phone.trim()) return err('finish', 'Merci de remplir tous les champs obligatoires.');
    busy(f, true);
    try { await SG.createSchool(v); go(); } catch (x) { err('finish', SG.errMsg(x)); busy(f, false); }
  });
  $('cancelFinish').addEventListener('click', async () => { await SG.logout(); show('login'); });

  $('f-parent').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, v = UI.read(f); err('parent');
    if (!v.code.trim() || !v.mat.trim() || !v.pin.trim()) return err('parent', 'Renseignez les trois codes.');
    busy(f, true);
    try { await SG.parentLogin(v.code, v.mat, v.pin); location.href = 'parent.html'; } catch (x) { err('parent', x.message); busy(f, false); }
  });

  $('f-teacher').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, v = UI.read(f); err('teacher');
    if (!v.code.trim() || !v.pin.trim()) return err('teacher', 'Renseignez le code de l\'école et votre code enseignant.');
    busy(f, true);
    try { await SG.teacherLogin(v.code, v.pin); location.href = 'teacher.html'; } catch (x) { err('teacher', x.message); busy(f, false); }
  });

  /* Lien de parrainage : ?ref=CODE pré-remplit le champ et ouvre l'inscription. */
  (function () { const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search); if (!m) return; try { sessionStorage.setItem('sg_ref', m[1].toUpperCase()); } catch (e) { } if (!location.hash) location.hash = '#signup'; })();
  (function () { let r = ''; try { r = sessionStorage.getItem('sg_ref') || ''; } catch (e) { } if (r) document.querySelectorAll('input[name=ref]').forEach(i => { i.value = r; }); })();

  /* Démarrage : si déjà connecté (ou retour d'une redirection Google), on continue directement. */
  show(location.hash.slice(1) || 'login');
  SG.ready().then(async u => {
    const h = location.hash.slice(1);
    if (u && h !== 'parent' && h !== 'teacher' && !/[?&]out=1/.test(location.search)) { try { await afterAuth(h === 'signup' ? 'signup' : 'login'); } catch (x) { err('login', SG.errMsg(x)); } }
  });
})();
