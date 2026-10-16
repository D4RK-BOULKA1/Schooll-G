(function () {
  const s = SG.session();
  const tabs = ['login', 'signup', 'parent'];
  function show(t) {
    if (!tabs.includes(t)) t = 'login';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    document.querySelectorAll('[data-p]').forEach(p => p.hidden = p.dataset.p !== t);
    if (location.hash.slice(1) !== t) history.replaceState(null, '', '#' + t);
  }
  document.getElementById('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); });
  document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); show(a.dataset.go); } });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || 'login');

  const err = (id, m) => { const e = document.getElementById('e-' + id); e.textContent = m || ''; e.style.display = m ? 'block' : 'none'; };
  const busy = (f, on) => { const b = f.querySelector('button.btn'); if (b) b.disabled = on; };

  document.getElementById('f-login').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; const v = UI.read(f); err('login'); busy(f, true);
    try { await SG.login(v.email, v.pw); location.href = 'app.html'; } catch (x) { err('login', x.message); busy(f, false); }
  });
  document.getElementById('f-signup').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; const v = UI.read(f); err('signup');
    if (!v.name.trim() || !v.director.trim() || !v.email.trim() || !v.phone.trim() || !v.password) return err('signup', 'Merci de remplir tous les champs obligatoires.');
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return err('signup', 'Adresse email invalide.');
    if (v.password.length < 6) return err('signup', 'Le mot de passe doit contenir au moins 6 caractères.');
    if (v.password !== v.confirm) return err('signup', 'Les deux mots de passe ne correspondent pas.');
    busy(f, true);
    try { const sc = await SG.createSchool(v); await SG.login(sc.email, v.password); location.href = 'app.html#/dashboard'; } catch (x) { err('signup', x.message); busy(f, false); }
  });
  document.getElementById('f-parent').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target; const v = UI.read(f); err('parent');
    try { SG.parentLogin(v.code, v.mat, v.pin); location.href = 'parent.html'; } catch (x) { err('parent', x.message); }
  });
})();
