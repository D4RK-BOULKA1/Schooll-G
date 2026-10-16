(function () {
  const { money, esc, ic } = window.UI;
  document.getElementById('burger').onclick = () => document.getElementById('nav').classList.toggle('open');
  document.querySelectorAll('.nav ul a').forEach(a => a.addEventListener('click', () => document.getElementById('nav').classList.remove('open')));
  const feats = ['Tous les modules inclus', 'Élèves et professeurs illimités', 'Espace parents inclus', 'Mises à jour incluses', 'Assistance par WhatsApp'];
  function render() {
    const g = SG.global();
    document.getElementById('plans').innerHTML = g.plans.map((p, i) => {
      const hot = i === g.plans.length - 1;
      return `<div class="plan ${hot ? 'hot' : ''}"><h3>${esc(p.name)}</h3><div class="pr">${money(p.price).replace(' FCFA', '')} <small>FCFA${p.months > 1 ? ' / ' + p.months + ' mois' : ' / mois'}</small></div><p>${esc(p.desc || '')}</p><ul>${feats.map(f => `<li>${ic('check', 16)}${f}</li>`).join('')}</ul><a class="btn ${hot ? 'btn-primary' : 'btn-navy'}" href="login.html#signup">Essayer ${g.trialDays} jours gratuitement</a></div>`;
    }).join('');
    document.getElementById('ftWa').href = SG.waLink(g.contactWa, 'Bonjour, je souhaite des informations sur School-G.');
    document.getElementById('ftMail').href = 'mailto:' + g.contactMail;
  }
  render();
  if (SG.ready) SG.ready().then(u => {
    render();
    if (u) { const c = document.querySelector('.nav .r .btn-ghost'); if (c) { c.textContent = 'Mon espace'; c.href = 'app.html'; } }
  }).catch(() => { });
})();
