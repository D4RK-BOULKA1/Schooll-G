/* School-G : espace parent (lecture seule, séparé de l'espace direction) */
(function () {
  'use strict';
  const { esc, money, fdate, ic, today, badge } = UI;
  const sess = SG.session();
  if (!sess || sess.role !== 'parent') { location.replace('login.html#parent'); return; }
  const sc = SG.school(sess.schoolId); const st = sc && SG.status(sc);
  const out = () => { SG.logout(); location.href = 'login.html#parent'; };
  if (!sc || st === 'banned' || st === 'blocked' || st === 'expired') {
    document.getElementById('root').innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px"><div style="max-width:460px;text-align:center"><h1 style="font-size:26px;margin-bottom:10px">Espace momentanément indisponible</h1><p class="muted" style="margin-bottom:18px">Veuillez contacter l'administration de l'école.</p><button class="btn btn-navy" id="o">Retour</button></div></div>`;
    document.getElementById('o').onclick = out; return;
  }
  const D = SG.data(sc.id); const s = D.students.find(x => x.id === sess.studentId);
  if (!s) return out();
  const S = D.settings; const cl = D.classes.find(c => c.id === s.classId) || {};
  document.documentElement.style.setProperty('--orange', S.accent || '#E4572E');
  document.title = S.name + ', espace parent';
  const sum = (a, f) => a.reduce((x, y) => x + (+f(y) || 0), 0);
  const tuition = Math.max(0, (+cl.tuition || 0) - (+s.discount || 0));
  const pays = D.payments.filter(p => p.studentId === s.id && p.status === 'validé').sort((a, b) => b.date.localeCompare(a.date));
  const paid = sum(pays.filter(p => p.type === 'Scolarité'), p => p.amount);
  const tranches = (() => { let rest = paid, acc = 0; return S.tranches.map((t, i) => { const amt = i === S.tranches.length - 1 ? tuition - acc : Math.round(tuition * t.pct / 100); acc += amt; const p = Math.max(0, Math.min(rest, amt)); rest -= p; return { ...t, amount: amt, paid: p, rest: amt - p, status: p >= amt ? 'payée' : t.due < today() ? 'en retard' : p > 0 ? 'partielle' : 'à venir' }; }); })();
  const notices = D.notices.filter(n => n.target === 'all' || n.target === s.classId).sort((a, b) => b.date.localeCompare(a.date));
  let P = 0, R = 0, A = 0; const hist = []; Object.keys(D.attendance).sort().forEach(d => { const a = D.attendance[d][s.id]; if (!a) return; if (a.s === 'P') P++; else if (a.s === 'R') R++; else A++; hist.push([d, a]); });
  const bul = D.settings.periods.map(per => { const Rr = DOC.results(D, s.classId, per); const me = Rr.list.find(x => x.student.id === s.id); return { per, me, Rr }; }).filter(x => x.me && x.me.mean != null);
  const r2 = v => v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

  const TABS = [['avis', 'Avis', notices.length], ['notes', 'Notes et bulletins'], ['pay', 'Paiements'], ['att', 'Présences'], ['edt', 'Emploi du temps'], ['carte', 'Carte scolaire']];
  let tab = 'avis'; let selPer = bul.length ? bul[bul.length - 1].per : null;

  function view() {
    const body = {
      avis: () => notices.length ? notices.map(n => `<div class="card nt ${n.priority}"><div class="ch"><div><h3>${esc(n.title)}</h3><small class="muted">${fdate(n.date)}</small></div>${n.priority !== 'normal' ? badge(n.priority === 'urgent' ? 'Urgent' : 'Important', n.priority === 'urgent' ? 'bad' : 'warn') : ''}</div><div class="cb" style="white-space:pre-wrap">${esc(n.body)}</div></div>`).join('') : `<div class="card"><div class="cb empty"><h4>Aucun avis</h4><p>Les messages de la direction apparaîtront ici.</p></div></div>`,
      notes: () => {
        if (!bul.length) return `<div class="card"><div class="cb empty"><h4>Pas encore de notes</h4><p>Le bulletin sera disponible dès la saisie des notes.</p></div></div>`;
        const cur = bul.find(b => b.per === selPer) || bul[bul.length - 1];
        return `<div class="kpis"><div class="kpi o"><small>Moyenne générale</small><b>${r2(cur.me.mean)} / 20</b></div><div class="kpi"><small>Rang</small><b>${cur.me.rank} / ${cur.Rr.count}</b></div><div class="kpi g"><small>Mention</small><b style="font-size:16px">${esc(DOC.mention(cur.me.mean))}</b></div></div>
        <div class="noprint" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><select id="per" style="width:auto">${bul.map(b => `<option ${b.per === cur.per ? 'selected' : ''}>${esc(b.per)}</option>`).join('')}</select><button class="btn btn-navy" id="pr">${ic('print', 16)}Imprimer le bulletin</button></div>
        <div class="bl-wrap"><style>${DOC.css}</style>${DOC.bulletin(D, sc, s.id, cur.per, DOC.theme(D, D.customTheme ? 'custom' : 'classic'))}</div>`;
      },
      pay: () => `<div class="kpis"><div class="kpi"><small>Scolarité annuelle</small><b>${money(tuition)}</b></div><div class="kpi g"><small>Déjà payé</small><b>${money(paid)}</b></div><div class="kpi ${tuition - paid > 0 ? 'r' : 'g'}"><small>Reste à payer</small><b>${money(Math.max(0, tuition - paid))}</b></div></div>
      <div class="card"><div class="ch"><h3>Tranches</h3></div><div class="cb">${tranches.map(t => `<div class="row"><span><b>${esc(t.label)}</b><br><small class="muted">Avant le ${fdate(t.due)} · ${money(t.amount)}</small></span>${badge(t.status, { 'payée': 'ok', 'partielle': 'warn', 'en retard': 'bad', 'à venir': '' }[t.status])}</div>`).join('')}</div></div>
      <div class="card"><div class="ch"><h3>Paiements effectués</h3></div><div class="cb">${pays.map(p => `<div class="row"><span><b>${esc(p.type)}</b>${p.month ? ' · ' + UI.monthLabel(p.month) : ''}<br><small class="muted">${fdate(p.date)} · ${esc(p.method)} · ${esc(p.ref)}</small></span><b>${money(p.amount)}</b></div>`).join('') || '<p class="muted small">Aucun paiement enregistré.</p>'}</div></div>`,
      att: () => `<div class="kpis"><div class="kpi g"><small>Présences</small><b>${P}</b></div><div class="kpi o"><small>Retards</small><b>${R}</b></div><div class="kpi r"><small>Absences</small><b>${A}</b></div></div><div class="card"><div class="ch"><h3>Historique</h3></div><div class="cb">${hist.slice(-20).reverse().map(([d, a]) => `<div class="row"><span>${fdate(d)}</span>${badge(a.s === 'P' ? 'Présent' : a.s === 'R' ? 'En retard' + (a.t ? ' (' + esc(a.t) + ')' : '') : 'Absent', a.s === 'P' ? 'ok' : a.s === 'R' ? 'warn' : 'bad')}</div>`).join('') || '<p class="muted small">Aucun pointage enregistré.</p>'}</div></div>`,
      edt: () => { const tt = D.timetable[s.classId] || {}; if (!Object.keys(tt).length) return `<div class="card"><div class="cb empty"><h4>Emploi du temps non publié</h4></div></div>`; const days = S.days, slots = S.slots; return `<div class="card"><div class="cb" style="overflow:auto"><div class="tt-grid" style="grid-template-columns:96px repeat(${days.length},1fr)"><div class="hd"></div>${days.map(d => `<div class="hd">${esc(d)}</div>`).join('')}${slots.map((sl, i) => `<div class="sl">${esc(sl)}</div>${days.map(d => { const x = tt[d + '|' + i]; const t = x && D.teachers.find(q => q.id === x.teacherId); return `<div ${x && x.brk ? 'style="background:var(--paper2);color:var(--mute)"' : ''}>${x ? `<b>${esc(x.subject)}</b>${t ? esc(t.name) : ''}` : ''}</div>`; }).join('')}`).join('')}</div></div></div>`; },
      carte: () => { const c = DOC.card(D, sc, s, 'marine', S.accent); return `<div class="card"><div class="cb"><style>${DOC.cardCss}</style><div style="overflow:auto">${c.front}${c.back}</div><div class="noprint" style="margin-top:12px"><button class="btn btn-navy" id="pc">${ic('print', 16)}Imprimer la carte</button></div></div></div>`; }
    }[tab]();
    document.getElementById('content').innerHTML = body;
    const per = document.getElementById('per'); if (per) per.onchange = () => { selPer = per.value; view(); };
    const pr = document.getElementById('pr'); if (pr) pr.onclick = () => { const cur = bul.find(b => b.per === selPer) || bul[bul.length - 1]; UI.print(DOC.bulletin(D, sc, s.id, cur.per, DOC.theme(D, D.customTheme ? 'custom' : 'classic')), DOC.css); };
    const pc = document.getElementById('pc'); if (pc) pc.onclick = () => { const c = DOC.card(D, sc, s, 'marine', S.accent); UI.print(`<div style="padding:10mm">${c.front}${c.back}</div>`, DOC.cardCss); };
    document.querySelectorAll('.tabs2 button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  }

  document.getElementById('root').innerHTML = `<div class="ph-top"><div class="in"><div class="lg">${S.logo ? `<img src="${S.logo}" alt="">` : 'G'}</div><div><b>${esc(S.name)}</b><small>Espace parent · ${esc(S.year)}</small></div><div class="sp"></div><button id="out">Quitter</button></div></div>
  <div class="kid"><div class="in"><div class="big">${s.photo ? `<img src="${s.photo}" alt="">` : esc((s.first[0] + s.last[0]).toUpperCase())}</div><div><h1>${esc(s.last.toUpperCase() + ' ' + s.first)}</h1><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${badge(esc(cl.name || ''), 'info')}<span class="bdg">${esc(s.matricule)}</span></div></div></div></div>
  <div class="tabs2"><div class="in">${TABS.map(([k, l, n]) => `<button data-t="${k}">${l}${n ? ` <span class="bdg or">${n}</span>` : ''}</button>`).join('')}</div></div>
  <div class="cont" id="content"></div>`;
  document.getElementById('out').onclick = out;
  document.querySelector('.tabs2').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; view(); } });
  view();
})();
