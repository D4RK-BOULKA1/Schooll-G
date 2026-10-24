/* School-G : espace enseignant (lecture seule) : salaires, emploi du temps, classes.
   Les données viennent du dossier publié par l'école (ptea/{empreinte}) et de ses infos publiques (pub/{code}). */
(function () {
  'use strict';
  const { esc, money, fdate, badge, ic } = UI;
  const root = document.getElementById('root');
  const sess = SG.teacherSession();
  const out = () => { SG.teacherLogout(); location.href = 'login.html#teacher'; };
  const blocked = () => { root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px"><div style="max-width:460px;text-align:center"><h1 style="font-size:26px;margin-bottom:10px">Espace momentanément indisponible</h1><p class="muted" style="margin-bottom:18px">Contactez la direction de l'école.</p><button class="btn btn-navy" id="bo">Retour</button></div></div>`; document.getElementById('bo').onclick = out; };
  if (!sess) { location.replace('login.html#teacher'); return; }

  let tab = 'sal', built = false;
  const ymNow = () => new Date().toISOString().slice(0, 7);
  const months = (from, n) => { const l = []; const d = new Date(); d.setDate(1); for (let i = 0; i < n; i++) { l.push(d.toISOString().slice(0, 7)); d.setMonth(d.getMonth() - 1); } return l.filter(m => !from || m >= from.slice(0, 7)); };

  function build(cur) {
    const P = JSON.parse(cur.s.data().p), pub = cur.p.data();
    const acc = SG.status(SG.accessOf(pub.access)); if (acc !== 'active' && acc !== 'trial') return blocked();
    const S = JSON.parse(pub.settingsJson || '{}'), T = P.t;
    document.documentElement.style.setProperty('--orange', S.accent || '#E4572E'); document.title = (S.name || 'École') + ', espace enseignant';
    const paidBy = {}; P.sal.filter(x => x.status === 'payé').forEach(x => { paidBy[x.month] = x; });
    const list = months(T.hired, 12);
    const cm = ymNow(), curPaid = paidBy[cm], yearPaid = P.sal.filter(x => x.status === 'payé' && x.month.slice(0, 4) === cm.slice(0, 4)).reduce((a, x) => a + (+x.amount || 0), 0);
    const nLate = list.filter(m => m < cm && !paidBy[m]).length;
    const TABS = [['sal', 'Mes salaires'], ['edt', 'Mon emploi du temps'], ['cls', 'Mes classes', P.classes.length]];
    if (!built) {
      root.innerHTML = `<div class="ph-top"><div class="in"><div class="lg" id="lg"></div><div><b id="sn"></b><small id="sy"></small></div><div class="sp"></div><button id="out">Quitter</button></div></div><div class="kid"><div class="in" id="kid"></div></div><div class="tabs2"><div class="in" id="tb"></div></div><div class="cont" id="content"></div>`;
      document.getElementById('out').onclick = out;
      document.getElementById('tb').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; draw(); } });
      built = true;
    }
    document.getElementById('lg').innerHTML = S.logo ? `<img src="${S.logo}" alt="">` : 'G';
    document.getElementById('sn').textContent = S.name || ''; document.getElementById('sy').textContent = 'Espace enseignant · ' + (S.year || '');
    document.getElementById('kid').innerHTML = `<div class="big">${esc((T.name || '?').trim()[0].toUpperCase())}</div><div><h1>${esc(T.name)}</h1><div class="muted small">${esc(T.matricule)}${T.subjects ? ' · ' + esc(T.subjects) : ''}${T.contract ? ' · ' + esc(T.contract) : ''}${T.hired ? ' · embauché le ' + fdate(T.hired) : ''}</div></div>`;
    document.getElementById('tb').innerHTML = TABS.map(([k, l, n]) => `<button data-t="${k}">${l}${n ? ` <span class="bdg or">${n}</span>` : ''}</button>`).join('');

    function draw() {
      const days = S.days || [], slots = S.slots || [];
      const body = {
        sal: () => `<div class="kpis"><div class="kpi"><small>Salaire mensuel</small><b>${money(T.salary)}</b></div><div class="kpi ${curPaid ? 'g' : 'r'}"><small>${esc(UI.monthLabel(cm))}</small><b style="font-size:17px">${curPaid ? 'Payé le ' + fdate(curPaid.date) : 'Pas encore payé'}</b></div><div class="kpi ${nLate ? 'r' : 'g'}"><small>Mois impayés</small><b>${nLate}</b></div></div>
          <div class="card"><div class="ch"><h3>Historique des 12 derniers mois</h3><small class="muted">Reçu cette année : ${money(yearPaid)}</small></div><div class="cb">${list.length ? list.map(m => { const p = paidBy[m]; return `<div class="row"><span><b>${esc(UI.monthLabel(m))}</b><br><small class="muted">${p ? fdate(p.date) + (p.method ? ' · ' + esc(p.method) : '') : (m === cm ? 'En attente' : 'Non versé')}</small></span><span style="display:flex;gap:10px;align-items:center"><b>${money(p ? p.amount : T.salary)}</b>${p ? badge('Payé', 'ok') : badge(m === cm ? 'En attente' : 'Non payé', m === cm ? 'warn' : 'bad')}</span></div>`; }).join('') : '<p class="muted">Aucun mois à afficher.</p>'}</div></div>`,
        edt: () => { if (!Object.keys(P.tt).length) return `<div class="card"><div class="cb empty"><h4>Emploi du temps non renseigné</h4><p class="muted">La direction n'a pas encore placé vos cours.</p></div></div>`;
          return `<div class="card"><div class="cb" style="overflow:auto"><div class="tt-grid" style="grid-template-columns:96px repeat(${days.length},1fr)"><div class="hd"></div>${days.map(d => `<div class="hd">${esc(d)}</div>`).join('')}${slots.map((sl, i) => `<div class="sl">${esc(sl)}</div>${days.map(d => { const x = P.tt[d + '|' + i]; return `<div>${x ? `<b>${esc(x.subject || 'Cours')}</b>${esc(x.cls)}` : ''}</div>`; }).join('')}`).join('')}</div></div></div><p class="small muted">${Object.keys(P.tt).length} créneau(x) par semaine.</p>`; },
        cls: () => P.classes.length ? P.classes.map(c => `<div class="card"><div class="ch"><div><h3>${esc(c.name)}</h3><small class="muted">${esc(c.cycle)}</small></div>${badge(c.count + ' élève(s)', 'info')}</div><div class="cb">${c.subjects.length ? c.subjects.map(x => badge(esc(x), 'info')).join(' ') : '<span class="muted small">Matières non précisées dans l\'emploi du temps.</span>'}</div></div>`).join('') : `<div class="card"><div class="cb empty"><h4>Aucune classe assignée</h4><p class="muted">La direction ne vous a pas encore affecté de classe.</p></div></div>`
      }[tab]();
      document.getElementById('content').innerHTML = body;
      document.querySelectorAll('.tabs2 button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    }
    draw();
  }

  const ld = UI.loading(root, { name: 'School-G', sub: 'Espace enseignant', msg: 'Chargement de votre espace…' }); ld.set(85);
  SG.watchTeacher(sess, (e, cur) => {
    if (e) { if (e.message === 'gone') return out(); root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div><h1 style="font-size:24px;margin-bottom:10px">Connexion impossible</h1><p class="muted" style="margin-bottom:16px">${esc(SG.errMsg(e))}</p><button class="btn btn-navy" onclick="location.reload()">Réessayer</button></div></div>`; return; }
    try { build(cur); } catch (x) { console.error(x); }
  });
})();
