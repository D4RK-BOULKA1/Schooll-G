/* School-G : espace parent (lecture seule, séparé de l'espace direction).
   Les données viennent du dossier publié par l'école (pstu/{empreinte}) et de ses infos publiques (pub/{code}). */
(function () {
  'use strict';
  const { esc, money, fdate, ic, today, badge } = UI;
  const root = document.getElementById('root');
  const sess = SG.parentSession();
  const out = () => { SG.parentLogout(); location.href = 'login.html#parent'; };
  const r2 = v => v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const sum = (a, f) => a.reduce((x, y) => x + (+f(y) || 0), 0);
  const blocked = () => { root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px"><div style="max-width:460px;text-align:center"><h1 style="font-size:26px;margin-bottom:10px">Espace momentanément indisponible</h1><p class="muted" style="margin-bottom:18px">Veuillez contacter l'administration de l'école.</p><button class="btn btn-navy" id="o">Retour</button></div></div>`; document.getElementById('o').onclick = out; };
  if (!sess) { location.replace('login.html#parent'); return; }

  let tab = 'avis', selPer = null, built = false, unsub = null;

  function build(cur) {
    const P = JSON.parse(cur.s.data().p), pub = cur.p.data();
    if (SG.status(SG.accessOf(pub.access)) !== 'active' && SG.status(SG.accessOf(pub.access)) !== 'trial') return blocked();
    const S = JSON.parse(pub.settingsJson || '{}'), theme = JSON.parse(pub.themeJson || 'null'), notices = JSON.parse(pub.noticesJson || '[]');
    const stu = Object.assign({ id: 'me', status: 'inscrit', classId: P.cls.id }, P.student); const cl = P.cls;
    const att = {}; Object.keys(P.att).forEach(d => { att[d] = { me: P.att[d] }; });
    const results = {};
    Object.keys(P.results).forEach(per => { const r = P.results[per]; results[per] = { list: [{ student: stu, rows: r.rows.map(x => ({ sub: { name: x.n }, coef: x.coef, dev: x.dev, comp: x.comp, avg: x.avg, total: x.total })), total: r.total, coef: r.coef, mean: r.mean, rank: r.rank }], subs: P.subs, count: r.count, classMean: r.classMean, max: r.max, min: r.min }; });
    const D = { settings: S, students: [stu], classes: [cl], attendance: att, customTheme: theme, subjects: { [cl.id]: P.subs }, notes: {}, teachers: [], _results: results };
    const school = { code: SG.parentSession().code };
    document.documentElement.style.setProperty('--orange', S.accent || '#E4572E'); document.title = S.name + ', espace parent';

    const tuition = Math.max(0, (+cl.tuition || 0) - (+stu.discount || 0));
    const pays = P.pays.slice().sort((a, b) => b.date.localeCompare(a.date));
    const paid = sum(pays.filter(p => p.type === 'Scolarité'), p => p.amount);
    const tranches = (() => { let rest = paid, acc = 0; return (S.tranches || []).map((t, i, arr) => { const amt = i === arr.length - 1 ? tuition - acc : Math.round(tuition * t.pct / 100); acc += amt; const p = Math.max(0, Math.min(rest, amt)); rest -= p; return { ...t, amount: amt, paid: p, rest: amt - p, status: p >= amt ? 'payée' : t.due < today() ? 'en retard' : p > 0 ? 'partielle' : 'à venir' }; }); })();
    const myNotices = notices.filter(n => n.target === 'all' || n.target === cl.id).sort((a, b) => b.date.localeCompare(a.date));
    let Pn = 0, R = 0, A = 0; const hist = Object.keys(P.att).sort().map(d => [d, P.att[d]]); hist.forEach(([, a]) => { if (a.s === 'P') Pn++; else if (a.s === 'R') R++; else A++; });
    const bul = (S.periods || []).filter(p => P.results[p]).map(per => ({ per, r: P.results[per] }));
    if (!selPer || !bul.find(b => b.per === selPer)) selPer = bul.length ? bul[bul.length - 1].per : null;
    const th = () => DOC.theme(D, theme ? 'custom' : 'classic');

    const TABS = [['avis', 'Avis', myNotices.length], ['notes', 'Notes et bulletins'], ['pay', 'Paiements'], ['att', 'Présences'], ['edt', 'Emploi du temps'], ['carte', 'Carte scolaire']];
    if (!built) {
      root.innerHTML = `<div class="ph-top"><div class="in"><div class="lg" id="lg"></div><div><b id="sn"></b><small id="sy"></small></div><div class="sp"></div><button id="out">Quitter</button></div></div><div class="kid"><div class="in" id="kid"></div></div><div class="tabs2"><div class="in" id="tb"></div></div><div class="cont" id="content"></div>`;
      document.getElementById('out').onclick = out;
      document.getElementById('tb').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; draw(); } });
      built = true;
    }
    document.getElementById('lg').innerHTML = S.logo ? `<img src="${S.logo}" alt="">` : 'G';
    document.getElementById('sn').textContent = S.name || ''; document.getElementById('sy').textContent = 'Espace parent · ' + (S.year || '');
    document.getElementById('kid').innerHTML = `<div class="big">${stu.photo ? `<img src="${stu.photo}" alt="">` : esc(((stu.first || '?')[0] + (stu.last || '?')[0]).toUpperCase())}</div><div><h1>${esc((stu.last || '').toUpperCase() + ' ' + (stu.first || ''))}</h1><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${badge(esc(cl.name || ''), 'info')}<span class="bdg">${esc(stu.matricule)}</span></div></div>`;
    document.getElementById('tb').innerHTML = TABS.map(([k, l, n]) => `<button data-t="${k}">${l}${n ? ` <span class="bdg or">${n}</span>` : ''}</button>`).join('');

    function draw() {
      const body = {
        avis: () => myNotices.length ? myNotices.map(n => `<div class="card nt ${n.priority}"><div class="ch"><div><h3>${esc(n.title)}</h3><small class="muted">${fdate(n.date)}</small></div>${n.priority !== 'normal' ? badge(n.priority === 'urgent' ? 'Urgent' : 'Important', n.priority === 'urgent' ? 'bad' : 'warn') : ''}</div><div class="cb" style="white-space:pre-wrap">${esc(n.body)}</div></div>`).join('') : `<div class="card"><div class="cb empty"><h4>Aucun avis</h4><p>Les messages de la direction apparaîtront ici.</p></div></div>`,
        notes: () => {
          if (!bul.length) return `<div class="card"><div class="cb empty"><h4>Pas encore de notes</h4><p>Le bulletin sera disponible dès la saisie des notes.</p></div></div>`;
          const c = bul.find(b => b.per === selPer);
          return `<div class="kpis"><div class="kpi o"><small>Moyenne générale</small><b>${r2(c.r.mean)} / 20</b></div><div class="kpi"><small>Rang</small><b>${c.r.rank} / ${c.r.count}</b></div><div class="kpi g"><small>Mention</small><b style="font-size:16px">${esc(DOC.mention(c.r.mean))}</b></div></div>
          <div class="noprint" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><select id="per" style="width:auto">${bul.map(b => `<option ${b.per === c.per ? 'selected' : ''}>${esc(b.per)}</option>`).join('')}</select><button class="btn btn-navy" id="pr">${ic('print', 16)}Imprimer le bulletin</button></div>
          <div class="bl-wrap"><style>${DOC.css}</style>${DOC.bulletin(D, school, 'me', c.per, th())}</div>`;
        },
        pay: () => `<div class="kpis"><div class="kpi"><small>Scolarité annuelle</small><b>${money(tuition)}</b></div><div class="kpi g"><small>Déjà payé</small><b>${money(paid)}</b></div><div class="kpi ${tuition - paid > 0 ? 'r' : 'g'}"><small>Reste à payer</small><b>${money(Math.max(0, tuition - paid))}</b></div></div>
        <div class="card"><div class="ch"><h3>Tranches</h3></div><div class="cb">${tranches.map(t => `<div class="row"><span><b>${esc(t.label)}</b><br><small class="muted">Avant le ${fdate(t.due)} · ${money(t.amount)}</small></span>${badge(t.status, { 'payée': 'ok', 'partielle': 'warn', 'en retard': 'bad', 'à venir': '' }[t.status])}</div>`).join('')}</div></div>
        <div class="card"><div class="ch"><h3>Paiements effectués</h3></div><div class="cb">${pays.map(p => `<div class="row"><span><b>${esc(p.type)}</b>${p.month ? ' · ' + UI.monthLabel(p.month) : ''}<br><small class="muted">${fdate(p.date)} · ${esc(p.method)} · ${esc(p.ref)}</small></span><b>${money(p.amount)}</b></div>`).join('') || '<p class="muted small">Aucun paiement enregistré.</p>'}</div></div>`,
        att: () => `<div class="kpis"><div class="kpi g"><small>Présences</small><b>${Pn}</b></div><div class="kpi o"><small>Retards</small><b>${R}</b></div><div class="kpi r"><small>Absences</small><b>${A}</b></div></div><div class="card"><div class="ch"><h3>Historique</h3></div><div class="cb">${hist.slice(-20).reverse().map(([d, a]) => `<div class="row"><span>${fdate(d)}</span>${badge(a.s === 'P' ? 'Présent' : a.s === 'R' ? 'En retard' + (a.t ? ' (' + esc(a.t) + ')' : '') : 'Absent', a.s === 'P' ? 'ok' : a.s === 'R' ? 'warn' : 'bad')}</div>`).join('') || '<p class="muted small">Aucun pointage enregistré.</p>'}</div></div>`,
        edt: () => { if (!Object.keys(P.tt).length) return `<div class="card"><div class="cb empty"><h4>Emploi du temps non publié</h4></div></div>`; const days = S.days || [], slots = S.slots || []; return `<div class="card"><div class="cb" style="overflow:auto"><div class="tt-grid" style="grid-template-columns:96px repeat(${days.length},1fr)"><div class="hd"></div>${days.map(d => `<div class="hd">${esc(d)}</div>`).join('')}${slots.map((sl, i) => `<div class="sl">${esc(sl)}</div>${days.map(d => { const x = P.tt[d + '|' + i]; return `<div ${x && x.brk ? 'style="background:var(--paper2);color:var(--mute)"' : ''}>${x ? `<b>${esc(x.subject)}</b>${esc(x.teacher || '')}` : ''}</div>`; }).join('')}`).join('')}</div></div></div>`; },
        carte: () => { const c = DOC.card(D, school, stu, 'marine', S.accent); return `<div class="card"><div class="cb"><style>${DOC.cardCss}</style><div style="overflow:auto">${c.front}${c.back}</div><div class="noprint" style="margin-top:12px"><button class="btn btn-navy" id="pc">${ic('print', 16)}Imprimer la carte</button></div></div></div>`; }
      }[tab]();
      document.getElementById('content').innerHTML = body;
      const per = document.getElementById('per'); if (per) per.onchange = () => { selPer = per.value; draw(); };
      const pr = document.getElementById('pr'); if (pr) pr.onclick = () => UI.print(DOC.bulletin(D, school, 'me', selPer, th()), DOC.css);
      const pc = document.getElementById('pc'); if (pc) pc.onclick = () => { const c = DOC.card(D, school, stu, 'marine', S.accent); UI.print(`<div style="padding:10mm">${c.front}${c.back}</div>`, DOC.cardCss); };
      document.querySelectorAll('.tabs2 button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    }
    draw();
  }

  const ld = UI.loading(root, { name: 'School-G', sub: 'Espace parent', msg: 'Chargement du suivi de votre enfant…' }); ld.set(85);
  unsub = SG.watchParent(sess, (e, cur) => {
    if (e) { if (e.message === 'gone') { return out(); } root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div><h1 style="font-size:24px;margin-bottom:10px">Connexion impossible</h1><p class="muted" style="margin-bottom:14px">${esc(SG.errMsg(e))}</p><button class="btn btn-navy" onclick="location.reload()">Réessayer</button></div></div>`; return; }
    try { build(cur); } catch (x) { console.error(x); }
  });
})();
