(function () {
  const { esc, ic } = window.UI;
  document.getElementById('burger').onclick = () => document.getElementById('nav').classList.toggle('open');
  document.querySelectorAll('.nav ul a').forEach(a => a.addEventListener('click', () => document.getElementById('nav').classList.remove('open')));
  const FEATS = ['Tous les modules inclus', 'Élèves et professeurs illimités', 'Espace parents inclus', 'Mises à jour incluses', 'Assistance par WhatsApp'];

  /* ---------- tarifs ---------- */
  function render() {
    const g = SG.global(); const feats = (g.planFeats && g.planFeats.length) ? g.planFeats : FEATS;
    const hotId = g.plans.some(p => p.id === 'annuel') ? 'annuel' : (g.plans[g.plans.length - 1] || {}).id;
    document.getElementById('plans').innerHTML = g.plans.map(p => {
      const hot = p.id === hotId, req = SG.planOnRequest(p);
      const price = req ? `<div class="pr" style="font-size:30px">Sur demande</div>` : `<div class="pr">${esc(String(SG.planPrice(p)).replace(' FCFA', ''))} <small>FCFA${p.months >= 600 ? ' / paiement unique' : p.months > 1 ? ' / ' + p.months + ' mois' : ' / mois'}</small></div>`;
      const btn = req
        ? `<a class="btn ${hot ? 'btn-primary' : 'btn-navy'}" target="_blank" rel="noopener" href="${SG.waLink(g.contactWa, 'Bonjour, je souhaite un devis pour la formule ' + p.name + ' de School-G.')}">Demander un devis</a>`
        : `<a class="btn ${hot ? 'btn-primary' : 'btn-navy'}" href="login.html#signup">Essayer ${g.trialDays} jours gratuitement</a>`;
      return `<div class="plan ${hot ? 'hot' : ''}"><h3>${esc(p.name)}</h3>${price}<p>${esc(p.desc || '')}</p><ul>${feats.map(f => `<li>${ic('check', 16)}${esc(f)}</li>`).join('')}</ul>${btn}</div>`;
    }).join('');
    document.getElementById('ftWa').href = SG.waLink(g.contactWa, 'Bonjour, je souhaite des informations sur School-G.');
    document.getElementById('ftMail').href = 'mailto:' + g.contactMail;
  }

  /* ---------- textes modifiables depuis le panel admin ---------- */
  const ALLOWED = { EM: 1, B: 1, STRONG: 1, BR: 1, I: 1, U: 1 };
  function clean(html) { // ne garde que la mise en forme simple : tout le reste devient du texte
    const t = document.createElement('template'); t.innerHTML = html;
    (function walk(n) { Array.from(n.childNodes).forEach(c => { if (c.nodeType === 1) { if (ALLOWED[c.tagName]) { Array.from(c.attributes).forEach(a => c.removeAttribute(a.name)); walk(c); } else c.replaceWith(document.createTextNode(c.textContent)); } else if (c.nodeType !== 3) c.remove(); }); })(t.content);
    return t.innerHTML;
  }
  function applySite(site) {
    const T = (site && site.texts) || {}, H = (site && site.hidden) || {};
    document.querySelectorAll('[data-ed]').forEach(el => {
      if (el._def === undefined) el._def = el.innerHTML;
      const v = T[el.dataset.ed]; const want = (v != null && String(v).trim() !== '') ? clean(String(v)) : el._def;
      if (el.innerHTML !== want) el.innerHTML = want;
    });
    document.querySelectorAll('[data-secid]').forEach(s => { s.style.display = H[s.dataset.secid] ? 'none' : ''; });
    if (T['meta-title']) document.title = String(T['meta-title']);
    const md = document.querySelector('meta[name=description]'); if (md && T['meta-desc']) md.setAttribute('content', String(T['meta-desc']));
  }

  render(); applySite(SG.site());
  const start = () => {
    try { SG.watchGlobal(render); SG.watchSite(applySite); } catch (e) { }
  };
  if (SG.ready) SG.ready().then(u => {
    render(); start();
    if (u) { const c = document.querySelector('.nav .r .btn-ghost'); if (c) { c.textContent = 'Mon espace'; c.href = 'app.html'; c._def = c.innerHTML; c.removeAttribute('data-ed'); } }
  }).catch(() => { });
})();
